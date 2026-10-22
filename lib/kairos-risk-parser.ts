export type RiskDraft = { title:string; description:string; selected:boolean };
export function parseRiskDrafts(markdown:string):RiskDraft[]{
 const lines=markdown.replace(/\r/g,"").split("\n");const out:RiskDraft[]=[];
 const header=/^\s*(?:[-*+]\s*)?(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:\*\*)?([^\n:]{3,100}?)(?:\*\*)?\s*:\s*(?:\*\*)?\s*$/;
 const bullet=/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/;
 let current:RiskDraft|null=null;
 const close=()=>{if(current){current.description=current.description.trim();if(current.title.length>=3)out.push(current);}current=null;};
 for(const line of lines){
 const h=line.match(header);
 if(h){close();current={title:h[1].replace(/\*\*/g,"").trim(),description:"",selected:true};continue;}
 if(current){
  const b=line.match(bullet);
  const v=(b?b[1]:line.trim()).replace(/^\*\*|\*\*$/g,"").trim();
  if(v)current.description+=(current.description?"\n":"")+v;
 }
 }
 close();
 return out.length>=2?out.slice(0,50):[];
}
