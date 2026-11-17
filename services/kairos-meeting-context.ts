import {getSupabaseServerClient} from "@/lib/supabase/server";

const text=(value:unknown,limit=1400)=>typeof value==="string"?value.trim().slice(0,limit):"";
export async function loadProjectMeetingContext(projectId:string,organizationId:string):Promise<string>{
 const db=getSupabaseServerClient();
 if(!db)return "Reuniões: base indisponível; não inferir ausência de registros.";
 const response=await db.from("project_meetings")
  .select("id,title,held_at,objective,summary,decisions,commitments,pending_items,risks,next_follow_up")
  .eq("project_id",projectId).eq("organization_id",organizationId)
  .order("held_at",{ascending:false}).limit(12);
 if(response.error)return "Reuniões: consulta indisponível; não inferir ausência de registros.";
 if(!response.data?.length)return "Reuniões: consulta concluída, nenhum registro encontrado.";
 return [
  "Reuniões oficiais recuperadas: "+response.data.length+" (últimas 12, consulta limitada).",
  "Registros de reunião documentam discussões, não comprovam execução. Não converter compromisso em card, risco ou decisão sem aprovação.",
  ...response.data.map(m=>[
   "Reunião ID "+m.id+": "+text(m.title,180)+" | "+m.held_at,
   "Objetivo: "+text(m.objective),
   "Resumo: "+text(m.summary),
   "Decisões relatadas na ata (verificar formalização): "+text(m.decisions),
   "Compromissos relatados (não presumir entregues): "+text(m.commitments),
   "Pendências relatadas: "+text(m.pending_items),
   "Riscos discutidos (não presumir cadastro): "+text(m.risks),
   "Próximo acompanhamento, se registrado: "+(m.next_follow_up||"não informado")
  ].join("\n"))
 ].join("\n\n");
}
