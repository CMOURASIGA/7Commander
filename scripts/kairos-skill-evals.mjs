/**
 * Deterministic smoke gate for editable Kairos Agent Skills.
 * NOT a fine-tuning process or a measured LLM-quality improvement.
 * Real quality evaluation requires an authorized synthetic testset and review.
 */
import {readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
const dir=join(process.cwd(),"prompts","skills");
const folders=(await readdir(dir,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
const expected=["project-diagnosis","risk-analysis","kanban-execution","backlog-planning","scrum-management","decision-governance","executive-report","integrations-and-data","process-bpmn","stakeholder-governance","meeting-followup","quality-review","document-analysis","writing-support","study-and-translation"];
const failures=[];
for(const skill of expected){
 if(!folders.includes(skill)){failures.push("Missing skill: "+skill);continue;}
 const raw=await readFile(join(dir,skill,"SKILL.md"),"utf8");
 if(!/^---\r?\nname:\s*[\w-]+\r?\ndescription:\s*.+\r?\n---/.test(raw))
  failures.push("Invalid frontmatter: "+skill);
 if(raw.length<230||raw.length>12000)failures.push("Unexpected skill size: "+skill);
}
const core=await readFile(join(process.cwd(),"prompts","core","pm-ai-partner.md"),"utf8");
if(!core.includes("Não invente")||!core.includes("autorização"))failures.push("Core prompt missing governance rules");
const result={skills_expected:expected.length,skills_found:folders.filter(name=>expected.includes(name)).length,checks:expected.length+2,failures};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(failures.length)process.exitCode=1;
