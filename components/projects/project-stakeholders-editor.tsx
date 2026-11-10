"use client";
import {useEffect,useState} from "react";
import {decodeStakeholders,encodeStakeholders,STAKEHOLDER_GROUP_LABELS,STAKEHOLDER_LIMIT, type ProjectStakeholder,type StakeholderGroup} from "@/lib/projects/stakeholders";
type Draft=Omit<ProjectStakeholder,"id">;
const empty:Draft={name:"",organization:"",role:"",group:"cliente"};
export function ProjectStakeholdersEditor({value,onChange,readOnly=false}:{value:string;onChange:(value:string)=>void;readOnly?:boolean}){
 const rows=decodeStakeholders(value);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState<Draft>(empty);
 const [error,setError]=useState("");
 useEffect(()=>{setEditing(null);setDraft(empty);setError("");},[value.startsWith("stakeholders:v1:")?null:value]);
 function start(row?:ProjectStakeholder){
  setEditing(row?.id??"new");setDraft(row?{name:row.name,organization:row.organization,role:row.role,group:row.group}:empty);setError("");
 }
 function save(){
  const name=draft.name.trim(),organization=draft.organization.trim(),role=draft.role.trim();
  if(!name){setError("Informe o nome da pessoa ou fornecedor.");return;}
  if(!role){setError("Informe o papel ou responsabilidade no projeto.");return;}
  if(editing==="new"&&rows.length>=STAKEHOLDER_LIMIT){setError("Limite de 100 stakeholders atingido.");return;}
  const row:ProjectStakeholder={id:editing==="new"?crypto.randomUUID():editing||crypto.randomUUID(),name,organization,role,group:draft.group};
  const updated=editing==="new"?[...rows,row]:rows.map(item=>item.id===editing?row:item);
  try{onChange(encodeStakeholders(updated));setEditing(null);setDraft(empty);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar stakeholders.");}
 }
 function remove(id:string){
  try{onChange(encodeStakeholders(rows.filter(item=>item.id!==id)));if(editing===id)setEditing(null);}
  catch(e){setError(e instanceof Error?e.message:"Erro ao excluir.");}
 }
 return <section className="space-y-3 rounded-xl border border-(--border) bg-(--bg-surface) p-4" aria-label="Stakeholders do projeto">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h3 className="text-sm font-semibold text-(--text-primary)">Stakeholders e partes interessadas</h3>
    <p className="mt-1 text-xs text-(--text-secondary)">Registre pessoas e fornecedores, com organização, papel e grupo. Não concede acesso ao sistema.</p></div>
   {!readOnly&&<button type="button" className="workspace-button-secondary px-3 py-2 text-xs" disabled={rows.length>=STAKEHOLDER_LIMIT} onClick={()=>start()}>Adicionar stakeholder</button>}
  </div>
  {rows.length>0?<div className="overflow-x-auto rounded-lg border border-(--border)">
   <table className="w-full text-left text-xs">
    <thead className="bg-(--bg-muted) text-(--text-secondary)"><tr><th scope="col" className="px-3 py-2">Nome ou fornecedor</th><th scope="col" className="px-3 py-2">Organização</th><th scope="col" className="px-3 py-2">Papel no projeto</th><th scope="col" className="px-3 py-2">Grupo</th>{!readOnly&&<th scope="col" className="px-3 py-2">Ações</th>}</tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} className="border-t border-(--border) align-top">
     <td className="min-w-36 px-3 py-3 font-medium text-(--text-primary) break-words">{row.name}</td>
     <td className="min-w-28 px-3 py-3 text-(--text-secondary) break-words">{row.organization||"Não informado"}</td>
     <td className="min-w-52 px-3 py-3 text-(--text-secondary) break-words whitespace-normal">{row.role||"Não informado"}</td>
     <td className="px-3 py-3 text-(--text-secondary)">{STAKEHOLDER_GROUP_LABELS[row.group]}</td>
     {!readOnly&&<td className="min-w-32 px-3 py-2"><div className="flex flex-wrap gap-2"><button type="button" className="workspace-button-secondary px-2 py-1 text-xs" onClick={()=>start(row)}>Editar</button><button type="button" className="workspace-button-danger px-2 py-1 text-xs" onClick={()=>remove(row.id)}>Excluir</button></div></td>}
    </tr>)}</tbody>
   </table>
  </div>:<p className="rounded-lg border border-dashed border-(--border) p-3 text-xs text-(--text-secondary)">Nenhum stakeholder cadastrado neste projeto.</p>}
  {editing!==null&&!readOnly&&<div className="space-y-3 rounded-lg border border-(--border) bg-(--bg-muted) p-3">
   <p className="text-xs font-semibold">{editing==="new"?"Adicionar stakeholder":"Editar stakeholder"}</p>
   <div className="grid gap-3 md:grid-cols-2">
    <label className="space-y-1 text-xs">Nome ou fornecedor<input aria-label="Nome ou fornecedor" maxLength={160} className="w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label>
    <label className="space-y-1 text-xs">Organização<input aria-label="Organização" maxLength={160} className="w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={draft.organization} onChange={e=>setDraft(v=>({...v,organization:e.target.value}))}/></label>
    <label className="space-y-1 text-xs">Papel e responsabilidade<input aria-label="Papel e responsabilidade" maxLength={240} className="w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={draft.role} onChange={e=>setDraft(v=>({...v,role:e.target.value}))}/></label>
    <label className="space-y-1 text-xs">Grupo<select aria-label="Grupo do stakeholder" className="w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={draft.group} onChange={e=>setDraft(v=>({...v,group:e.target.value as StakeholderGroup}))}>{(Object.entries(STAKEHOLDER_GROUP_LABELS) as [StakeholderGroup,string][]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   </div>
   {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
   <div className="flex gap-2"><button type="button" className="workspace-button-primary px-3 py-2 text-xs" onClick={save}>Aplicar alteração</button><button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>{setEditing(null);setError("");}}>Cancelar</button></div>
  </div>}
  {!readOnly&&<p className="text-xs text-(--text-secondary)">Após adicionar ou editar, clique em <strong>Salvar detalhes do projeto</strong> para gravar as alterações. Os stakeholders não são incluídos automaticamente no relatório Cliente.</p>}
 </section>;
}
