import type {ReportAudience,ReportRiskAssessment} from "@/lib/scrum/report-data";

function escapeHtml(value:unknown):string{
 const chars:Record<string,string>={"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"};
 return String(value??"").replace(/[&<>"']/g,character=>chars[character]||character);
}

export function riskReportHtml(risks:ReportRiskAssessment[],audience:ReportAudience){
 const rated=risks.filter(r=>r.score!==null);
 const escape=escapeHtml;
 const sorted=[...risks].sort((a,b)=>(b.score??-1)-(a.score??-1)||a.title.localeCompare(b.title));
 const count=(name:string)=>risks.filter(r=>r.severity===name).length;
 const noExposureNotice='<p class="empty">Não existem avaliações formalizadas nesta seleção. A falta de registros não indica ausência de exposição; é necessária a revisão dos riscos do projeto.</p>';
 const countText='<p class="risk-summary">Riscos nesta versão: '+risks.length+' · Críticos: '+count("Crítico")+' · Altos: '+count("Alto")+' · Moderados: '+count("Moderado")+' · Baixos: '+count("Baixo")+' · Não avaliados: '+count("Não avaliado")+'.</p>';
 if(audience==="client"){
  const top=sorted.slice(0,5);
  const rows=top.map(r=>{
   const approved=String(r.description||"");
   const measure=approved.match(/(?:^|\n)\s*(?:Medida|Mitiga(?:ç|c)(?:ão|ao)|Ação prevista|Plano)\s*:\s*([^\n]+)/i)?.[1]?.trim();
   const impact=approved.replace(/(?:^|\n)\s*(?:Medida|Mitiga(?:ç|c)(?:ão|ao)|Ação prevista|Plano)\s*:[^\n]*/ig,"").trim();
   return '<tr><td>'+escape(r.title)+'</td><td>'+escape(impact||"Impacto não detalhado para divulgação")+'</td><td>'+escape(measure||"Medida ainda não comunicada")+'</td><td>'+escape(r.severity)+' · '+escape(r.status.replaceAll("_"," "))+'</td></tr>';
  }).join("");
  return '<section class="panel risk-panel"><h3>04 · Riscos relevantes</h3><h2>Riscos e Planos de Mitigação</h2>'+countText+
   (risks.length?'<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Ponto de atenção</th><th>Possível impacto</th><th>Medida comunicável</th><th>Criticidade / situação</th></tr></thead><tbody>'+rows+'</tbody></table></div>':noExposureNotice)+
   (risks.length>5?'<p class="muted">Exibidos os cinco riscos prioritários autorizados. '+(risks.length-5)+' outros registros não detalhados nesta síntese.</p>':"")+
   '<p class="muted">As medidas exibidas são informações autorizadas. O estado do risco não confirma a execução da mitigação.</p></section>';
 }
 const cells=[3,2,1].map(p=>'<tr><th scope="row">Prob. '+p+'</th>'+[1,2,3].map(i=>{
  const score=p*i;
  const severity=score===9?"Crítico":score===6?"Alto":score>=3?"Moderado":"Baixo";
  const members=rated.filter(r=>r.probability===p&&r.impact===i);
  return '<td class="risk-cell risk-'+severity.toLowerCase().replace("í","i")+'"><b>'+escape(severity)+' · '+score+'</b><div>'+members.map(r=>'<span class="risk-code" title="'+escape(r.title)+'">'+escape(r.code)+'</span>').join("")+'</div></td>';
 }).join("")+'</tr>').join("");
 const rows=sorted.map(r=>'<tr><td>'+escape(r.code)+'</td><td>'+escape(r.title)+'</td><td>'+(r.score===null?"Não avaliado":"P "+r.probability+" × I "+r.impact+" = "+r.score)+'</td><td>'+escape(r.severity)+'</td><td>'+escape(r.owner||"Não definido")+'</td><td>'+escape(r.status.replaceAll("_"," "))+'</td><td>'+escape(r.mitigation||"Não registrada")+'</td></tr>').join("");
 return '<section class="panel risk-panel"><h3>Gestão de riscos</h3><h2>Riscos e Planos de Mitigação</h2>'+countText+
 (rated.length?'<div class="report-table-wrap"><table class="risk-matrix" aria-label="Matriz de probabilidade por impacto"><thead><tr><th scope="col">P / I</th><th scope="col">Impacto 1</th><th scope="col">Impacto 2</th><th scope="col">Impacto 3</th></tr></thead><tbody>'+cells+'</tbody></table></div>':'<p class="empty">Matriz sem riscos avaliados. A probabilidade e o impacto precisam ser informados para calcular a classificação.</p>')+
 '<div class="risk-legend" role="note" aria-label="Como interpretar a matriz de riscos"><strong>Como ler a matriz</strong><p><b>P</b> = Probabilidade: 1 baixa, 2 média, 3 alta. <b>I</b> = Impacto: 1 baixo, 2 médio, 3 alto. <b>P × I</b> gera a pontuação gerencial: <b>Baixo 1–2</b>, <b>Moderado 3–4</b>, <b>Alto 6</b>, <b>Crítico 9</b>.</p><p>Exemplo: probabilidade alta (3) e impacto alto (3) geram 9, risco crítico que exige priorização da avaliação. A pontuação é um critério gerencial de prioridade, <b>não</b> um percentual ou uma probabilidade estatística de ocorrência.</p></div>'+
 (risks.length?'<div class="report-table-wrap"><table class="report-table"><thead><tr><th>ID</th><th>Risco</th><th>P × I</th><th>Classificação</th><th>Responsável</th><th>Estado</th><th>Mitigação registrada</th></tr></thead><tbody>'+rows+'</tbody></table></div>':noExposureNotice)+
 '<p class="muted">Tendência não disponível: não existem avaliações históricas comparáveis. Data de atualização não equivale a reavaliação formal.</p></section>';
}

