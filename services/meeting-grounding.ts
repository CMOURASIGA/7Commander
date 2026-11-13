import type {MeetingEvidence,MeetingAction} from "@/services/meeting-evidence";

/**
 * Independent source grounding for Kairos meeting extraction.
 * No model calls and no write operations. The source wins over the generated quote.
 */
export type GroundingOutcome="exact"|"normalized"|"unverified";
export type GroundedMeetingAction=MeetingAction&{
 grounding:GroundingOutcome;
 sourceOffset:number|null;
 verificationNotes:string[];
};
export type GroundingReport={
 total:number;verified:number;unverified:number;
 actions:GroundedMeetingAction[];
};

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
function normalizedOffset(source:string,excerpt:string):number{
 // Maintain source character offsets during accent/punctuation normalization.
 const mapped:string[]=[];const positions:number[]=[];
 for(let i=0;i<source.length;i++){
  const chars=source[i].normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g," ");
  for(const ch of chars){
   if(ch===" "&&mapped[mapped.length-1]===" ")continue;
   mapped.push(ch);positions.push(i);
  }
 }
 const needle=normalize(excerpt);
 if(needle.length<12)return -1;
 const index=mapped.join("").indexOf(needle);
 return index>=0?(positions[index]??-1):-1;
}
export function groundEvidenceItem(action:MeetingAction,source:string):GroundedMeetingAction{
 const notes:string[]=[];
 const original=action.evidence.trim();
 const offset=original.length>=12?source.indexOf(original):-1;
 const normalizedFound=offset<0&&original.length>=12?normalizedOffset(source,original):-1;
 const grounding:GroundingOutcome=offset>=0?"exact":normalizedFound>=0?"normalized":"unverified";
 if(grounding==="unverified")notes.push("Trecho de evidência não localizado na transcrição original.");
 if(grounding==="normalized")notes.push("Trecho localizado com diferenças de formatação; confira o contexto.");
 const result:GroundedMeetingAction={...action,grounding,sourceOffset:offset>=0?offset:normalizedFound>=0?normalizedFound:null,verificationNotes:notes};
 if(grounding==="unverified"){
  result.kind="review";result.included=false;result.owner="";result.status="a_confirmar";
 }
 return result;
}
export function verifyMeetingEvidence(evidence:MeetingEvidence,blocks:string[]):GroundingReport{
 const actions=evidence.actions.map(action=>groundEvidenceItem(action,blocks[action.sourceBlock-1]??""));
 return {total:actions.length,verified:actions.filter(a=>a.grounding!=="unverified").length,
  unverified:actions.filter(a=>a.grounding==="unverified").length,actions};
}
