import {createTaskCard,listTaskBoard} from "@/services/task-board-service";
export type ParsedActivity={reference:string;title:string;description:string;priority:"baixa"|"media"|"alta"|"critica";dueDate:string|null};
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
function field(block:string,key:string):string{
 return (block.match(new RegExp("^\\s*(?:\\*\\*)?"+key+"(?:\\*\\*)?\\s*:\\s*(.+?)\\s*$","im"))?.[1]||"").trim().replace(/\*\*$/,"");
}
function dateBR(raw:string):string|null{
 const m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;
 const y=Number(m[3]),mo=Number(m[2]),d=Number(m[1]),dt=new Date(Date.UTC(y,mo-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?m[3]+"-"+m[2]+"-"+m[1]:null;
}
export function parseKanbanActivityBatch(message:string):ParsedActivity[]{
 const matches=[...message.matchAll(/^\s*\*{0,2}(ATV-\d{2,3})\s*\|\s*(.+?)\*{0,2}\s*$/gim)];
 if(!matches.length||matches.length>50)return [];
 const result:ParsedActivity[]=[];
 for(let i=0;i<matches.length;i++){
  const match=matches[i],next=matches[i+1],block=message.slice((match.index||0)+match[0].length,next?.index??message.length);
  const description=field(block,"Descri(?:ç|c)(?:ão|ao)"),acceptance=field(block,"Crit(?:é|e)rio de aceite");
  const priorityRaw=normalize(field(block,"Prioridade")),dueRaw=field(block,"Data-alvo");
  if(!description||!acceptance||(dueRaw&&!dateBR(dueRaw)))return [];
  const priority=priorityRaw==="critica"?"critica":priorityRaw==="alta"?"alta":priorityRaw==="baixa"?"baixa":"media";
  result.push({reference:match[1].toUpperCase(),title:match[2].replace(/\*+$/,"").trim(),
   description:"Referência funcional: "+match[1].toUpperCase()+"\n\n"+description+"\n\nCritério de aceite: "+acceptance,
   priority,dueDate:dateBR(dueRaw)});
 }
 return new Set(result.map(row=>row.reference)).size===result.length?result:[];
}
export function hasExplicitBatchCreationRequest(message:string):boolean{
 return /\b(crie|criar|cadastre|cadastrar|registre|registrar|adicione|adicionar)\b[\s\S]{0,170}\b(atividades|tarefas|cards)\b/i.test(message)
  && parseKanbanActivityBatch(message).length>0;
}
export async function createKanbanActivityBatch(params:{userId:string;userEmail?:string|null;projectId:string;projectName:string;message:string}):Promise<string>{
 const rows=parseKanbanActivityBatch(params.message);
 if(!rows.length||!hasExplicitBatchCreationRequest(params.message))return "Lote não reconhecido. Nenhuma atividade criada.";
 const specified=params.message.match(/projeto\s+\*{0,2}([^*\n]+?)\*{0,2}\s*,?\s*vinculado/i)?.[1]?.trim();
 if(specified&&!normalize(params.projectName).includes(normalize(specified).split("|")[0].trim()))
  return "O projeto citado não corresponde ao projeto selecionado. Nenhuma atividade criada.";
 const board=await listTaskBoard({userId:params.userId,userEmail:params.userEmail,projectId:params.projectId});
 if(!board)return "Kanban não disponível ou sem autorização. Nenhuma atividade criada.";
 const existing=board.columns.flatMap(col=>col.cards);
 const created:string[]=[],reused:string[]=[],failed:string[]=[];
 const titleNorm=(name:string)=>normalize(name).replace(/^atv-\d+\s*[:|-]\s*/,"");
 for(const row of rows){
  const previous=existing.find(card=>normalize(card.description).includes("referencia funcional: "+normalize(row.reference))
   ||titleNorm(card.title)===titleNorm(row.title));
  if(previous){reused.push(row.reference+" | "+previous.id);continue;}
  try{
   const card=await createTaskCard({userId:params.userId,userEmail:params.userEmail,projectId:params.projectId,title:row.title,
    description:row.description,priority:row.priority,dueDate:row.dueDate,columnKey:"todo",actionSource:"kairos"});
   if(card){created.push(row.reference+" | "+card.id);existing.push(card);}else failed.push(row.reference);
  }catch{failed.push(row.reference);}
 }
 return ["## Kanban do projeto "+params.projectName,
  "- Solicitadas: "+rows.length+"; criadas: "+created.length+"; reaproveitadas: "+reused.length+"; não criadas: "+failed.length+".",
  ...created.map(v=>"- Criada "+v+" | TO DO"),...reused.map(v=>"- Já existente "+v),
  ...(failed.length?["- Não criadas: "+failed.join(", ")]:[]),
  "- Nenhuma Sprint criada, nenhuma atividade concluída automaticamente e nenhum responsável atribuído sem evidência.",
  "- Vínculos com riscos: não alterados sem identificação e autorização inequívocas.",
  "- Foram cadastrados cards operacionais. Nenhuma atividade de desenvolvimento foi executada."].join("\n");
}
