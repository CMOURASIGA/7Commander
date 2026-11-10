/**
 * Structured stakeholders stored in the existing projects.stakeholders TEXT field.
 * No extra table, permissions, migration or changes to Status Report data.
 * Keep legacy free text readable, convert only when the project is saved.
 */
export type StakeholderGroup="cliente"|"consultoria"|"fornecedor"|"outro";
export type ProjectStakeholder={
 id:string;name:string;organization:string;role:string;group:StakeholderGroup;
};
const PREFIX="stakeholders:v1:";
const GROUPS:StakeholderGroup[]=["cliente","consultoria","fornecedor","outro"];
export const STAKEHOLDER_LIMIT=100;
export function decodeStakeholders(raw:string|null|undefined):ProjectStakeholder[]{
 const value=(raw||"").trim();if(!value)return [];
 if(value.startsWith(PREFIX)){
  try {
   const parsed:unknown=JSON.parse(value.slice(PREFIX.length));
   if(!Array.isArray(parsed))return [];
   return parsed.slice(0,STAKEHOLDER_LIMIT).flatMap((item,index)=>{
    if(!item||typeof item!=="object")return [];
    const row=item as Record<string,unknown>;
    const name=String(row.name??"").trim();
    if(!name)return [];
    const group=String(row.group??"outro") as StakeholderGroup;
    return [{id:String(row.id||"item-"+index),name,organization:String(row.organization??"").trim(),role:String(row.role??"").trim(),group:GROUPS.includes(group)?group:"outro"}];
   });
  }catch{return [];}
 }
 // Preserve older single-text registrations, including a semicolon list.
 const parts=value.split(/\s*;\s*|\r?\n/).map(s=>s.trim()).filter(Boolean);
 return parts.slice(0,STAKEHOLDER_LIMIT).map((entry,index)=>{
  const parentheses=entry.match(/^(.+?)\s*\((.+)\)$/);
  if(parentheses){
   const details=parentheses[2].split(/\s*,\s*/);
   const organization=details.shift()||"";
   return {id:"legacy-"+index,name:parentheses[1].trim(),organization,role:details.join(", "),group:"outro"};
  }
  const separator=entry.match(/^(.+?)\s+[-–]\s+(.+)$/);
  return {id:"legacy-"+index,name:(separator?.[1]||entry).trim(),organization:"",role:(separator?.[2]||"").trim(),group:"outro"};
 });
}
export function encodeStakeholders(items:ProjectStakeholder[]):string{
 if(items.length>STAKEHOLDER_LIMIT)throw new Error("Limite de 100 stakeholders por projeto.");
 const clean=items.map((item,index)=>{
  const name=item.name.trim(),organization=item.organization.trim(),role=item.role.trim();
  if(!name||name.length>160||organization.length>160||role.length>240)
   throw new Error("Informe um nome válido e mantenha os campos dentro dos limites.");
  return {id:item.id.trim()||"item-"+index,name,organization,role,group:GROUPS.includes(item.group)?item.group:"outro"};
 });
 const ids=new Set(clean.map(item=>item.id));
 if(ids.size!==clean.length)throw new Error("Identificadores de stakeholders duplicados.");
 return PREFIX+JSON.stringify(clean);
}
export function validStakeholderPayload(value:string):boolean{
 if(value.length>50000)return false;
 if(!value.startsWith(PREFIX))return true; // old projects and non-structured integrations
 try{
  const rows=decodeStakeholders(value);
  const payload=JSON.parse(value.slice(PREFIX.length)) as unknown;
  return Array.isArray(payload)&&payload.length===rows.length&&rows.length<=STAKEHOLDER_LIMIT
   &&rows.every(row=>!!row.name&&row.name.length<=160&&row.organization.length<=160&&row.role.length<=240)
   &&new Set(rows.map(row=>row.id)).size===rows.length;
 }catch{return false;}
}
export const STAKEHOLDER_GROUP_LABELS:Record<StakeholderGroup,string>={
 cliente:"Cliente",consultoria:"Consultoria",fornecedor:"Fornecedor",outro:"Outro"
};
