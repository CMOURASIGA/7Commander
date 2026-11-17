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

/**
 * Output guard for unsupported aggregate severity assertions.
 * The risk registry exposes probability and impact but does not carry a verified
 * per-risk "critical" severity. Preserve facts and avoid inventing a rating.
 */
export function correctUnsupportedAggregateRiskSeverity(
  answer:string,
  risks:Array<{status:string}>,
):string{
  if(!risks.length)return answer;
  const total=risks.length;
  const words:Record<number,string>={1:"um",2:"dois",3:"três",4:"quatro",5:"cinco",6:"seis",7:"sete",8:"oito",9:"nove",10:"dez"};
  const countPattern=[String(total),words[total]].filter(Boolean).join("|");
  if(!countPattern)return answer;
  // Only correct blanket claims covering *all* fetched risks; individual
  // evidence-backed ratings should be evaluated by the risk matrix.
  const quantity=new RegExp("(\\b(?:"+countPattern+")\\s+riscos)\\s+cr[ií]ticos\\b","gi");
  const all=/\b(todos\s+os\s+riscos)\s+(?:s[aã]o|est[aã]o|foram\s+classificados\s+como)\s+cr[ií]ticos\b/gi;
  const label="cadastrados";
  return answer
    .replace(quantity,(_match,phrase:string)=>phrase+" "+label)
    .replace(all,"todos os riscos estão cadastrados, mas a criticidade individual não foi comprovada");
}
