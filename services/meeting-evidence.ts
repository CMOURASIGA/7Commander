export type MeetingAction={
 id:string;title:string;owner:string;kind:"operational"|"business_rule"|"context"|"offer"|"completed"|"review";status:"proposta"|"assumido"|"realizado"|"pendente"|"a_confirmar";
 evidence:string;time:string;sourceBlock:number;included:boolean;
};
export type MeetingEvidence={
 participantsMentioned:string[];
 participantsConfirmed:string[];
 actions:MeetingAction[];
 coverage:{blocks:number;processed:number;notes:string[]};
};

const bounded=(value:unknown,max=1200)=>typeof value==="string"?value.trim().slice(0,max):"";
const strings=(v:unknown,limit=30)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string").map(x=>bounded(x,300)).filter(Boolean).slice(0,limit):[];
const allowedStatus=new Set(["proposta","assumido","realizado","pendente","a_confirmar"]);
const allowedKinds=new Set(["operational","business_rule","context","offer","completed","review"]);
export const isSpeakerPlaceholder=(name:string)=>/^(?:palestrante|speaker|orador|participante)\s*#?\d+$/i.test(name.trim());
export function normalizeAction(raw:unknown,block:number,index:number):MeetingAction|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const data=raw as Record<string,unknown>;
 const title=bounded(data.title,350);
 if(title.length<5)return null;
 const status=bounded(data.status,30);
 const kind=bounded(data.kind,30);
 const chosen=allowedKinds.has(kind)?kind as MeetingAction["kind"]:"review";
 return {
  id:"B"+String(block).padStart(2,"0")+"-A"+String(index+1).padStart(2,"0"),
  title,owner:bounded(data.owner,180),kind:chosen,
  status:allowedStatus.has(status)?status as MeetingAction["status"]:"a_confirmar",
  evidence:bounded(data.evidence,500),
  time:/^(?:\d{2}:)?\d{2}:\d{2}$/.test(bounded(data.time,16))?bounded(data.time,16):"",
  sourceBlock:block,included:false
 };
}
export function chunkTranscript(text:string,maxChars=12000):string[]{
 const lines=text.split(/\r?\n/);
 const result:string[]=[];let part="";
 for(const line of lines){
  const content=line+"\n";
  if(part.length+content.length>maxChars&&part.trim()){
   result.push(part.trim());part="";
  }
  if(content.length>maxChars){
   for(let start=0;start<content.length;start+=maxChars){
    const slice=content.slice(start,start+maxChars);
    if(part.trim()){result.push(part.trim());part="";}
    result.push(slice);
   }
  }else part+=content;
 }
 if(part.trim())result.push(part.trim());
 return result;
}
export function normalizeBlockEvidence(value:unknown,block:number):{actions:MeetingAction[];participantsMentioned:string[];participantsConfirmed:string[];notes:string[]}{
 const data:Record<string,unknown>=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const rawActions=Array.isArray(data.actions)?data.actions:[];
 return {actions:rawActions.slice(0,24).map((a,i)=>normalizeAction(a,block,i)).filter((a):a is MeetingAction=>Boolean(a)),
  participantsMentioned:strings(data.participantsMentioned),participantsConfirmed:strings(data.participantsConfirmed).filter(name=>!isSpeakerPlaceholder(name)),notes:strings(data.notes,12)};
}
export function mergeEvidence(parts:ReturnType<typeof normalizeBlockEvidence>[]):MeetingEvidence{
 const seen=new Set<string>();
 const actions=parts.flatMap(p=>p.actions).filter(item=>{
  // Remove exact repeated extraction across blocks, do not merge independently distinct tasks.
  const key=item.title.toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim()+"|"+item.time;
  if(seen.has(key))return false;
  seen.add(key);return true;
 }).slice(0,120);
 const people=Array.from(new Set(parts.flatMap(p=>p.participantsMentioned)));
 return {actions,participantsMentioned:people,participantsConfirmed:Array.from(new Set(parts.flatMap(p=>p.participantsConfirmed))),
  coverage:{blocks:parts.length,processed:parts.length,notes:parts.flatMap(p=>p.notes).slice(0,40)}};
}
export function formatApprovedMeetingActions(actions:MeetingAction[]):{commitments:string;pendingItems:string}{
 const selected=actions.filter(a=>a.included&&a.kind==="operational");
 const text=(a:MeetingAction)=>[
  a.id+" | "+a.title,
  a.owner?"Responsável citado/sugerido: "+a.owner:"Responsável: a confirmar",
  "Categoria: "+a.kind,
  "Situação na fonte: "+a.status,
  a.time?"Trecho: "+a.time:"",
  a.evidence?"Evidência: "+a.evidence:""
 ].filter(Boolean).join(" | ");
 return {
  commitments:selected.filter(a=>a.status==="assumido").map(text).join("\n"),
  pendingItems:selected.filter(a=>a.status!=="assumido").map(text).join("\n").slice(0,7900),
 };
}
