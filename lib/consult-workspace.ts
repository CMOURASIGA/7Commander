import { getSupabaseServerClient } from "@/lib/supabase/server";
/** Consult Services workspace is explicitly linked to active organization memberships. */
export const CONSULT_ORG_ID = "43973606-0c05-4934-a057-9f2710899eba";
export async function getConsultMemberIds(userId: string): Promise<string[]> {
  const db=getSupabaseServerClient();
  if(!db) return [];
  const mine=await db.from("organization_members").select("user_id").eq("organization_id",CONSULT_ORG_ID).eq("user_id",userId).eq("status","active").maybeSingle();
  if(mine.error || !mine.data) return [];
  const team=await db.from("organization_members").select("user_id").eq("organization_id",CONSULT_ORG_ID).eq("status","active");
  if(team.error || !team.data)return [];
  return [...new Set([userId,CONSULT_ORG_ID,...team.data.map(x=>x.user_id)])];
}
export async function consultMemberRole(userId:string): Promise<"owner"|"admin"|"manager"|"member"|null> {
  const db=getSupabaseServerClient();if(!db)return null;
  const m=await db.from("organization_members").select("role").eq("organization_id",CONSULT_ORG_ID).eq("user_id",userId).eq("status","active").maybeSingle();
  return m.error?null:(m.data?.role??null);
}

/** Resolves an assignee only when their Auth account is an active Consult Services member. */
export async function resolveConsultAssignee(email: string, organizationId: string = CONSULT_ORG_ID): Promise<{ userId: string; email: string } | null> {
  const db = getSupabaseServerClient();
  const normalized = email.trim().toLowerCase();
  if (!db || !normalized) return null;
  const members = await db.from("organization_members").select("user_id")
    .eq("organization_id", organizationId).eq("status", "active");
  if (members.error || !members.data) return null;
  for (const member of members.data) {
    const account = await db.auth.admin.getUserById(member.user_id);
    if (account.error || !account.data.user) continue;
    if (account.data.user.email?.trim().toLowerCase() === normalized) {
      const access = await db.from("internal_user_access").select("active").eq("user_id",member.user_id).maybeSingle();
      if (access.error || access.data?.active === false) return null;
      return {userId:member.user_id,email:normalized};
    }
  }
  return null;
}
