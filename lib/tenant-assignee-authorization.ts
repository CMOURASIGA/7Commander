import { getSupabaseServerClient } from "@/lib/supabase/server";

const activeProjectStates = new Set(["active", "accepted", "ativo"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Require both an active project membership and active company membership.
 * Verify the recipient against Supabase Auth, never an unverified profile or
 * a browser-supplied email. A local suspension always overrides membership.
 */
export async function isEligibleProjectAssignee(input: {
  organizationId: string;
  projectId: string;
  email: string;
}): Promise<boolean> {
  const db = getSupabaseServerClient();
  const email = input.email.trim().toLowerCase();
  if (!db || !emailPattern.test(email)) return false;

  const projectMembers = await db.from("project_members")
    .select("member_email,member_user_id,status")
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .ilike("member_email", email);
  if (projectMembers.error) return false;
  const rows = (projectMembers.data ?? []).filter(row =>
    activeProjectStates.has(String(row.status ?? "").toLowerCase()));
  if (!rows.length) return false;

  const organizationMembers = await db.from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("status", "active");
  if (organizationMembers.error || !organizationMembers.data?.length) return false;

  const companyIds = organizationMembers.data.map(m => m.user_id);
  const namedIds = new Set(rows.map(row => row.member_user_id).filter(Boolean));
  const candidates = namedIds.size
    ? companyIds.filter(id => namedIds.has(id))
    : companyIds;
  if (!candidates.length) return false;

  const access = await db.from("internal_user_access")
    .select("user_id,active").in("user_id", candidates);
  if (access.error) return false;
  const suspended = new Set((access.data ?? [])
    .filter(row => row.active === false).map(row => row.user_id));

  for (const id of candidates) {
    if (suspended.has(id)) continue;
    const account = await db.auth.admin.getUserById(id);
    if (account.error) return false;
    if (account.data.user?.email?.trim().toLowerCase() !== email) continue;
    // Legacy project memberships may have null user IDs, but no foreign
    // or mismatched non-null user ID can be used for assignment.
    if (rows.some(row => row.member_user_id === id || !row.member_user_id)) return true;
  }
  return false;
}
