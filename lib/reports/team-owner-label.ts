/** A compact account identifier is not a person's name. Keep the source address available. */
export function teamOwnerLabel(value:string|null|undefined,empty="Sem responsável"):string{
 const raw=String(value||"").trim();
 if(!raw)return empty;
 if(/^[^\s@]+@[^\s@]+$/.test(raw)){
  // Break opportunities without inventing a name or dropping the domain.
  return raw.replace(/([@._+-])/g,"$1\u200b");
 }
 return raw;
}
