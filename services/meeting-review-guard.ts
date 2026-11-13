import {isSpeakerPlaceholder,type MeetingEvidence} from "@/services/meeting-evidence";

export type MeetingReviewFlag={code:"LEADERSHIP_IDENTITY"|"UNVERIFIED_ATTENDEE";message:string;severity:"critical"|"warning"};
const leadership=/\b(lideran[cç]a|assum(?:iu|ir|indo|ido)?|substitui[cç][aã]o|substitu(?:indo|iu|ir)|condu[cç][aã]o|respons[aá]vel|coordena[cç][aã]o)\b/i;
const hasNameNearLeadership=(sentence:string)=>/\bVarela\b/i.test(sentence)&&leadership.test(sentence);

const namedLeadershipAssertion=(sentence:string)=>
 /\b(?:assun[cç][aã]o|nomea[cç][aã]o|designa[cç][aã]o)\s+(?:formal\s+)?de\s+[A-ZÀ-Ý][\p{L}]+(?:\s+[A-ZÀ-Ý][\p{L}]+){0,3}\s+(?:[àa]\s+frente|como\s+(?:novo|nova)?\s*(?:respons[aá]vel|l[ií]der|gestor|gestora|coordenador))/iu.test(sentence)
 || /\b[A-ZÀ-Ý][\p{L}]+(?:\s+[A-ZÀ-Ý][\p{L}]+){0,3}\s+(?:assumiu|assume|assumir[aá]|passou\s+a\s+(?:liderar|conduzir|gerir)|foi\s+(?:nomead[oa]|designad[oa]))\b.{0,75}\b(?:projeto|frente|lideran[cç]a|respons[aá]vel|gest[aã]o|coordena[cç][aã]o)\b/iu.test(sentence)
 || /\b(?:novo|nova)\s+(?:respons[aá]vel|gestor|gestora|l[ií]der)\s+(?:[ée]|ser[aá])\s+[A-ZÀ-Ý][\p{L}]+/iu.test(sentence);

/** Avoid assigning a named person to a speaker who was never verified.
 * Generated claims are not evidence. This function is intentionally conservative.
 */
export function guardMeetingNarrative(value:string):{text:string;flagged:boolean}{
 let flagged=false;
 const text=value.split(/(?<=[.!?])\s+/).map(sentence=>{
  if(!hasNameNearLeadership(sentence)&&!namedLeadershipAssertion(sentence))return sentence;
  flagged=true;
  return "Foi relatada uma mudança de responsabilidade na condução do projeto em relação a Varela; a identidade do novo responsável exige confirmação.";
 }).join(" ");
 return {text,flagged};
}
export function reviewMeetingEvidence(evidence:MeetingEvidence):MeetingReviewFlag[]{
 const flags:MeetingReviewFlag[]=[];
 const leadershipActions=evidence.actions.filter(a=>hasNameNearLeadership(a.title+" "+a.evidence));
 if(leadershipActions.length){
  for(const action of leadershipActions){
   action.owner=""; // Speaker identity cannot be deduced from a nearby name.
   action.kind="context"; // Handover is a meeting fact, not an automatically assigned task.
   action.status="a_confirmar";
   action.included=false;
  }
  flags.push({code:"LEADERSHIP_IDENTITY",severity:"critical",
   message:"A transcrição menciona mudança na liderança, mas não confirma de forma verificável a identidade do falante. Confira a pessoa responsável antes de aprovar a ata."});
 }
 // Classify as context events that happened inside the call, not future work.
 // Conservatively target explicit screen-sharing and a question with no accepted action.
 for(const action of evidence.actions){
  if(action.kind!=="operational")continue;
  const screenShare=/\b(compartilh(?:ar|amento) (?:a |da |de )?tela|abrir (?:a )?tela|mostrar (?:a )?tela)\b/i.test(action.title);
  const inCall=/\b(agora|aqui|nesse momento|durante a reunião|só um segundo)\b/i.test(action.evidence);
  const singleQuestion=action.evidence.trim().endsWith("?")
   && !/\b(vou|vamos|ficou combinado|me comprometo|encaminharei|enviarei)\b/i.test(action.evidence);
  // A requirement about the application's fiscal behavior is not evidence that
  // an individual accepted a future delivery.
  const requirementsLanguage=/\b(?:tem que|deve(?:mos)?|precisa(?:mos)?|necess[aá]rio|obrigat[oó]rio)\b/i.test(action.evidence);
  const fiscalSpecification=/\b(?:nota(?:s)? (?:fiscais?|de entrada)|ressarcimento|substitui[cç][aã]o tribut[aá]ria|ICMS|SPED|EFD)\b/i.test(action.title);
  const explicitCommitment=/\b(?:eu vou|n[oó]s vamos (?:enviar|entregar|implementar|corrigir)|ficou combinado|me comprometo|irei encaminhar)\b/i.test(action.evidence);
  if(requirementsLanguage&&fiscalSpecification&&!explicitCommitment){
   action.kind="business_rule";action.status="a_confirmar";action.included=false;
   continue;
  }
  if((screenShare&&inCall)||singleQuestion){
   action.kind="context";
   action.status="a_confirmar";
   action.included=false;
  }
 }
 const unverified=evidence.participantsConfirmed.some(isSpeakerPlaceholder);
 if(unverified)flags.push({code:"UNVERIFIED_ATTENDEE",severity:"warning",
  message:"Identificadores de palestrantes não comprovam nomes. Confirme participantes nominalmente."});
 evidence.participantsConfirmed=evidence.participantsConfirmed.filter(p=>!isSpeakerPlaceholder(p));
 return flags;
}

/** Only an explicit attendee roster can populate nominal attendance automatically.
 * A name mentioned in a discussion is not proof of participation.
 */
export function explicitAttendeeRoster(source:string):string[]{
 const result:string[]=[];
 for(const line of source.split(/\r?\n/)){
  const match=line.trim().match(/^(?:participantes(?: presentes)?|presentes|attendees)\s*:\s*(.+)$/i);
  if(!match)continue;
  for(const item of match[1].split(/[;,]+/)){
   const name=item.trim();
   if(name&&name.length<=100&&!isSpeakerPlaceholder(name)&&!/\d/.test(name))result.push(name);
  }
 }
 return Array.from(new Set(result));
}
