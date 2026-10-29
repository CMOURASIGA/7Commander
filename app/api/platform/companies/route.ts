import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const noStore = { "Cache-Control": "no-store" };

async function authorize(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return { response: auth.response, db: null, userId: null };
  if (auth.context.authMode !== "supabase") return { response: NextResponse.json({ error: "Sessão Supabase obrigatória." }, { status: 401 }), db: null, userId: null };
  const db = getSupabaseServerClient();
  if (!db) return { response: NextResponse.json({ error: "Banco indisponível." }, { status: 503 }), db: null, userId: null };
  const admin = await db.from("platform_admins").select("user_id").eq("user_id", auth.context.userId).eq("active", true).eq("role", "superadmin").maybeSingle();
  if (admin.error) return { response: NextResponse.json({ error: "Falha ao validar privilégios." }, { status: 503 }), db: null, userId: null };
  if (!admin.data) return { response: NextResponse.json({ error: "Apenas o superadmin pode gerenciar empresas." }, { status: 403 }), db: null, userId: null };
  return { response: null, db, userId: auth.context.userId };
}
export async function GET(request: NextRequest) {
  const { response, db } = await authorize(request);
  if (response || !db) return response;
  const result = await db.from("organizations").select("id,name,slug,status,branding,created_at").order("name");
  if (result.error) return NextResponse.json({ error: "Falha ao carregar empresas." }, { status: 500 });
  return NextResponse.json({ data: result.data ?? [] }, { headers: noStore });
}
export async function POST(request: NextRequest) {
  const { response, db, userId } = await authorize(request);
  if (response || !db || !userId) return response;
  const input = await request.json().catch(() => null);
  if (!input || typeof input.name !== "string" || typeof input.slug !== "string") return NextResponse.json({ error: "Nome e identificador obrigatórios." }, { status: 400 });
  const name = input.name.trim(); const slug = input.slug.trim().toLowerCase();
  if (name.length < 3 || name.length > 120 || slug.length > 64 || !slugPattern.test(slug)) return NextResponse.json({ error: "Nome ou identificador inválido." }, { status: 400 });
  const created = await db.from("organizations").insert({ name, slug, created_by: userId, status: "active", branding: { displayName: name, primaryColor: "#003B73", secondaryColor: "#00AEEF" } }).select("id,name,slug,status,branding").single();
  if (created.error) return NextResponse.json({ error: created.error.code === "23505" ? "Identificador já utilizado." : "Falha ao cadastrar empresa." }, { status: 409 });
  return NextResponse.json({ data: created.data, operationalIsolationReady: false }, { status: 201, headers: noStore });
}
export async function PATCH(request: NextRequest) {
  const { response, db } = await authorize(request);
  if (response || !db) return response;
  const input = await request.json().catch(() => null);
  if (!input || typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
  const current = await db.from("organizations").select("id,name,branding").eq("id",input.id).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  const branding = input.branding;
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) return NextResponse.json({ error: "Identidade visual inválida." }, { status: 400 });
  const displayName = String(branding.displayName ?? "").trim();
  const primaryColor = String(branding.primaryColor ?? "");
  const secondaryColor = String(branding.secondaryColor ?? "");
  const logoUrl = String(branding.logoUrl ?? "");
  if (!displayName || displayName.length > 120 || !colorPattern.test(primaryColor) || !colorPattern.test(secondaryColor) || logoUrl.length > 480000 || (logoUrl && !( /^https:\/\/[^\s]+$/.test(logoUrl) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoUrl)))) return NextResponse.json({ error: "Nome, cores ou URL de logotipo inválidos." }, { status: 400 });
  const updated = await db.from("organizations").update({ branding: { displayName, primaryColor, secondaryColor, logoUrl } }).eq("id",input.id).select("id,name,branding").single();
  if (updated.error) return NextResponse.json({ error: "Falha ao salvar whitelabel." }, { status: 500 });
  return NextResponse.json({ data: updated.data }, { headers: noStore });
}

export async function DELETE(request: NextRequest) {
 const {response,db}=await authorize(request);
 if(response||!db)return response;
 const body=await request.json().catch(()=>null);
 const id=typeof body?.id==="string"?body.id:"";
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:"Empresa inválida."},{status:400});
 if(body.confirmation!=="DESATIVAR")
  return NextResponse.json({error:"Confirme a operação digitando DESATIVAR."},{status:400});
 const org=await db.from("organizations").select("id,name,status").eq("id",id).maybeSingle();
 if(org.error||!org.data)return NextResponse.json({error:"Empresa não encontrada."},{status:404});
 if(["43973606-0c05-4934-a057-9f2710899eba","bce0fe84-eb14-4e9d-9815-1cb22cde3e5a"].includes(id))
  return NextResponse.json({error:"Empresas principais protegidas. Desativação requer procedimento administrativo específico."},{status:403});
 for(const table of ["projects","clients","commander_planning_records","organization_members"] as const){
  const records=await db.from(table).select("id",{count:"exact",head:true}).eq("organization_id",id);
  if(records.error)return NextResponse.json({error:"Não foi possível verificar os vínculos empresariais."},{status:503});
  if((records.count??0)>0)return NextResponse.json({error:"A empresa possui registros ou usuários vinculados. Desativação bloqueada para preservar o acesso e o histórico."},{status:409});
 }
 const saved=await db.from("organizations").update({status:"inactive"}).eq("id",id).eq("status","active").select("id,status").maybeSingle();
 if(saved.error||!saved.data)return NextResponse.json({error:"Empresa não foi desativada ou já está inativa."},{status:409});
 return NextResponse.json({data:saved.data},{headers:noStore});
}
