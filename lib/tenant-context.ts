import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TenantMembership = {organizationId:string;role:"owner"|"admin"|"manager"|"member"};

/** Verify tenant membership on every request. Never trust a tenant ID alone. */
export async function resolveTenantMembership(userId:string, requestedOrganizationId:string):Promise<TenantMembership|null>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedOrganizationId)) return null;
 const db=getSupabaseServerClient();if(!db)return null;
 const [member,company]=await Promise.all([
  db.from("organization_members").select("organization_id,role").eq("organization_id",requestedOrganizationId).eq("user_id",userId).eq("status","active").maybeSingle(),
  db.from("organizations").select("id").eq("id",requestedOrganizationId).eq("status","active").maybeSingle(),
 ]);
 if(member.error||company.error||!member.data||!company.data)return null;
 if(!["owner","admin","manager","member"].includes(member.data.role))return null;
 return {organizationId:requestedOrganizationId,role:member.data.role as TenantMembership["role"]};
}

/** Active tenant is mandatory for multitenant write paths. */
export async function assertTenantMembership(userId:string,organizationId:string):Promise<TenantMembership>{
 const membership=await resolveTenantMembership(userId,organizationId);
 if(!membership)throw new Error("Organização inexistente ou sem acesso ativo.");
 return membership;
}
