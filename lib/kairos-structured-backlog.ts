/** Parse a *proposal*, never persist records from arbitrary AI text. */
export type BacklogEpic={code:string;title:string};
export type BacklogFeature={code:string;title:string;epicCode:string};
export type BacklogStory={code:string;title:string;featureCode:string;epicCode:string;description:string;acceptanceCriteria:string;priority:"baixa"|"media"|"alta"|"critica"};
export type BacklogProposal={epics:BacklogEpic[];features:BacklogFeature[];stories:BacklogStory[]};
const clean=(s:string)=>s.replace(/<br\s*\/?\s*>/gi,"\n").replace(/\*\*/g,"").replace(/<[^>]*>/g,"").trim().slice(0,10000);
const norm=(s:string)=>clean(s).toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const tagged=(input:string,prefix:"EP"|"F"|"US")=>{
 const re=prefix==="US"?/\bUS\s*[- ]?\s*(\d{1,4})\s*[:.\-|]?\s*(.*)/i:
  new RegExp("\\b"+prefix+"\\s*[- ]?\\s*(\\d{1,4})\\s*[:.\\-|]?\\s*(.*)","i");
 const match=clean(input).match(re);
 return match?{code:prefix+match[1].padStart(prefix==="EP"?2:3,"0"),title:clean(match[2]||"")}:null;
};
const priority=(value:string):BacklogStory["priority"]=>{
 const n=norm(value);
 return /\b(p0|critica|critico)\b/.test(n)?"alta":
 /\b(p2|baixa|baixo)\b/.test(n)?"baixa":
 /\b(p1|media|medio)\b/.test(n)?"media":"media";
};
function parseTable(content:string):BacklogProposal|null{
 const lines=content.split(/\r?\n/).filter(line=>line.trim().startsWith("|")&&line.trim().endsWith("|"));
 const rows=lines.map(line=>line.trim().slice(1,-1).split(/(?<!\\)\|/).map(clean));
 const headerIndex=rows.findIndex(row=>row.some(col=>norm(col)==="epico")&&row.some(col=>norm(col).includes("feature"))&&row.some(col=>norm(col).includes("titulo")));
 if(headerIndex<0)return null;
 const header=rows[headerIndex].map(norm);
 const index=(check:(value:string)=>boolean)=>header.findIndex(check);
 const e=index(v=>v.includes("epico")),f=index(v=>v.includes("feature")),u=index(v=>v.includes("codigo da us")||v.includes("codigo us")||v==="us"),t=index(v=>v==="titulo"||v==="us titulo"||v==="titulo da us"),d=index(v=>v==="descricao"),a=index(v=>v.includes("criterio")),p=index(v=>v.includes("prioridade"));
 if([e,f,u,t].some(i=>i<0))return null;
 const epics=new Map<string,BacklogEpic>(),features=new Map<string,BacklogFeature>(),stories=new Map<string,BacklogStory>();
 let lastEpic:ReturnType<typeof tagged>=null,lastFeature:ReturnType<typeof tagged>=null;
 for(const row of rows.slice(headerIndex+1)){
  if(row.every(col=>/^[\s:\-]+$/.test(col)))continue;
  if(row.length<header.length-2)continue;
  lastEpic=tagged(row[e]||"","EP")||lastEpic;
  lastFeature=tagged(row[f]||"","F")||lastFeature;
  const us=tagged(row[u]||"","US");
  if(!lastEpic||!lastFeature||!us||!row[t])continue;
  epics.set(lastEpic.code,{code:lastEpic.code,title:lastEpic.title||lastEpic.code});
  features.set(lastFeature.code,{code:lastFeature.code,title:lastFeature.title||lastFeature.code,epicCode:lastEpic.code});
  stories.set(us.code,{
   code:us.code,title:clean(row[t]).slice(0,180),
   featureCode:lastFeature.code,epicCode:lastEpic.code,
   description:d>=0?clean(row[d]||""):"",
   acceptanceCriteria:a>=0?clean(row[a]||""):"",
   priority:p>=0?priority(row[p]||""):"media"
  });
 }
 return stories.size?{epics:[...epics.values()],features:[...features.values()],stories:[...stories.values()]}:null;
}
function parseHeadings(source:string):BacklogProposal|null{
 const epics=new Map<string,BacklogEpic>(),features=new Map<string,BacklogFeature>(),stories:BacklogStory[]=[];
 let currentEpic="",currentFeature="";
 for(const line of source.split(/\r?\n/)){
  const value=clean(line.replace(/^\s*(?:#{1,6}|[-*])\s*/,""));
  const epic=tagged(value,"EP");
  const feature=tagged(value,"F");
  const story=tagged(value,"US");
  if(epic&&/^EP\s*[- ]?\d+/i.test(value)){currentEpic=epic.code;epics.set(epic.code,{code:epic.code,title:epic.title||epic.code});continue;}
  if(feature&&/^F\s*[- ]?\d+/i.test(value)&&currentEpic){currentFeature=feature.code;features.set(feature.code,{code:feature.code,title:feature.title||feature.code,epicCode:currentEpic});continue;}
  if(story&&/^US\s*[- ]?\d+/i.test(value)&&currentEpic&&currentFeature){
   stories.push({code:story.code,title:story.title||story.code,featureCode:currentFeature,epicCode:currentEpic,description:"",acceptanceCriteria:"",priority:"media"});
  }else if(stories.length&&value){
   const last=stories[stories.length-1];
   if(/^crit[eé]rios? de aceite\s*:/i.test(value))last.acceptanceCriteria+=value+"\n";
   else if(last.acceptanceCriteria)last.acceptanceCriteria+=value+"\n";
   else last.description+=value+"\n";
  }
 }
 return stories.length?{epics:[...epics.values()],features:[...features.values()],stories}:null;
}
export function parseStructuredBacklog(source:string):BacklogProposal|null{
 if(typeof source!=="string"||source.length>100000)return null;
 const result=parseTable(source)||parseHeadings(source);
 if(!result||result.stories.length===0||result.epics.length===0||result.features.length===0)return null;
 return result;
}
