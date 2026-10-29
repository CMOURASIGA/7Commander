export const MODULES=["projects","kanban","risks","commercial","decisions","knowledge","notifications"] as const;
export type ModuleName=typeof MODULES[number];
export type Severity="low"|"medium"|"high"|"critical";
export type Verdict={category:string;severity:Severity;score:number;reviewRequired:boolean;criteria:string[];evidence:string[];limitations:string[]};
export type Input={module:ModuleName;title:string;description:string;status?:string;dueDate?:string|null;owner?:string|null;impact?:string|null;probability?:string|null};
export function validInput(x:unknown):x is Input{
 if(!x||typeof x!=="object")return false;
 const v=x as Record<string,unknown>;
 return MODULES.includes(v.module as ModuleName)&&typeof v.title==="string"&&v.title.trim().length>=3&&v.title.length<=180
 &&typeof v.description==="string"&&v.description.length<=3000
 &&["status","dueDate","owner","impact","probability"].every(k=>v[k]===undefined||v[k]===null||(typeof v[k]==="string"&&(v[k] as string).length<=500));
}
export function simulate(input:Input):Verdict{
 const text=(input.title+" "+input.description+" "+(input.impact||"")).toLowerCase();
 const critical=/indisponib|vazamento|seguran[cç]a|bloqueio total|incidente crítico/.test(text);
 const urgent=/atras|imped|pendente|falha|risco|urgente|crítico|erro|sem responsável/.test(text);
 const empty=input.description.trim().length<30;
 const overdue=Boolean(input.dueDate&&/^\d{4}-\d{2}-\d{2}/.test(input.dueDate)&&input.dueDate.slice(0,10)<new Date().toISOString().slice(0,10));
 const score=Math.min(100,(critical?80:urgent?52:20)+(empty?12:0)+(overdue?20:0)+(!input.owner?8:0));
 const severity:Severity=score>=85?"critical":score>=65?"high":score>=40?"medium":"low";
 const category=input.module==="risks"?(/ocorreu|falha|incidente|problema/.test(text)?"problema":/pend[eê]ncia/.test(text)?"pendência":"risco"):
 input.module==="commercial"?"acompanhamento comercial":input.module==="kanban"?"tarefa":input.module==="projects"?"acompanhamento de projeto":
 input.module==="decisions"?"decisão":input.module==="knowledge"?"revisão documental":"notificação";
 return {category,severity,score,reviewRequired:severity!=="low"||empty,
 criteria:["Regras determinísticas v1; não são previsões do Jev","Criticidade textual indicativa","Prazo e responsável, quando presentes"],
 evidence:[`Título: ${input.title}`,`Descrição disponível: ${input.description.trim().length} caracteres`,`Prazo vencido: ${overdue?"sim":"não"}`,`Responsável informado: ${input.owner?"sim":"não"}`],
 limitations:["Simulação sintética sem avaliação de modelo externo","A pontuação é uma heurística de triagem, não confiança ou probabilidade calibrada"]};
}
export function policy(verdict:Verdict){return {...verdict,reviewRequired:verdict.reviewRequired||verdict.severity==="critical"};}
