import type {ReportAudience,ReportRiskAssessment} from "@/lib/scrum/report-data";

function escapeHtml(value:unknown):string{
 const chars:Record<string,string>={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
 return String(value??"").replace(/[&<>"']/g,c=>chars[c]||c);
}
const clean=(value:string|null|undefined)=>String(value||"").trim();
const compact=(value:string,max=100)=>{const txt=clean(value).replace(/\s+/g," ");return txt.length>max?txt.slice(0,max-1).replace(/\s+\S*$/,"")+"…":txt;};
const severityOrder:Record<string,number>={"Crítico":0,"Alto":1,"Moderado":2,"Baixo":3,"Não avaliado":4};
function sortedRisks(risks:ReportRiskAssessment[]){
 return [...risks].sort((a,b)=>(severityOrder[a.severity]??5)-(severityOrder[b.severity]??5)||
  (b.score??-1)-(a.score??-1)||a.title.localeCompare(b.title,"pt-BR")||a.id.localeCompare(b.id));
}
function shortAction(mitigation:string|null){
 const raw=clean(mitigation);
 if(!raw)return "";
 const sentence=raw.split(/(?<=[.!?])\s+|\n+/).find(x=>x.trim())||raw;
 return compact(sentence,105);
}
export function getApprovedRiskFields(text:string){
 const blocks=String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const point=blocks.find(x=>/^(?:ponto de atenção|risco executivo)\s*:/i.test(x));
 const consequence=blocks.find(x=>/^(?:consequência|consequencia|possível consequência|impacto para o cliente)\s*:/i.test(x));
 const measure=blocks.find(x=>/^(?:medida(?: registrada)?|mitigação|mitigacao|ação prevista|plano)\s*:/i.test(x));
 const status=blocks.find(x=>/^(?:situação da medida|status da mitigação)\s*:/i.test(x));
 const trimLabel=(x?:string)=>x?.replace(/^[^:]+:\s*/,"").trim()||"";
 return {point:trimLabel(point),consequence:trimLabel(consequence),measure:trimLabel(measure),measureStatus:trimLabel(status)};
}
export function riskReportHtml(risks:ReportRiskAssessment[],audience:ReportAudience,options:{includeMitigationAnnex?:boolean}={}){
 const esc=escapeHtml;
 const sorted=sortedRisks(risks);
 const clientVisible=audience==="client"?sorted.filter(r=>Boolean(getApprovedRiskFields(r.description).point)):sorted;
 const rated=sorted.filter(r=>r.score!==null);
 const count=(severity:string)=>clientVisible.filter(r=>r.severity===severity).length;
 const summary='<p class="risk-summary">Riscos visíveis: '+clientVisible.length+' · Críticos: '+count("Crítico")+' · Altos: '+count("Alto")+' · Moderados: '+count("Moderado")+' · Baixos: '+count("Baixo")+' · Não avaliados: '+count("Não avaliado")+'.</p>';
 const empty='<p class="empty">Não há avaliações de riscos formalizadas nesta seleção. Isso não significa ausência de exposição; recomenda-se uma revisão.</p>';
 if(audience==="client"){
  const top=clientVisible.slice(0,5);
  // Only approved, available facts are shown. Optional consequence and execution
  // stage do not become mandatory because the source risk has no such fields.
  const cards=top.map(r=>{
   const {point,consequence,measure,measureStatus}=getApprovedRiskFields(r.description);
   return '<article class="item client-risk-item"><div class="client-risk-head"><strong>'+esc(compact(point||r.title,115))+'</strong><b>'+esc(r.severity)+'</b></div>'+
      (consequence?'<p><b>Possível consequência:</b> '+esc(consequence)+'</p>':"")+
      (measure?'<p><b>Medida registrada:</b> '+esc(measure)+'</p>':"")+
      (measureStatus?'<p><b>Situação da medida:</b> '+esc(measureStatus)+'</p>':"")+
      '</article>';
  }).join("");
  return '<section class="panel risk-panel"><h3>04 · Riscos relevantes</h3><h2>Riscos e Planos de Mitigação</h2>'+summary+
   (top.length?'<div class="client-risk-list">'+cards+'</div>':empty)+
   (clientVisible.length>5?'<p class="muted">Cinco riscos autorizados de maior prioridade apresentados. Outros registros permanecem no cadastro do projeto.</p>':"")+
   (top.some(r=>getApprovedRiskFields(r.description).measure&&!getApprovedRiskFields(r.description).measureStatus)?'<p class="muted">As medidas citadas constam do registro do projeto. Sua execução não está confirmada nesta emissão.</p>':"")+
   '</section>';
 }
 const rows=sorted.map(r=>{
  const action=shortAction(r.mitigation);
  const label=r.code;
  const detail=clean(r.mitigation);
  return '<tr id="risk-'+esc(r.id)+'"><td>'+esc(label)+'</td><td>'+esc(compact(r.title,110))+'</td><td><strong>'+esc(r.severity)+'</strong></td><td>'+esc(r.owner||"Não definido")+'</td><td>'+esc(r.status.replaceAll("_"," "))+'</td><td>'+esc(action||"Sem ação registrada")+'</td></tr>'+
   (detail?'<tr class="risk-detail-row pdf-hide"><td colspan="6"><details><summary>Ver plano completo · '+esc(label)+'</summary><p>'+esc(detail)+'</p></details></td></tr>':"");
 }).join("");
 const cells=[3,2,1].map(p=>'<tr><th scope="row">P '+p+'</th>'+[1,2,3].map(i=>{
  const score=p*i,severity=score===9?"Crítico":score===6?"Alto":score>=3?"Moderado":"Baixo";
  const matches=rated.filter(r=>r.probability===p&&r.impact===i);
  return '<td class="risk-cell risk-'+severity.toLowerCase().replace("í","i")+'"><b>'+esc(severity)+' · '+score+'</b><div>'+matches.map(r=>'<a class="risk-code" href="#risk-'+esc(r.id)+'" title="'+esc(r.title)+'">'+esc(r.code)+'</a>').join("")+'</div></td>';
 }).join("")+'</tr>').join("");
 const annex=options.includeMitigationAnnex&&sorted.some(r=>clean(r.mitigation))?'<section class="panel risk-annex"><h3>Anexo opcional</h3><h2>Planos de mitigação completos</h2>'+sorted.filter(r=>clean(r.mitigation)).map(r=>'<div class="item"><div><b>'+esc(r.code)+' · '+esc(r.title)+'</b><p>'+esc(r.mitigation)+'</p></div></div>').join("")+'</section>':"";
 return '<section class="panel risk-panel"><h3>04 · Gestão de riscos</h3><h2>Riscos e Planos de Mitigação</h2>'+summary+
 (rated.length?'<div class="report-table-wrap"><table class="risk-matrix" aria-label="Matriz de probabilidade por impacto"><thead><tr><th>P / I</th><th>Impacto 1</th><th>Impacto 2</th><th>Impacto 3</th></tr></thead><tbody>'+cells+'</tbody></table></div>':'<p class="empty">Matriz não disponível: não há avaliações suficientes de probabilidade e impacto.</p>')+
 '<div class="risk-legend" role="note"><b>Como ler a matriz</b><p><b>P</b> = Probabilidade: 1 baixa, 2 média, 3 alta. <b>I</b> = Impacto: 1 baixo, 2 médio, 3 alto. <b>P × I</b>: Baixo 1–2, Moderado 3–4, Alto 6, Crítico 9.</p><p>Exemplo: P 3 e I 3 = 9, risco crítico que exige priorização. A classificação é gerencial e não corresponde a percentual estatístico de ocorrência.</p></div>'+
 (sorted.length?'<div class="report-table-wrap"><table class="report-table operational-risk-table"><thead><tr><th>Identificação</th><th>Risco</th><th>Criticidade</th><th>Responsável</th><th>Status</th><th>Próxima ação registrada</th></tr></thead><tbody>'+rows+'</tbody></table></div>':empty)+
 '<p class="muted">As ações são resumos de planos registrados, sem confirmação automática de execução ou prazo. Tendência não disponível sem avaliações históricas comparáveis.</p></section>'+annex;
}
