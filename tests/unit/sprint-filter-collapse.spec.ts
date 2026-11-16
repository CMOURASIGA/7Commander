import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

test("Sprint filters preserve parent collapse and expand behavior",()=>{
 const page=readFileSync(resolve(process.cwd(),"app/scrum/backlog/page.tsx"),"utf8");
 expect(page).toContain('const matchesSprint=sprintScopedIds===null||sprintScopedIds.has(r.id)');
 expect(page).toContain('&&matchesSprint&&!r.ancestorIds.some(p=>collapsed.includes(p))');
 expect(page).not.toContain('||Boolean(filtersActive)');
 expect(page).toContain('setCollapsed(rows.filter(r=>r.type==="epic"||r.type==="feature"||r.type==="story").map(r=>r.id))');
 expect(page).toContain('onClick={()=>setCollapsed([])}>Expandir');
});

test("Client report selection does not depend on publishing",()=>{
 const page=readFileSync(resolve(process.cwd(),"app/status-report/page.tsx"),"utf8");
 const source=readFileSync(resolve(process.cwd(),"lib/reports/client-report-candidates.ts"),"utf8");
 expect(page).toContain('aria-label="Gestão do conteúdo Cliente"');
 expect(page).toContain('Não é necessário publicar ou despublicar.');
 expect(page).not.toContain('<PublicFactsEditor');
 expect(page).not.toContain('Despublicar tudo');
 expect(source).not.toContain('.eq("approved_for_client",true)');
});
