import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";

export const dynamic = "force-dynamic";

/** Lists eligible assignees in the caller's server-verified active company only. */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const organizationId = await getEffectiveTenantForUser(auth.context.userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Empresa ativa não autorizada" }, { status: 403 });
  }
  const db = getSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "Banco indisponível" }, { status: 503 });

  const membership = await db.from("organization_members").select("id")
    .eq("organization_id", organizationId).eq("user_id", auth.context.userId)
    .eq("status", "active").maybeSingle();
  if (membership.error) return NextResponse.json({ error: "Falha ao verificar equipe" }, { status: 503 });
  if (!membership.data) return NextResponse.json({ error: "Sem acesso à equipe" }, { status: 403 });

  const members = await db.from("organization_members").select("user_id")
    .eq("organization_id", organizationId).eq("status", "active");
  if (members.error) return NextResponse.json({ error: "Falha ao listar equipe" }, { status: 503 });

  const ids = [...new Set((members.data ?? []).map(m => m.user_id))];
  if (ids.length === 0) {
    return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const users = await db.from("internal_user_access").select("user_id,nome,email,active")
    .in("user_id", ids).eq("active", true);
  if (users.error) return NextResponse.json({ error: "Falha ao listar usuários" }, { status: 503 });

  const list = (users.data ?? []).map(u => ({ id: u.user_id, name: u.nome, email: u.email }));
  for (const id of ids) {
    if (list.some(user => user.id === id)) continue;
    const account = await db.auth.admin.getUserById(id);
    if (account.error || !account.data.user?.email) continue;
    const user = account.data.user;
    const access = await db.from("internal_user_access").select("active").eq("user_id", id).maybeSingle();
    if (access.error) return NextResponse.json({ error: "Falha ao verificar usuário" }, { status: 503 });
    if (access.data?.active === false) continue;
    list.push({
      id: user.id,
      name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email,
      email: user.email,
    });
  }
  return NextResponse.json({ data: list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
