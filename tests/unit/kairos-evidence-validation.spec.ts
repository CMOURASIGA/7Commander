import {test,expect} from "@playwright/test";
import {validateOfficialRiskReferences} from "../../lib/kairos-evidence-validation";

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
