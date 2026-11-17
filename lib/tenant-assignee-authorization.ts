import { getSupabaseServerClient } from "@/lib/supabase/server";

const activeProjectStates = new Set(["active", "accepted", "ativo"]);
const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

/**
 * Fail closed: an assignee needs an active project membership AND an active
 * company membership. A stale invitation, suspended user or foreign-tenant
 * project row must not authorize an assignment.
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
  const eligibleRows = (projectMembers.data ?? []).filter(
    row => activeProjectStates.has(String(row.status ?? "").toLowerCase())
  );
  if (!eligibleRows.length) return false;

  const organizationMembers = await db.from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("status", "active");
  if (organizationMembers.error || !organizationMembers.data?.length) return false;
  const ids = new Set(organizationMembers.data.map(member => member.user_id));

  const idCandidates = eligibleRows
    .map(row => row.member_user_id)
    .filter((id): id is string => typeof id === "string" && ids.has(id));

  // Name/email matching alone never creates an authorization. For legacy
  // project membership rows without user IDs, resolve only within active
  // company memberships, never globally.
  let verifiedIds = [...new Set(idCandidates)];
  if (!verifiedIds.length) {
    const companyIds = [...ids];
    const [profiles, internal] = await Promise.all([
      db.from("profiles").select("user_id,email").in("user_id", companyIds).ilike("email", email),
      db.from("internal_user_access").select("user_id,email,active").in("user_id", companyIds).ilike("email", email),
    ]);
    if (profiles.error || internal.error) return false;
    verifiedIds = [...new Set([
      ...(profiles.data ?? []).map(person => person.user_id),
      ...(internal.data ?? []).filter(person => person.active).map(person => person.user_id),
    ])].filter(id => ids.has(id));
    // Some old company members exist only in Supabase Auth. Check the IDs
    // that are already confirmed as active company members, not all users.
    if (!verifiedIds.length) {
      for (const id of companyIds) {
        const authUser = await db.auth.admin.getUserById(id);
        if (authUser.error) return false;
        if (authUser.data.user?.email?.trim().toLowerCase() === email) {
          verifiedIds.push(id);
          break;
        }
      }
    }
  }
  if (!verifiedIds.length) return false;
  const access = await db.from("internal_user_access")
    .select("user_id,active").in("user_id", verifiedIds);
  if (access.error) return false;
  const suspended = new Set((access.data ?? []).filter(row => row.active === false).map(row => row.user_id));
  return verifiedIds.some(id => !suspended.has(id));
}
