import fs from "node:fs";
import path from "node:path";
const f=path.join(process.cwd(),"tests/fixtures/spec08-labeled-candidates.jsonl");
const lines=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith("#"));
const allowed=new Set(["projects","kanban","risks","commercial","decisions","knowledge","notifications"]);
const ids=new Set(),counts=new Map();
for(const line of lines){
 const r=JSON.parse(line);
 if(!allowed.has(r.module)||typeof r.description!=="string"||!r.id||ids.has(r.id))throw Error("Invalid or duplicate labeled candidate");
 if(typeof r.expected_review!=="boolean"||typeof r.expected_critical!=="boolean")throw Error("Missing reference field");
 ids.add(r.id);counts.set(r.module,(counts.get(r.module)||0)+1);
}
if(lines.length<100||[...allowed].some(m=>(counts.get(m)||0)<10))throw Error("SPEC08 coverage gate failed");
console.log(JSON.stringify({status:"PASS",candidates:lines.length,modules:Object.fromEntries(counts),note:"Fixture coverage only; not Jev accuracy benchmark"},null,2));
