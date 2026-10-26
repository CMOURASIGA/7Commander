import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { resolveTenantMembership } from "@/lib/tenant-context";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.context.authMode !== "supabase") return NextResponse.json({ error: "Sessão Supabase necessária." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.organizationId !== "string") return NextResponse.json({ error: "Organização inválida." }, { status: 400 });
  const tenant = await resolveTenantMembership(auth.context.userId, body.organizationId);
  if (!tenant) return NextResponse.json({ error: "Sem acesso à organização." }, { status: 403 });
  return NextResponse.json({ data: { organizationId: tenant.organizationId, role: tenant.role, operationalIsolationReady: false } }, { headers: { "Cache-Control": "no-store" } });
}
