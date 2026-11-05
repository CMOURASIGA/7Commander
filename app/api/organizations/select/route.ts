import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { resolveTenantMembership } from "@/lib/tenant-context";
import { TENANT_SCHEMA_READY } from "@/lib/tenant-runtime";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authorizeCentralPilot } from "@/lib/central-runtime";
import { recordCentralDecision } from "@/lib/central-decision-audit";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.context.authMode !== "supabase") return NextResponse.json({ error: "Sessão Supabase necessária." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.organizationId !== "string") return NextResponse.json({ error: "Organização inválida." }, { status: 400 });
  const tenant = await resolveTenantMembership(auth.context.userId, body.organizationId);
  if (!tenant) return NextResponse.json({ error: "Sem acesso à organização." }, { status: 403 });
  // Never expose tenant switching unless all service modules and E2E gates
  // have been audited and the coordinated database migration is deployed.
  const ready = TENANT_SCHEMA_READY && process.env.SEVEN_COMMANDER_MULTI_TENANT_READY === "true";
  if(!ready){
    return NextResponse.json({data:{organizationId:tenant.organizationId,role:tenant.role,operationalIsolationReady:false}},{headers:{"Cache-Control":"no-store"}});
  }
  const db=getSupabaseServerClient();
  if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
  if (process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS === "true") {
    const [platform, internal, link] = await Promise.all([
      db.from("platform_admins").select("user_id").eq("user_id",auth.context.userId)
        .eq("active",true).maybeSingle(),
      db.from("internal_user_access").select("active").eq("user_id",auth.context.userId)
        .maybeSingle(),
      db.from("central_client_company_links").select("commander_company_id")
        .eq("commander_company_id",tenant.organizationId).eq("status","ACTIVE").maybeSingle(),
    ]);
    if (platform.error || internal.error || link.error)
      return NextResponse.json({error:"Autorização empresarial indisponível."},{status:503});
    const customer = !platform.data && !internal.data?.active;
    if (customer) {
      if (!link.data) return NextResponse.json({error:"Empresa sem vínculo central ativo."},{status:403});
      const decision = await authorizeCentralPilot(request,auth.context.userId,
        tenant.organizationId,"organizations.view");
      const logged=await recordCentralDecision({
        userId:auth.context.userId,companyId:tenant.organizationId,
        route:request.nextUrl.pathname,method:request.method,
        allowed:decision.allowed,reasonCode:decision.reasonCode,
      });
      if (!logged && decision.allowed)
        return NextResponse.json({error:"Auditoria central indisponível."},{status:503});
      if (!decision.allowed)
        return NextResponse.json({error:"Empresa não autorizada pelo 7Service."},
          {status:decision.status});
    }
  }
  const written=await db.from("profiles").update({active_organization_id:tenant.organizationId})
    .eq("user_id",auth.context.userId).select("user_id").maybeSingle();
  if(written.error||!written.data)return NextResponse.json({error:"Não foi possível selecionar a empresa"},{status:409});
  const verified = await db.from("profiles").select("active_organization_id")
    .eq("user_id",auth.context.userId).maybeSingle();
  if(verified.error || verified.data?.active_organization_id !== tenant.organizationId)
    return NextResponse.json({error:"Não foi possível confirmar a empresa ativa"},{status:409});
  return NextResponse.json({data:{organizationId:tenant.organizationId,role:tenant.role,operationalIsolationReady:true}},{headers:{"Cache-Control":"no-store"}});
}
