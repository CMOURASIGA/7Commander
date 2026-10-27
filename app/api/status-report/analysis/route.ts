import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";
import { getOpenAIClient } from "@/lib/openai";
import { KAIROS_PM_REPORT_POLICY } from "@/lib/kairos-pm-report-policy";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const noStore = { "Cache-Control": "no-store" };
type Narrative = { executiveSummary: string; riskAnalysis: string; nextSteps: string };
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.context.authMode !== "supabase") return NextResponse.json({error:"Sessão autenticada obrigatória."},{status:401});
  const input = await request.json().catch(() => null);
  const id = typeof input?.projectId === "string" ? input.projectId : "";
  const mode = input?.mode === "period" ? "period" : "current";
  const start = input?.start, end = input?.end;
  if (!UUID.test(id) || (mode==="period" && (typeof start!=="string" || typeof end!=="string" || !DATE.test(start) || !DATE.test(end) || start>end || !Number.isFinite(Date.parse(start+"T00:00:00Z")) || !Number.isFinite(Date.parse(end+"T00:00:00Z"))))) {
    return NextResponse.json({error:"Projeto ou período inválido."},{status:400});
  }
  const db = getSupabaseServerClient();
  const tenant = await getEffectiveTenantForUser(auth.context.userId);
  if (!db || !tenant) return NextResponse.json({error:"Empresa autenticada indisponível."},{status:403});
  const projectResult = await db.from("projects").select("id,nome,objetivo,descricao").eq("id",id).eq("organization_id",tenant).maybeSingle();
  if (projectResult.error || !projectResult.data) return NextResponse.json({error:"Projeto sem acesso."},{status:404});
  const project = projectResult.data;
  const [tasksResult,risksResult,decisionsResult] = await Promise.all([
    db.from("tasks").select("id,titulo,status,created_at,updated_at,due_date,responsavel,prioridade").eq("project_id",id).limit(500),
    db.from("risks").select("id,titulo,impacto,probabilidade,mitigacao,responsavel,status,created_at,updated_at").eq("project_id",id).limit(200),
    db.from("decisions").select("id,titulo,impacto,contexto,status,created_at,updated_at").eq("project_id",id).limit(200),
  ]);
  if (tasksResult.error || risksResult.error || decisionsResult.error) return NextResponse.json({error:"Dados do projeto indisponíveis."},{status:503});
  const tasks = tasksResult.data||[], risks=risksResult.data||[], decisions=decisionsResult.data||[];
  let events: Array<{action_type:string; task_id:string; created_at:string}> = [];
  if (mode==="period" && tasks.length) {
    const endExclusive = new Date(Date.parse(end+"T00:00:00Z")+86400000).toISOString();
    const log = await db.from("task_activity_log").select("action_type,task_id,created_at")
      .in("task_id",tasks.map(x=>x.id)).gte("created_at",start+"T00:00:00Z").lt("created_at",endExclusive).limit(1000);
    if(log.error)return NextResponse.json({error:"Histórico do período indisponível; relatório não gerado."},{status:503});
    events=log.data||[];
  }
  const inPeriod=(value:string|null|undefined) => mode==="period" && Boolean(value) && value!.slice(0,10)>=start && value!.slice(0,10)<=end;
  const periodMetrics = mode==="period" ? {
    tasksCreated:tasks.filter(x=>inPeriod(x.created_at)).length,
    risksRegistered:risks.filter(x=>inPeriod(x.created_at)).length,
    decisionsRegistered:decisions.filter(x=>inPeriod(x.created_at)).length,
    activityEvents:events.length,
  } : null;
  const period = mode==="current" ? "Situação atual" : start+" a "+end;
  const scope = {
    projeto:project.nome, objetivo:project.objetivo||project.descricao||"Não registrado",
    periodo:period,
    criterio:mode==="current"?"Fotografia operacional atual, sem inferência histórica":"Eventos registrados no intervalo; situação dos riscos e tarefas é atual, não retrospectiva",
    atividadesAtuais:tasks.map(x=>({titulo:x.titulo,status:x.status,prioridade:x.prioridade,prazo:x.due_date,responsavel:x.responsavel})),
    riscosAtuais:risks.map(x=>({titulo:x.titulo,status:x.status,impacto:x.impacto,probabilidade:x.probabilidade,mitigacao:x.mitigacao,responsavel:x.responsavel})),
    decisoesAtuais:decisions.map(x=>({titulo:x.titulo,status:x.status,impacto:x.impacto,contexto:x.contexto})),
    eventosNoPeriodo:events.map(x=>({tipo:x.action_type,data:x.created_at})),
    registrosCriadosNoPeriodo:periodMetrics,
    avisos:["Não equiparar quantidade de cartões a percentual de escopo.","Não inferir estado passado de registros atuais.","Não tratar ausência de histórico como ausência de trabalho."]
  };
  const openai = getOpenAIClient();
  if (!openai) return NextResponse.json({data:{period,mode,source:"unavailable",periodEvents:events.length,periodMetrics,analysis:null},warning:"OPENAI_API_KEY indisponível; não foi inventada análise."},{headers:noStore});
  try {
    const result = await openai.responses.create({
      model:"gpt-4o-mini",
      input:[
        {role:"system",content:KAIROS_PM_REPORT_POLICY+"\nProduza exclusivamente JSON com três campos string: executiveSummary, riskAnalysis, nextSteps. Português executivo, cada campo com 2 a 5 frases objetivas. Use apenas os dados recebidos. Evite enumerar riscos genéricos, integre riscos semelhantes e indique mitigação existente ou ausente. Diferencie riscos reais de lacunas. Não invente fatos, evolução histórica ou estimativa. Nenhum comando de escrita."},
        {role:"user",content:JSON.stringify(scope).slice(0,45000)}
      ],
    });
    const raw=(result.output_text||"").trim().replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"");
    const parsed=JSON.parse(raw) as Partial<Narrative>;
    if(!parsed || !["executiveSummary","riskAnalysis","nextSteps"].every(k=>typeof parsed[k as keyof Narrative]==="string" && String(parsed[k as keyof Narrative]).length>20))throw Error("Invalid narrative");
    const analysis:Narrative={executiveSummary:parsed.executiveSummary!.slice(0,3000),riskAnalysis:parsed.riskAnalysis!.slice(0,3000),nextSteps:parsed.nextSteps!.slice(0,3000)};
    return NextResponse.json({data:{period,mode,periodEvents:events.length,periodMetrics,source:"ai",analysis}},{headers:noStore});
  }catch {
    return NextResponse.json({data:{period,mode,periodEvents:events.length,source:"unavailable",analysis:null},warning:"Análise inteligente indisponível no momento; dados operacionais permanecem acessíveis."},{headers:noStore});
  }
}
