import {expect,test} from "@playwright/test";
import {riskReportHtml} from "../../lib/reports/risk-report-html";
import {isVagueNextStep} from "../../lib/reports/editorial-rules";
import type {ReportRiskAssessment} from "../../lib/scrum/report-data";

function fixtures(count:number):ReportRiskAssessment[]{
 return Array.from({length:count},(_,index)=>{
  const p=((index%3)+1) as 1|2|3;
  const impact=((Math.floor(index/3)%3)+1) as 1|2|3;
  const score=p*impact;
  const severity=score===9?"Crítico":score===6?"Alto":score>=3?"Moderado":"Baixo";
  return {
   id:"11111111-2222-4333-8444-"+String(index+1).padStart(12,"0"),
   code:"R-"+String(index+1).padStart(12,"0"),
   title:"Risco "+(index+1),
   description:"Atraso possível nos marcos. Medida: revisitar dependências",
   status:"aberto",probability:p,impact,score,severity,
   owner:"Pessoa interna",mitigation:"Plano reservado para equipe",
   decisionId:null,taskId:null,lastUpdated:null
  };
 });
}

for(const size of [0,1,5,7,15]){
 test("REP-02 renders "+size+" risks for both audiences",()=>{
  const risks=fixtures(size);
  const team=riskReportHtml(risks,"internal");
  const client=riskReportHtml(risks,"client");
  expect(team).toContain("Como ler a matriz");
  expect(team).toContain("Probabilidade");
  expect(team).toContain("Baixo 1–2");
  expect(team).toContain("Moderado 3–4");
  expect(team).toContain("Alto 6");
  expect(team).toContain("Crítico 9");
  expect(team).toContain("não corresponde a percentual");
  expect(team).toContain("Gestão de riscos");
  if(size>0){expect(team).toContain("Próxima ação registrada");expect(team).toContain("Ver plano completo");}
  expect(client).not.toContain("P × I");
  expect(client).not.toContain("Como ler a matriz");
  expect(client).not.toContain("Pessoa interna");
  expect(client).not.toContain("Plano reservado para equipe");
  expect(client).not.toContain("R-000000000001");
  if(size>0){expect(client).not.toContain("<table");expect(client).toContain("Riscos visíveis: 0");}
  const ids=[...team.matchAll(/<td>(R-\d{12})<\/td>/g)].map(match=>match[1]);
  expect(ids).toHaveLength(size);
  for(const id of ids)expect(team).toContain(id);
  expect((client.match(/<td>Risco \d+<\/td>/g)||[]).length).toBe(0);
  if(size===0){
   expect(client).toContain("não significa ausência de exposição");
   expect(team).toContain("Não há avaliações de riscos formalizadas");
  }
 });
}

test("REP-02 never invents a score for incomplete risk evaluation",()=>{
 const data=fixtures(1);
 data[0]={...data[0],probability:null,score:null,severity:"Não avaliado"};
 const team=riskReportHtml(data,"internal");
 expect(team).toContain("Não avaliado");
 expect(team).not.toContain("P 1 × I 1 = 1");
});

test("REP-02 escapes untrusted risk and mitigation text",()=>{
 const data=fixtures(1);
 data[0]={...data[0],title:'<script>alert("bad")</script>',description:'<img src=x onerror=alert(1)>',mitigation:'<b>injected</b>'};
 const html=riskReportHtml(data,"internal");
 const client=riskReportHtml(data,"client");
 expect(html).not.toContain("<script>");
 expect(html).not.toContain("<b>injected</b>");
 expect(client).not.toContain("<img src=x");
 expect(client).not.toContain("Pessoa interna");
});

test("REP-02 uses same score and severity in matrix and team row",()=>{
 const data=fixtures(1);
 data[0]={...data[0],probability:3,impact:3,score:9,severity:"Crítico"};
 const html=riskReportHtml(data,"internal");
 expect(html).toContain("Crítico · 9");
 expect(html).toContain("Crítico");
 expect(html).toContain("R-000000000001");
});

