import {expect,test} from "@playwright/test";
import {decodeStakeholders,encodeStakeholders,validStakeholderPayload} from "../../lib/projects/stakeholders";

test("stakeholders: preserve older single-text project participants",()=>{
 const older="Dra. Adriana - Decisora de negócio; Thamyres - Usuária-chave; SigmaG - API Marketplace";
 const rows=decodeStakeholders(older);
 expect(rows).toHaveLength(3);
 expect(rows[0].name).toBe("Dra. Adriana");
 expect(rows[1].role).toBe("Usuária-chave");
 expect(rows[2].name).toBe("SigmaG");
});

test("stakeholders: structured list round-trips nine participants and retains roles",()=>{
 const names=["Dra. Adriana","Thamyres","Guilherme","Cristiano Caldas","Jeferson Couto","João Varela","Diogo Correa","SigmaG","Racimed/Hacimed"];
 const rows=names.map((name,i)=>({id:"id-"+i,name,organization:i<3?"Prosperitá":i<7?"7Consulting":"Fornecedor",role:i===8?"Integração de consultas e exames, identificação pendente":"Papel de gestão",group:i<3?"cliente" as const:i<7?"consultoria" as const:"fornecedor" as const}));
 const encoded=encodeStakeholders(rows);
 expect(encoded.startsWith("stakeholders:v1:")).toBe(true);
 expect(validStakeholderPayload(encoded)).toBe(true);
 expect(decodeStakeholders(encoded)).toEqual(rows);
 expect(decodeStakeholders(encoded)[8].role).toContain("identificação pendente");
});

test("stakeholders: reject duplicate identifiers and invalid rows",()=>{
 const row={id:"id-1",name:"Pessoa",organization:"Prosperitá",role:"Responsável",group:"cliente" as const};
 expect(()=>encodeStakeholders([row,row])).toThrow();
 expect(validStakeholderPayload('stakeholders:v1:[{"id":"1","name":""}]')).toBe(false);
 expect(validStakeholderPayload("x".repeat(50001))).toBe(false);
 expect(decodeStakeholders("")).toEqual([]);
});

test("stakeholders: editing is not a project member or reporting permission",()=>{
 const str=encodeStakeholders([{id:"p1",name:"Fornecedor",organization:"SigmaG",role:"API Vita Primo",group:"fornecedor"}]);
 expect(str).not.toContain("memberEmail");
 expect(str).not.toContain("authorized");
});
