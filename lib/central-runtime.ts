import 'server-only';
import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCentralServerSession } from '@/lib/central-session';
import { checkCentralProductAccess } from '@/lib/7service-authorization';
import { resolveTenantMembership } from '@/lib/tenant-context';
import { evaluateCommanderCentralAccess } from '@/lib/commander-central-policy.mjs';
import { permissionForRoute,localRolePermissions } from '@/lib/central-route-policy.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const productCode='COMMANDER7';
type CentralRoleLink={status:string;central_product_code:string;central_role_code:string;commander_role:string;allowed_permissions:string[]};
export type PilotDecision = {allowed:boolean;reasonCode:string;status:403|503|200};
const fail=(reasonCode:string,status:403|503=403):PilotDecision=>({allowed:false,reasonCode,status});

/** Session + tenant + all three persisted links + central decision + local permission. */
export async function authorizeCentralPilot(request:NextRequest,localUserId:string,tenantId:string,
  permissionOverride?:string):Promise<PilotDecision>{
 if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true')return fail('CENTRAL_INTEGRATION_DISABLED');
 if(!uuid.test(localUserId)||!uuid.test(tenantId))return fail('INVALID_TENANT_CONTEXT');
 // Only the server-side switch handler may check read permission on its
 // destination tenant before changing profiles.active_organization_id.
 const validSwitchOverride = process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS==='true'
   && request.nextUrl.pathname==='/api/organizations/select'
   && request.method==='POST' && permissionOverride==='organizations.view';
 const validUiOverride = request.nextUrl.pathname==='/api/auth/ui-capabilities'
   && request.method==='GET'
   && ['projects.write','clients.write'].includes(permissionOverride??'');
 if(permissionOverride && !validSwitchOverride && !validUiOverride)
   return fail('INVALID_PERMISSION_OVERRIDE');
 const requiredLocalPermission=permissionOverride??permissionForRoute(request.nextUrl.pathname,request.method);
 if(!requiredLocalPermission)return fail('ROUTE_PERMISSION_UNMAPPED');
 const db=getSupabaseServerClient();if(!db)return fail('LOCAL_DB_UNAVAILABLE',503);
 try{
   // Tenant is resolved by the Commander, not a request header or query parameter.
   const membership=await resolveTenantMembership(localUserId,tenantId);
   if(!membership)return fail('LOCAL_MEMBERSHIP_INVALID');
   const centralSession=await getCentralServerSession();
   if(!centralSession)return fail('CENTRAL_SESSION_REQUIRED');
   const company=await db.from('central_client_company_links')
     .select('central_client_id,commander_company_id,status')
     .eq('commander_company_id',tenantId).eq('status','ACTIVE').maybeSingle();
   if(company.error)return fail('LINK_BACKEND_ERROR',503);
   if(!company.data?.central_client_id)return fail('COMPANY_LINK_REQUIRED');
   const identityLink=await db.from('central_identity_user_links')
     .select('central_identity_id,commander_user_id,status')
     .eq('commander_user_id',localUserId).eq('status','ACTIVE').maybeSingle();
   if(identityLink.error)return fail('LINK_BACKEND_ERROR',503);
   if(!identityLink.data)return fail('IDENTITY_LINK_REQUIRED');
   const centralDecision=await checkCentralProductAccess({
     centralUrl:process.env.SERVICE_7SERVICE_ORIGIN??'',
     centralAccessToken:centralSession.accessToken,
     clientId:company.data.central_client_id,productCode,
   });
   if(!centralDecision.allowed)return fail(centralDecision.reasonCode,centralDecision.reasonCode==='CENTRAL_UNAVAILABLE'?503:403);
   // A valid token issued to a different account cannot authorize the local user.
   // The decision endpoint independently resolves the token's identities.id.
   if(centralDecision.identityId!==identityLink.data.central_identity_id)return fail('CENTRAL_IDENTITY_MISMATCH');
   const roles=await db.from('central_product_role_links')
     .select('central_product_code,central_role_code,commander_role,allowed_permissions,status')
     .eq('central_product_code',productCode).eq('status','ACTIVE')
     .in('central_role_code',centralDecision.roleCodes);
   if(roles.error)return fail('ROLE_BACKEND_ERROR',503);
   const policy=evaluateCommanderCentralAccess({
     enabled:true,productCode,requestedCompanyId:tenantId,requiredLocalPermission,
     central:{verified:true,accessTokenVerified:true,identityId:centralDecision.identityId,
       clientId:centralDecision.clientId,decision:{...centralDecision,reasonCode:'ACCESS_GRANTED',productCode}},
     local:{verified:true,userId:localUserId,companyId:tenantId,membershipActive:true,
       role:membership.role,permissions:[...(localRolePermissions[membership.role]??[])]},
     mapping:{status:'ACTIVE',companyStatus:company.data.status,identityStatus:identityLink.data.status,
       clientId:company.data.central_client_id,companyId:tenantId,
       identityId:identityLink.data.central_identity_id,userId:localUserId},
     roleLinks:(roles.data??[]).map((r:CentralRoleLink)=>({status:r.status,productCode:r.central_product_code,
       centralRoleCode:r.central_role_code,commanderRole:r.commander_role,allowedPermissions:r.allowed_permissions})),
   });
   return policy.allowed?{allowed:true,reasonCode:'ACCESS_GRANTED',status:200}:fail(policy.reasonCode);
 }catch{return fail('CENTRAL_AUTH_BACKEND_FAILURE',503);}
}
