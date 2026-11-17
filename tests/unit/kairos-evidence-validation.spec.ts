import {test,expect} from "@playwright/test";
import {validateOfficialRiskReferences,correctUnsupportedAggregateRiskSeverity} from "../../lib/kairos-evidence-validation";

const refs=[
 {id:"risk-1",code:"R001",title:"Ausência de ambiente de homologação do Vita Primo"},
 {id:"risk-6",code:"R006",title:"Aprovação do protótipo sem validação da viabilidade operacional da solução"},
];

test("official risk codes and titles are accepted",()=>{
 const answer="Título: Ausência de ambiente de homologação do Vita Primo\nProbabilidade: Alta\nImpacto: Alto\nIdentificador: R001\n";
 expect(validateOfficialRiskReferences(answer,refs,true)).toEqual({valid:true,errors:[]});
});

test("invented official code is blocked",()=>{
 const result=validateOfficialRiskReferences("Identificador: R999",refs,true);
 expect(result.valid).toBe(false);
});

test("R001/R006 title mismapping is blocked even across lines",()=>{
 const answer="Título: Aprovação do protótipo sem validação da viabilidade operacional da solução\nClassificação: confirmada\nProbabilidade: Alta\nImpacto: Alto\nIdentificador: R001";
 const result=validateOfficialRiskReferences(answer,refs,true);
 expect(result.valid).toBe(false);
 expect(result.errors.some(issue=>issue.includes("R006"))).toBe(true);
});

test("unknown code source fails closed",()=>{
 expect(validateOfficialRiskReferences("R001",refs,false).valid).toBe(false);
});

test("absence of official codes may be disclosed without fabricating codes",()=>{
 expect(validateOfficialRiskReferences("Código oficial não disponível.",refs,false).valid).toBe(true);
});

test("natural answer cannot claim all six retrieved risks are critical without verified severity",()=>{
 const risks=Array.from({length:6},()=>({status:"aberto"}));
 const original="Atualmente, seis riscos críticos estão abertos:";
 const answer=correctUnsupportedAggregateRiskSeverity(original,risks);
 expect(answer).toBe("Atualmente, seis riscos cadastrados estão abertos:");
});
test("aggregate risk guard preserves individual factual statements and recommendations",()=>{
 const risks=Array.from({length:6},()=>({status:"aberto"}));
 const answer=correctUnsupportedAggregateRiskSeverity("R001 requer avaliação crítica. Existem seis riscos críticos.",risks);
 expect(answer).toContain("R001 requer avaliação crítica.");
 expect(answer).toContain("seis riscos cadastrados.");
});
test("aggregate risk guard does not apply when risk source is empty",()=>{
 expect(correctUnsupportedAggregateRiskSeverity("seis riscos críticos",[])).toBe("seis riscos críticos");
});
