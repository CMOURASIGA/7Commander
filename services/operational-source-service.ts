import "server-only";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {Input,ModuleName} from "@/lib/operational-intelligence";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Source={table:string;fields:string;title:string;description:string;status?:string;owner?:string;dueDate?:string;impact?:string;probability?:string;kind?:string};
const SOURCES:Record<ModuleName,Source>={
 projects:{table:"projects",fields:"id,organization_id,nome,descricao,status",title:"nome",description:"descricao",status:"status"},
 kanban:{table:"tasks",fields:"id,organization_id,titulo,descricao,status,responsavel,due_date",title:"titulo",description:"descricao",status:"status",owner:"responsavel",dueDate:"due_date"},
 risks:{table:"risks",fields:"id,organization_id,titulo,impacto,probabilidade,mitigacao,status,responsavel",title:"titulo",description:"mitigacao",impact:"impacto",probability:"probabilidade",status:"status",owner:"responsavel"},
 commercial:{table:"commander_planning_records",fields:"id,organization_id,kind,title,description,status",title:"title",description:"description",status:"status",kind:"kind"},
 decisions:{table:"decisions",fields:"id,organization_id,titulo,contexto,status,impacto",title:"titulo",description:"contexto",status:"status",impact:"impacto"},
 knowledge:{table:"knowledge_base",fields:"id,organization_id,titulo,conteudo,categoria",title:"titulo",description:"conteudo"},
 notifications:{table:"tasks",fields:"id,organization_id,titulo,descricao,status,responsavel,due_date",title:"titulo",description:"descricao",status:"status",owner:"responsavel",dueDate:"due_date"}
};
export async function loadOperationalSource(module:ModuleName,id:string,organizationId:string):Promise<Input|null>{
 if(!UUID.test(id)||!UUID.test(organizationId))return null;
 const db=getSupabaseServerClient();if(!db)throw new Error("Database unavailable");
 const spec=SOURCES[module];
 const result=await db.from(spec.table).select(spec.fields).eq("id",id).eq("organization_id",organizationId).maybeSingle();
 if(result.error)throw new Error("Cannot load scoped source");
 const row=result.data as unknown as Record<string,unknown>|null;
 if(!row||row.organization_id!==organizationId)return null;
 const str=(key?:string,max=500)=>key&&typeof row[key]==="string"?(row[key] as string).slice(0,max):"";
 if(module==="commercial"&&!["prospect","opportunity"].includes(str(spec.kind)))return null;
 return {module,title:str(spec.title,180),description:str(spec.description,3000),status:str(spec.status),owner:str(spec.owner),dueDate:str(spec.dueDate),impact:str(spec.impact),probability:str(spec.probability)};
}
