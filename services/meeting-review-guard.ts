import {isSpeakerPlaceholder,type MeetingEvidence} from "@/services/meeting-evidence";

export type MeetingReviewFlag={code:"LEADERSHIP_IDENTITY"|"UNVERIFIED_ATTENDEE";message:string;severity:"critical"|"warning"};
const leadership=/\b(lideran[cç]a|assum(?:iu|ir|indo|ido)?|substitui[cç][aã]o|substitu(?:indo|iu|ir)|condu[cç][aã]o|respons[aá]vel|coordena[cç][aã]o)\b/i;
const hasNameNearLeadership=(sentence:string)=>/\bVarela\b/i.test(sentence)&&leadership.test(sentence);

/** Avoid assigning a named person to a speaker who was never verified.
 * Generated claims are not evidence. This function is intentionally conservative.
 */
export function guardMeetingNarrative(value:string):{text:string;flagged:boolean}{
 let flagged=false;
 const text=value.split(/(?<=[.!?])\s+/).map(sentence=>{
  if(!hasNameNearLeadership(sentence))return sentence;
  flagged=true;
  return "Foi relatada uma mudança de responsabilidade na condução do projeto em relação a Varela; a identidade do novo responsável exige confirmação.";
 }).join(" ");
 return {text,flagged};
}
export function reviewMeetingEvidence(evidence:MeetingEvidence):MeetingReviewFlag[]{
 const flags:MeetingReviewFlag[]=[];
 const leadershipActions=evidence.actions.filter(a=>hasNameNearLeadership(a.title+" "+a.evidence));
 if(leadershipActions.length){
  for(const action of leadershipActions)action.owner=""; // Speaker identity cannot be deduced from a nearby name.
  flags.push({code:"LEADERSHIP_IDENTITY",severity:"critical",
   message:"A transcrição menciona mudança na liderança, mas não confirma de forma verificável a identidade do falante. Confira a pessoa responsável antes de aprovar a ata."});
 }
 const unverified=evidence.participantsConfirmed.some(isSpeakerPlaceholder);
 if(unverified)flags.push({code:"UNVERIFIED_ATTENDEE",severity:"warning",
  message:"Identificadores de palestrantes não comprovam nomes. Confirme participantes nominalmente."});
 evidence.participantsConfirmed=evidence.participantsConfirmed.filter(p=>!isSpeakerPlaceholder(p));
 return flags;
}
