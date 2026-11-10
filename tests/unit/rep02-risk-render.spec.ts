import {expect,test} from "@playwright/test";
import {riskReportHtml} from "../../lib/reports/risk-report-html";
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
  expect(team).toContain("não</b> um percentual");
  expect(team).toContain("Gestão de riscos");
  if(size>0)expect(team).toContain("Mitigação registrada");
  expect(client).not.toContain("P × I");
  expect(client).not.toContain("Como ler a matriz");
  expect(client).not.toContain("Pessoa interna");
  expect(client).not.toContain("Plano reservado para equipe");
  expect(client).not.toContain("R-000000000001");
  if(size>0){expect(client).toContain("Ponto de atenção");expect(client).toContain("Medida comunicável");}
  const ids=[...team.matchAll(/<td>(R-\d{12})<\/td>/g)].map(match=>match[1]);
  expect(ids).toHaveLength(size);
  for(const id of ids)expect(team).toContain(id);
  expect((client.match(/<td>Risco \d+<\/td>/g)||[]).length).toBe(Math.min(size,5));
  if(size===0){
   expect(client).toContain("não indica ausência de exposição");
   expect(team).toContain("Não existem avaliações formalizadas");
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
 expect(html).toContain("P 3 × I 3 = 9");
 expect(html).toContain("R-000000000001");
});
