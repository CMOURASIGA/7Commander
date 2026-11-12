/**
 * Fail-closed evidence check for official risk display codes in generated text.
 * Does not judge prose quality or substitute server-side authorization.
 */
export type OfficialRiskReference = {id:string;code:string;title:string};

function normalize(value:string):string{
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
}

export function validateOfficialRiskReferences(
  answer:string,
  references:OfficialRiskReference[],
  codeSourceAvailable:boolean,
):{valid:boolean;errors:string[]}{
  const errors:string[]=[];
  const byCode=new Map(references.map(item=>[item.code.toUpperCase(),item]));
  const mentions=Array.from(answer.matchAll(/\bR\d{3,}\b/gi),match=>match[0].toUpperCase());
  if(mentions.length&&!codeSourceAvailable)errors.push("Códigos foram mencionados sem consulta oficial disponível.");
  for(const code of mentions){
    if(codeSourceAvailable&&!byCode.has(code))errors.push("Código não localizado na fonte oficial: "+code);
  }
  const lines=answer.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const code=line.match(/\bR\d{3,}\b/i)?.[0]?.toUpperCase();
    if(code&&byCode.has(code)){
      const lineText=normalize(line);
      for(const item of references){
        if(item.code!==code && lineText.includes(normalize(item.title))) {
          errors.push(code+" associado ao título do risco "+item.code);
        }
      }
    }
    const titleMatch=line.match(/^\s*(?:[-*]\s*)?(?:\*\*)?T[ií]tulo(?:\*\*)?\s*:\s*(.+?)\s*$/i);
    if(!titleMatch)continue;
    const suppliedTitle=normalize(titleMatch[1].replace(/\*\*/g,""));
    // One risk entry may place its official code several lines after its title.
    const nextLines=lines.slice(i+1,i+9);
    const codeLine=nextLines.find(entry=>/\b(?:identificador|c[oó]digo)\s*[:#]?\s*R\d{3,}\b/i.test(entry));
    const entryCode=codeLine?.match(/\bR\d{3,}\b/i)?.[0]?.toUpperCase();
    if(!entryCode||!byCode.has(entryCode))continue;
    const matched=references.find(item=>normalize(item.title)===suppliedTitle);
    if(matched&&matched.code!==entryCode)errors.push(entryCode+" associado ao título do risco "+matched.code);
  }
  return {valid:errors.length===0,errors:Array.from(new Set(errors))};
}
