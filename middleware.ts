import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LOCAL_ACCESS_COOKIE } from './lib/local-ssr-cookie';

/** Authentication gate for protected page SSR. Operational tenant/role enforcement remains in API guards. */
const PUBLIC_PAGES = new Set(['/login','/central-access']);
function publicPage(path: string) {
  return PUBLIC_PAGES.has(path) || path.startsWith('/auth/') ||
    path === '/favicon.ico' || path === '/robots.txt' || path === '/sitemap.xml';
}
async function validUser(token:string, url:string|undefined, key:string|undefined) {
  if(!token || token.length>10000 || !url || !key) return null;
  try {
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const result=await supabase.auth.getUser(token);
    return result.error ? null : result.data.user?.id ?? null;
  } catch {return null;}
}
function redirect(request:NextRequest,to:string) {
  const response=NextResponse.redirect(new URL(to,request.url));
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export async function middleware(request:NextRequest) {
  if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true' ||
     process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS!=='true' ||
     publicPage(request.nextUrl.pathname)) return NextResponse.next();
  // Page routes only. All API operations must pass their own server-side authorization.
  const localToken=request.cookies.get(LOCAL_ACCESS_COOKIE)?.value??'';
  const localId=await validUser(localToken,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if(!localId)return redirect(request,'/login');
  const centralToken=request.cookies.get('__Host-commander_caccess')?.value??'';
  const centralId=await validUser(centralToken,process.env.SERVICE_7SERVICE_SUPABASE_URL,process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY);
  if(!centralId)return redirect(request,'/central-access');
  // Identity/company/membership/permission checks must be repeated by data and API layers.
  const response=NextResponse.next();
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/((?!api/|_next/|.*\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$).*)']};
