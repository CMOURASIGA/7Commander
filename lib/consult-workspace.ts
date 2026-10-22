import { getSupabaseServerClient } from "@/lib/supabase/server";
/** Consult Services workspace is explicitly linked to active organization memberships. */
export const CONSULT_ORG_ID = "43973606-0c05-4934-a057-9f2710899eba";
export async function getConsultMemberIds(userId: string): Promise<string[]> {
  const db=getSupabaseServerClient();
  if(!db) return [userId];
  const mine=await db.from("organization_members").select("user_id").eq("organization_id",CONSULT_ORG_ID).eq("user_id",userId).eq("status","active").maybeSingle();
  if(mine.error || !mine.data) return [userId];
  const team=await db.from("organization_members").select("user_id").eq("organization_id",CONSULT_ORG_ID).eq("status","active");
  if(team.error || !team.data)return [userId];
  return [...new Set([userId,CONSULT_ORG_ID,...team.data.map(x=>x.user_id)])];
}
export async function consultMemberRole(userId:string): Promise<"owner"|"admin"|"manager"|"member"|null> {
  const db=getSupabaseServerClient();if(!db)return null;
  const m=await db.from("organization_members").select("role").eq("organization_id",CONSULT_ORG_ID).eq("user_id",userId).eq("status","active").maybeSingle();
  return m.error?null:(m.data?.role??null);
}
