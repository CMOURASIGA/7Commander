import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";
import { resolveTenantMembership } from "@/lib/tenant-context";

/** Explicit rollout switch; do not enable until migrations 057–059 and isolation E2E pass. */
export const TENANT_SCHEMA_READY = process.env.SEVEN_COMMANDER_TENANT_SCHEMA_READY === "true" && process.env.SEVEN_COMMANDER_MULTI_TENANT_READY === "true";

/** Resolve a server-side verified tenant. Never trust browser storage or metadata alone. */
export async function getEffectiveTenantForUser(userId: string): Promise<string | null> {
  const db = getSupabaseServerClient();
  if (!db) return null;
  if (!TENANT_SCHEMA_READY) {
    return (await resolveTenantMembership(userId, CONSULT_ORG_ID)) ? CONSULT_ORG_ID : null;
  }
  const profile = await db.from("profiles").select("active_organization_id").eq("user_id", userId).maybeSingle();
  if (profile.error) return null;
  const preferred = profile.data?.active_organization_id;
  if (preferred) {
    return (await resolveTenantMembership(userId, preferred)) ? preferred : null;
  }
  const membership = await db.from("organization_members").select("organization_id")
    .eq("user_id", userId).eq("status", "active");
  if (membership.error || !membership.data || membership.data.length !== 1) return null;
  const candidate = membership.data[0].organization_id;
  return (await resolveTenantMembership(userId, candidate)) ? candidate : null;
}

export async function requireEffectiveTenant(userId: string): Promise<string> {
  const id = await getEffectiveTenantForUser(userId);
  if (!id) throw new Error("Tenant context unavailable or unauthorized");
  return id;
}

/** Tenant-local member IDs; included organization UUID supports legacy owner rows. */
export async function getTenantMemberIds(userId:string):Promise<string[]> {
 const organizationId=await requireEffectiveTenant(userId);
 const db=getSupabaseServerClient();
 if(!db)throw new Error("Database unavailable");
 const members=await db.from("organization_members").select("user_id")
   .eq("organization_id",organizationId).eq("status","active");
 if(members.error||!members.data)throw new Error("Tenant members unavailable");
 return [...new Set([userId,organizationId,...members.data.map(m=>m.user_id)])];
}

export async function getTenantRole(userId:string):Promise<"owner"|"admin"|"manager"|"member"|null>{
 const organizationId=await getEffectiveTenantForUser(userId);
 if(!organizationId)return null;
 return (await resolveTenantMembership(userId,organizationId))?.role??null;
}
