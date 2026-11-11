import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LOCAL_ACCESS_COOKIE } from './lib/local-ssr-cookie';
import { localAuthEnabled, localWriteGuardEnabled, shouldBlockLocalApiMutation } from './lib/local-write-guard';
import { readOnlySupabaseFetch } from './lib/local-supabase-fetch';

const PUBLIC_PAGES = new Set(['/login','/central-access']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function publicPage(path:string) {
  return PUBLIC_PAGES.has(path)||path.startsWith('/auth/')||
    path==='/favicon.ico'||path==='/robots.txt'||path==='/sitemap.xml';
}
function redirect(request:NextRequest,to:string) {
  const response=NextResponse.redirect(new URL(to,request.url));
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
function secureNext() {
  const response=NextResponse.next();
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export async function middleware(request:NextRequest) {
  // Keep API mutations disabled on localhost until a separate QA database
  // or a truly read-only database credential is available.
  if (shouldBlockLocalApiMutation({
    pathname:request.nextUrl.pathname,
    method:request.method,
    enabled:localWriteGuardEnabled(),
  })) {
    return NextResponse.json({
      error:'Ambiente local somente leitura. Operação de gravação bloqueada.',
      code:'COMMANDER_LOCAL_READ_ONLY',
    },{status:403,headers:{'Cache-Control':'no-store'}});
  }
  // Local development uses the Commander's existing internal Auth identity.
  // Never bypass this gate for API routes: their auth + RLS checks remain mandatory.
  if ((localAuthEnabled() || localWriteGuardEnabled()) && ["localhost","127.0.0.1"].includes(request.nextUrl.hostname)) {
    if (publicPage(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.next();
    const token=request.cookies.get(LOCAL_ACCESS_COOKIE)?.value??"";
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!token||!url||!key)return redirect(request,"/login");
    const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const session=await auth.auth.getUser(token);
    const userId=session.data.user?.id;
    if(session.error||!userId)return redirect(request,"/login");
    const db=createClient(url,key,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{headers:{Authorization:"Bearer "+token}, ...(localWriteGuardEnabled()?{fetch:readOnlySupabaseFetch(fetch)}:{})},
    });
    const [internal,member]=await Promise.all([
      db.from("platform_admins").select("active")
        .eq("user_id",userId).eq("active",true).maybeSingle(),
      db.from("organization_members").select("organization_id")
        .eq("user_id",userId).eq("status","active").limit(1),
    ]);
    if(internal.error||!internal.data||member.error||!member.data?.length)
      return redirect(request,"/central-access?reason=denied");
    return secureNext();
  }
  if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true'||
     process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS!=='true'||
     publicPage(request.nextUrl.pathname)) return NextResponse.next();

  const localToken=request.cookies.get(LOCAL_ACCESS_COOKIE)?.value??'';
  const dbUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!dbUrl||!anon||!serviceKey||!localToken||localToken.length>10000)
    return redirect(request,'/login');

  try {
    const localAuth=createClient(dbUrl,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const localResult=await localAuth.auth.getUser(localToken);
    const localId=localResult.data.user?.id;
    if(localResult.error||!localId) return redirect(request,'/login');

    const db=createClient(dbUrl,serviceKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:localWriteGuardEnabled()?{fetch:readOnlySupabaseFetch(fetch)}:undefined,
    });
    const admin=await db.from('platform_admins').select('user_id')
      .eq('user_id',localId).eq('active',true).maybeSingle();
    if(admin.error)return redirect(request,'/central-access?reason=unavailable');
    if(admin.data)return secureNext();

    const profile=await db.from('profiles').select('active_organization_id')
      .eq('user_id',localId).maybeSingle();
    if(profile.error)return redirect(request,'/central-access?reason=unavailable');
    const orgId=profile.data?.active_organization_id;
    if(!orgId||!UUID.test(orgId))return redirect(request,'/central-access?reason=denied');

    const [company,link,membership]=await Promise.all([
      db.from('central_client_company_links').select('central_client_id,status')
        .eq('commander_company_id',orgId).eq('status','ACTIVE').maybeSingle(),
      db.from('central_identity_user_links').select('central_identity_id,status')
        .eq('commander_user_id',localId).eq('status','ACTIVE').maybeSingle(),
      db.from('organization_members').select('status,role')
        .eq('user_id',localId).eq('organization_id',orgId).maybeSingle(),
    ]);
    if(company.error||link.error||membership.error)
      return redirect(request,'/central-access?reason=unavailable');

    // Independent internal operators without central links retain existing local
    // access. A centrally linked customer NEVER falls back to local-only access.
    if(!link.data) {
      const localAccess=await db.from('internal_user_access').select('active')
        .eq('user_id',localId).maybeSingle();
      if(localAccess.error||localAccess.data?.active!==true||membership.data?.status!=='active')
        return redirect(request,'/central-access?reason=denied');
      return secureNext();
    }
    if(!company.data?.central_client_id||!membership.data)
      return redirect(request,'/central-access?reason=denied');
    // Product-linked access outside the pilot stays disabled until explicitly
    // enabled by release governance. Linking a user alone is not activation.
    const linkedRollout=process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS==='true';
    const pilotId=process.env.SERVICE_7SERVICE_PILOT_ORG_ID??'';
    if(!linkedRollout && (!UUID.test(pilotId)||orgId!==pilotId))
      return redirect(request,'/central-access?reason=denied');

    const centralToken=request.cookies.get('__Host-commander_caccess')?.value??'';
    const centralUrl=process.env.SERVICE_7SERVICE_SUPABASE_URL;
    const centralKey=process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY;
    const serviceOrigin=process.env.SERVICE_7SERVICE_ORIGIN;
    if(!centralToken||centralToken.length>10000||!centralUrl||!centralKey||!serviceOrigin)
      return redirect(request,'/central-access?reason=denied');
    const centralAuth=createClient(centralUrl,centralKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const centralUser=await centralAuth.auth.getUser(centralToken);
    if(centralUser.error||!centralUser.data.user)
      return redirect(request,'/central-access?reason=denied');

    const origin=new URL(serviceOrigin);
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||
       origin.pathname!=='/'||origin.search||origin.hash)
      return redirect(request,'/central-access?reason=unavailable');
    const endpoint=new URL('/api/v1/authorization/decision',origin);
    endpoint.searchParams.set('clientId',company.data.central_client_id);
    endpoint.searchParams.set('productCode','COMMANDER7');
    endpoint.searchParams.set('action','product.access');
    const result=await fetch(endpoint.toString(),{
      headers:{Authorization:'Bearer '+centralToken,Accept:'application/json'},
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
    });
    if(!result.ok)return redirect(request,'/central-access?reason=unavailable');
    const decision=await result.json().catch(()=>null) as
      {version?:string;allowed?:boolean;reasonCode?:string;identityId?:string;
       clientId?:string;productCode?:string;roleCodes?:string[]}|null;
    const verified=decision?.version==='1'&&decision.allowed===true&&
      decision.reasonCode==='ACCESS_GRANTED'&&
      decision.identityId===link.data.central_identity_id&&
      decision.clientId===company.data.central_client_id&&
      decision.productCode==='COMMANDER7'&&Array.isArray(decision.roleCodes)&&
      decision.roleCodes.length>0;
    if(!verified) {
      // A real central grant revocation also removes the RLS membership, so
      // an old Commander JWT cannot continue reading through PostgREST.
      if(decision?.allowed===false&&
         ['ACCESS_NOT_GRANTED','SUBSCRIPTION_INACTIVE','MEMBERSHIP_INACTIVE','IDENTITY_INACTIVE',
          'CLIENT_INACTIVE','PRODUCT_UNAVAILABLE'].includes(decision.reasonCode??'')) {
        const sync=await db.rpc('int01_sync_central_membership',{
          p_user:localId,p_company:orgId,p_authorized:false,
        });
        if(sync.error)console.error('[INT01] central revocation sync failed');
      }
      return redirect(request,'/central-access?reason=denied');
    }
    // Only a centrally verified VIEWER can recover an AUTO-suspended local
    // membership. Manual suspensions have no marker and remain suspended.
    if(membership.data.status==='suspended'&&decision?.roleCodes?.includes('VIEWER')) {
      const sync=await db.rpc('int01_sync_central_membership',{
        p_user:localId,p_company:orgId,p_authorized:true,
      });
      if(sync.error||sync.data!==true)
        return redirect(request,'/central-access?reason=denied');
    } else if(membership.data.status!=='active') {
      return redirect(request,'/central-access?reason=denied');
    }
    return secureNext();
  }catch {
    return redirect(request,'/central-access?reason=unavailable');
  }
}
export const config={matcher:['/((?!_next/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$).*)']};
