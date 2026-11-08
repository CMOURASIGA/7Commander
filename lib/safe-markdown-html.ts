/**
 * Safe formatting for Kairos text in exported project reports.
 * Escape all source text before inserting trusted formatting tags.
 */
const escapeHtml=(input:string)=>input.replace(/[&<>"']/g,char=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]||char));
function inline(source:string):string{
 const escaped=escapeHtml(source);
 return escaped
  .replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>")
  .replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g,"$1<em>$2</em>");
}
export function safeMarkdownHtml(input:string):string{
 const lines=String(input||"").replace(/\r\n/g,"\n").split("\n");
 const output:string[]=[];
 let list:"ol"|"ul"|null=null;
 const close=()=>{if(list){output.push("</"+list+">");list=null;}};
 for(const rawLine of lines){
  const line=rawLine.trim();
  if(!line){close();continue;}
  const heading=/^#{1,6}\s+(.+)$/.exec(line);
  if(heading){close();output.push("<h4>"+inline(heading[1])+"</h4>");continue;}
  const numbered=/^\d+\.\s+(.+)$/.exec(line);
  const bullet=/^[-*]\s+(.+)$/.exec(line);
  if(numbered||bullet){
   const target=numbered?"ol":"ul";
   if(list!==target){close();output.push("<"+target+">");list=target;}
   output.push("<li>"+inline((numbered||bullet)![1])+"</li>");
   continue;
  }
  close();output.push("<p>"+inline(line)+"</p>");
 }
 close();return output.join("");
}