test("REP-03 client uses only structured authorized measures and never guesses implementation status",()=>{
 const data=fixtures(1);
 data[0]={...data[0],description:"Ponto de atenção: Validação das entregas\nConsequência: atraso de homologação\nMedida: executar validação técnica\nSituação da medida: planejada"};
 const client=riskReportHtml(data,"client");
 expect(client).toContain("atraso de homologação");
 expect(client).toContain("executar validação técnica");
 expect(client).toContain("Situação da medida:");
 expect(client).not.toContain("Plano reservado para equipe");
 data[0].description="Ponto de atenção: Indisponibilidade operacional\nConsequência: indisponibilidade operacional";
 const missing=riskReportHtml(data,"client");
 expect(missing).not.toContain("Medida ainda não comunicada");
 expect(missing).not.toContain("Revisar internamente");
});
test("REP-03 operational rows exclude mitigation text except in HTML details and optional annex",()=>{
 const risk=fixtures(1)[0];
 risk.mitigation="Validar controle de acesso. Executar plano extenso com documentação e validações.";
 const html=riskReportHtml([risk],"internal");
 expect(html).toContain("Ver plano completo");
 expect(html).toContain("Validar controle de acesso.");
 expect(html).not.toContain("class=\"risk-annex\"");
 expect(riskReportHtml([risk],"internal",{includeMitigationAnnex:true})).toContain("Anexo opcional");
});

test("REP-03.8 blocks incomplete client risks and accepts fully approved executive fields",()=>{
 const entry=fixtures(1)[0];
 entry.description="Ponto de atenção: Integração das funcionalidades\nConsequência: Atraso na validação das entregas\nMedida: Realizar teste integrado\nSituação da medida: planejada";
 const output=riskReportHtml([entry],"client");
 expect(output).toContain("Integração das funcionalidades");
 expect(output).toContain("Atraso na validação das entregas");
 expect(output).toContain("Realizar teste integrado");
 expect(output).toContain("planejada");
 entry.description="Ponto de atenção: Integração das funcionalidades";
 expect(riskReportHtml([entry],"client")).not.toContain("client-risk-table");
});

test("REP-03.8 recognizes vague client action but permits concrete follow-up",()=>{
 expect(isVagueNextStep("Reunião com equipe","para ver se conseguimos dar prosseguimento às atividades")).toBe(true);
 expect(isVagueNextStep("Executar testes integrados","Confirmar integração antes da homologação")).toBe(false);
});

test("REP-03.9 a source-backed approval can omit consequence and mitigation execution stage",()=>{
 const risk=fixtures(1)[0];
 risk.description="Ponto de atenção: Rastreabilidade do processamento de dados\nMedida registrada: Implantar registros de auditoria das pipelines ETL";
 const result=riskReportHtml([risk],"client");
 expect(result).toContain("Riscos visíveis: 1");
 expect(result).toContain("Rastreabilidade do processamento de dados");
 expect(result).toContain("Implantar registros de auditoria");
 expect(result).not.toContain("Possível consequência:");
 expect(result).not.toContain("Situação da medida:");
 expect(result).not.toContain("Medida ainda não comunicada");
 expect(result).not.toContain("Plano reservado para equipe");
 expect(result).toContain("Crítico"===risk.severity?"Crítico":risk.severity);
});
test("REP-03.9 missing source mitigation does not yield a blank table column",()=>{
 const risk=fixtures(1)[0];
 risk.description="Ponto de atenção: Monitoramento do processo de dados";
 const result=riskReportHtml([risk],"client");
 expect(result).toContain("Riscos visíveis: 1");
 expect(result).toContain("Monitoramento do processo de dados");
 expect(result).not.toContain("<table");
 expect(result).not.toContain("Medida registrada:");
});
