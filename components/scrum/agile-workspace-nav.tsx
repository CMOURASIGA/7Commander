"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections=[
  {href:"/scrum",title:"Sprints",subtitle:"Planejamento e indicadores"},
  {href:"/scrum/backlog",title:"Backlog",subtitle:"Épicos, US e Tasks"},
  {href:"/scrum/kanban",title:"Kanban de US",subtitle:"Fluxo e impedimentos"},
  {href:"/daily",title:"Daily",subtitle:"Execução do dia"},
  {href:"/activities",title:"Atividades",subtitle:"Quadro operacional"},
];

export function AgileWorkspaceNav({context}:{context?:string}) {
  const pathname=usePathname();
  return <nav aria-label="Navegação da gestão ágil" className="workspace-card p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Gestão ágil</p>
      {context?<p className="max-w-full truncate text-xs text-(--text-secondary)">{context}</p>:null}
    </div>
    <div className="flex flex-wrap gap-1 border-b border-(--border)">
      {sections.map(section=>{
        const active=pathname===section.href;
        return <Link key={section.href} href={section.href} aria-current={active?"page":undefined}
          title={section.subtitle}
          className={`inline-flex items-center border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${active?"border-(--accent) text-(--accent)":"border-transparent text-(--text-secondary) hover:text-(--text-primary)"}`}>{section.title}</Link>;
      })}
    </div>
  </nav>;
}
