/**
 * Extract decision-specific text from an older Kairos executive report.
 * The complete original remains available for audit; this function never
 * changes persisted data and never infers a decision when none is marked.
 */
export function extractDecisionSection(source:string):string {
 const lines=source.replace(/\r\n/g,"\n").split("\n");
 const heading=/^\s*(?:#{1,6}\s*)?(?:\*\*)?decis(?:ã|a)o(?:\s+(?:sugerida|proposta|registrada|para registrar|tomada))?(?:\*\*)?\s*:?\s*$/i;
 const idx=lines.findIndex(line=>heading.test(line.trim()));
 if(idx<0)return "";
 const output:string[]=[];
 for(const line of lines.slice(idx+1)){
  const trimmed=line.trim();
  if(/^(?:#{1,6}\s+|\*\*[^*]+\*\*\s*$)/.test(trimmed)&&output.some(x=>x.trim()))break;
  if(/^\s*(?:riscos?|pendências|compromissos|situação geral|próximos passos)\s*:/i.test(trimmed))break;
  output.push(line);
  if(output.join("\n").length>4000)break;
 }
 return output.join("\n").trim().slice(0,4000);
}
export function normalizeDecisionText(value:string):{display:string;hasEmbeddedReport:boolean}{
 const report=/(?:^|\n)\s*#{1,6}\s+(?:status report|resumo executivo|avanços|pendências|situação geral|riscos? e impedimentos)/i.test(value);
 if(!report)return {display:value,hasEmbeddedReport:false};
 const extracted=extractDecisionSection(value);
 return {display:extracted||"Este registro contém um relatório original sem uma decisão isolada identificável.",hasEmbeddedReport:true};
}
