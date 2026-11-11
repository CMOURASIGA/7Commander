import { test, expect } from "@playwright/test";
import { riskLevel, riskSeverity } from "../../components/projects/project-overview";

const risk=(impact:string,probability:string)=>({
 id:"risk-test",title:"Risco de validação",impact,probability,mitigation:"",owner:"",status:"aberto",decisionId:null,taskId:null
});

test("matriz normaliza impacto e probabilidade sem supor avaliações ausentes",()=>{
 expect(riskLevel("Alto")).toBe(3);
 expect(riskLevel("Média")).toBe(2);
 expect(riskLevel("Baixa")).toBe(1);
 expect(riskLevel("")).toBeNull();
 expect(riskLevel("indefinido")).toBeNull();
});

test("severidade é coerente com produto da matriz 3x3",()=>{
 expect(riskSeverity(risk("Alto","Alto"))).toBe("Crítico");
 expect(riskSeverity(risk("Alto","Médio"))).toBe("Alto");
 expect(riskSeverity(risk("Médio","Médio"))).toBe("Moderado");
 expect(riskSeverity(risk("Baixo","Baixo"))).toBe("Baixo");
 expect(riskSeverity(risk("","Alto"))).toBe("Não avaliado");
});
