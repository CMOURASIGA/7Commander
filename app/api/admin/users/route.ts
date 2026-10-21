import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ROLES = ["admin", "gestor", "colaborador", "leitor"] as const;
type Role = (typeof ROLES)[number];

async function guard(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return { response: auth.response, db: null };
  if (auth.context.authMode !== "supabase") return { response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }), db: null };
  const db = getSupabaseServerClient();
  if (!db) return { response: NextResponse.json({ error: "Banco indisponivel" }, { status: 503 }), db: null };
  const { data, error } = await db.from("platform_admins").select("role,active").eq("user_id", auth.context.userId).eq("active", true).maybeSingle();
  if (error || !data || !["owner","admin","super_admin","superadmin"].includes(data.role)) return { response: NextResponse.json({ error: "Sem permissao de administrador" }, { status: 403 }), db: null };
  return { response: null, db };
}
export async function GET(request: NextRequest) {
  const { response, db } = await guard(request);
  if (response || !db) return response;
  const { data, error } = await db.from("internal_user_access").select("user_id,email,nome,role,active,created_at").order("created_at", { ascending: false }).limit(200);
  return error ? NextResponse.json({ error: "Falha ao listar" }, { status: 500 }) : NextResponse.json({ data });
}
export async function POST(request: NextRequest) {
  const { response, db } = await guard(request);
  if (response || !db) return response;
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const nome = typeof body.nome === "string" ? body.nome.trim().slice(0,120) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role: Role = body.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || !ROLES.includes(role) || !nome)
    return NextResponse.json({ error: "Informe nome, email valido, senha com pelo menos 12 caracteres e perfil." }, { status: 400 });
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: nome } });
  if (created.error || !created.data.user) return NextResponse.json({ error: "Nao foi possivel criar o usuario. Verifique se o email ja existe." }, { status: 400 });
  const id = created.data.user.id;
  const { error } = await db.from("internal_user_access").insert({ user_id: id, email, nome, role, active: true });
  if (error) {
    await db.auth.admin.deleteUser(id);
    return NextResponse.json({ error: "Cadastro revertido: falha ao registrar perfil." }, { status: 500 });
  }
  if (role === "admin") {
    const grant = await db.from("platform_admins").upsert({ user_id: id, role: "admin", active: true });
    if (grant.error) {
      await db.from("internal_user_access").delete().eq("user_id", id);
      await db.auth.admin.deleteUser(id);
      return NextResponse.json({ error: "Cadastro revertido: falha ao conceder perfil." }, { status: 500 });
    }
  }
  return NextResponse.json({ data: { user_id: id, email, nome, role, active: true } }, { status: 201 });
}
export async function PATCH(request: NextRequest) {
  const { response, db } = await guard(request);
  if (response || !db) return response;
  const body = await request.json().catch(() => ({}));
  const { userId, role, active } = body;
  if (typeof userId !== "string" || (role !== undefined && !ROLES.includes(role)) || (active !== undefined && typeof active !== "boolean"))
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  const auth = await requireApiAuth(request);
  if (auth.ok && auth.context.userId === userId && (active === false || (role && role !== "admin")))
    return NextResponse.json({ error: "Voce nao pode retirar seu proprio acesso administrativo." }, { status: 400 });
  const patch: { role?: Role; active?: boolean } = {};
  if (role !== undefined) patch.role = role;
  if (active !== undefined) patch.active = active;
  const updated = await db.from("internal_user_access").update(patch).eq("user_id", userId).select("user_id,email,nome,role,active").single();
  if (updated.error) return NextResponse.json({ error: "Falha ao atualizar usuario" }, { status: 500 });
  const admin = updated.data.role === "admin" && updated.data.active;
  const setAdmin = await db.from("platform_admins").upsert({ user_id: userId, role: "admin", active: admin });
  if (setAdmin.error) return NextResponse.json({ error: "Perfil atualizado parcialmente; revisar permissao administrativa." }, { status: 500 });
  // Requests from suspended users are rejected by requireApiAuth.
  return NextResponse.json({ data: updated.data });
}
