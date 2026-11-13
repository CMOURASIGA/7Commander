import type {MeetingAction,MeetingEvidence} from "@/services/meeting-evidence";

/**
 * Second-pass, source-constrained semantic assessment of extracted meeting items.
 * Independent of the extraction prompt. The evaluator cannot approve a task or
 * create a record; uncertain responses are always returned for human review.
 */
export type SemanticDecision={
 id:string;kind:MeetingAction["kind"];status:MeetingAction["status"];
 evidenceSupports:boolean;commitmentConfirmed:boolean;reason:string;
};
export type SemanticAudit={reviewed:number;uncertain:number;demoted:number};
const kinds=new Set<MeetingAction["kind"]>(["operational","business_rule","context","offer","completed","review"]);
const statuses=new Set<MeetingAction["status"]>(["proposta","assumido","realizado","pendente","a_confirmar"]);
export function semanticContext(action:MeetingAction,source:string):string{
 const quote=action.evidence.trim();
 const start=quote?source.indexOf(quote):-1;
 if(start>=0)return source.slice(Math.max(0,start-450),Math.min(source.length,start+quote.length+450));
 // Exact source context is preferable; no matching excerpt means no source evidence.
 return "";
}
export function parseSemanticAudit(raw:unknown,expectedIds:string[]):SemanticDecision[]{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Avaliação semântica sem objeto JSON válido.");
 const list=(raw as {decisions?:unknown}).decisions;
 if(!Array.isArray(list)||list.length!==expectedIds.length)throw Error("Avaliação semântica incompleta.");
 const expected=new Set(expectedIds);const seen=new Set<string>();
 return list.map(item=>{
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Item semântico inválido.");
  const d=item as Record<string,unknown>;
  if(typeof d.id!=="string"||!expected.has(d.id)||seen.has(d.id)
   ||!kinds.has(d.kind as MeetingAction["kind"])||!statuses.has(d.status as MeetingAction["status"])
   ||typeof d.evidenceSupports!=="boolean"||typeof d.commitmentConfirmed!=="boolean"
   ||typeof d.reason!=="string"||d.reason.trim().length<8||d.reason.length>500)
   throw Error("Classificação semântica incompleta ou inconsistente.");
  seen.add(d.id);
  return {id:d.id,kind:d.kind as MeetingAction["kind"],status:d.status as MeetingAction["status"],
   evidenceSupports:d.evidenceSupports,commitmentConfirmed:d.commitmentConfirmed,reason:d.reason.trim()};
 });
}
export function applySemanticAudit(evidence:MeetingEvidence,decisions:SemanticDecision[]):SemanticAudit{
 const lookup=new Map(decisions.map(x=>[x.id,x]));
 let uncertain=0,demoted=0;
 evidence.actions=evidence.actions.map(item=>{
  const d=lookup.get(item.id);
  // Even omitted or invalid evaluation cannot preserve an AI-asserted commitment.
  if(!d||!d.evidenceSupports||d.kind==="review"){
   uncertain++;
   return {...item,kind:"review" as const,status:"a_confirmar" as const,owner:"",included:false,
    semanticReason:d?.reason||"Avaliação semântica indisponível, revisar com a fonte.",semanticVerified:false};
  }
  // A second assessor can demote a false positive, never auto-promote a
  // rule/context to actionable work without the manager deciding.
  const kind:MeetingAction["kind"]=item.kind==="operational"?d.kind:item.kind;
  if(item.kind==="operational"&&kind!=="operational")demoted++;
  const status:MeetingAction["status"]=kind==="operational"&&d.commitmentConfirmed&&d.status==="assumido"
   ?"assumido":kind==="operational"&&d.status!=="assumido"?d.status:"a_confirmar";
  return {...item,kind,status,owner:kind==="operational"&&d.commitmentConfirmed?item.owner:"",included:false,
   semanticReason:d.reason,semanticVerified:true};
 });
 return {reviewed:evidence.actions.length,uncertain,demoted};
}
