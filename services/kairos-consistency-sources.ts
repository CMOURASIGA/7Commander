import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuditEntry = { name: string; state: "sucesso" | "vazia" | "parcial" | "erro"; count: number; total: number | null; reason: string };
export function classifyAuditSource(name: string, result: { data: unknown[] | null; count: number | null; error?: { message: string } | null }): AuditEntry {
  const count = result.data?.length ?? 0;
  const state = result.error || !result.data ? "erro" : result.count === null || result.count > count ? "parcial" : count === 0 ? "vazia" : "sucesso";
  return { name, state, count, total: result.count, reason: result.error?.message ?? "" };
}
function cell(value: unknown): string {
  return String(value ?? "Não informado").replace(/\|/g, "\\|").replace(/\r?\n/g, " ⏎ ");
}
export async function auditAdditionalProjectSources(projectId: string, organizationId: string, mode: "technical" | "summary" = "technical"): Promise<string> {
  const db = getSupabaseServerClient();
  if (!db) return "## Backlog, Scrum e Decisões\nFontes indisponíveis; nenhuma ausência foi comprovada.";
  const sources = [
    { table: "scrum_backlog_items", label: "Backlog", fields: "id,item_type,title,state" },
    { table: "scrum_user_stories", label: "User Stories", fields: "id,title,workflow_stage" },
    { table: "scrum_sprints", label: "Sprints", fields: "id,name,status" },
    { table: "decisions", label: "Decisões", fields: "id,titulo,status" },
  ];
  const outputs = await Promise.all(sources.map(source =>
    db.from(source.table).select(source.fields, { count: "exact" })
      .eq("project_id", projectId).eq("organization_id", organizationId).limit(300)
  ));
  const lines = ["## Backlog, Scrum e Decisões", "", "| Fonte | Recuperados | Total | Consulta |", "| --- | ---: | ---: | --- |"];
  const states = outputs.map((output, index) => classifyAuditSource(sources[index].label, output));
  if(mode==="summary"){
    const summary=["### Planejamento e decisões"];
    const planning=states.filter(state=>state.name!=="Decisões");
    const empty=planning.filter(state=>state.state==="vazia").map(state=>state.name);
    if(empty.length)summary.push("Não há registros cadastrados de "+empty.join(", ")+" nas consultas realizadas.");
    for(const state of planning.filter(state=>state.state!=="vazia")){
      summary.push(state.name+": "+(state.state==="erro"?"consulta indisponível":
        state.state==="parcial"?"consulta parcial, "+state.count+" registro(s) recuperado(s)":
        state.count+" registro(s) recuperado(s)")+".");
    }
    const decisionsIndex=sources.findIndex(source=>source.label==="Decisões");
    const decisionsState=states[decisionsIndex];
    const decisions=outputs[decisionsIndex]?.data;
    if(decisionsState.state==="erro")summary.push("Decisões: consulta indisponível, não é possível afirmar que não há registros.");
    else if(decisionsState.state==="parcial")summary.push("Decisões: consulta parcial com "+decisionsState.count+" registro(s).");
    else if(decisionsState.state==="vazia")summary.push("Nenhuma decisão cadastrada encontrada.");
    else {
      summary.push("Foi encontrada "+decisionsState.count+" decisão(ões) cadastrada(s):");
      for(const item of (decisions??[]).slice(0,3) as unknown as Array<{titulo?:string;status?:string}>)
        summary.push("- "+cell(item.titulo)+" ("+cell(item.status)+").");
    }
    if(states.some(state=>state.state==="erro"||state.state==="parcial"))
      summary.push("Algumas fontes não puderam ser verificadas integralmente; os resultados acima são parciais.");
    return summary.join("\n");
  }
  for (const state of states) {
    lines.push("| " + [state.name, state.count, state.total ?? "Indisponível", state.state].map(cell).join(" | ") + " |");
  }
  outputs.forEach((output, index) => {
    const state = states[index];
    lines.push("", "### " + state.name);
    if (state.state === "erro") {
      lines.push("Falha ou acesso negado na consulta. Não é possível afirmar que não há registros.");
      return;
    }
    const rows = output.data ?? [];
    if (!rows.length) lines.push("Nenhum registro retornado" + (state.state === "vazia" ? " pela consulta completa." : "; total não verificável.") );
    // Dynamic column projection cannot be inferred by Supabase TypeScript generics.
    // Runtime rows are selected read-only records; errors are handled above.
    for (const row of rows as unknown as Array<Record<string, unknown>>) {
      lines.push("- ID " + cell(row.id) + " | " + cell(row.title ?? row.titulo ?? row.name) +
        " | " + cell(row.state ?? row.workflow_stage ?? row.status) +
        (row.item_type ? " | Tipo " + cell(row.item_type) : ""));
    }
    if (state.state === "parcial") lines.push("Consulta parcial. Não conclua que os itens não apresentados são inexistentes.");
  });
  if (states.some(state => state.state === "erro" || state.state === "parcial"))
    lines.push("", "**Confiabilidade não determinada:** existem fontes incompletas ou indisponíveis.");
  else lines.push("", "Consultas concluídas sem truncamento identificado; isso não comprova, isoladamente, integridade funcional dos dados.");
  return lines.join("\n");
}
