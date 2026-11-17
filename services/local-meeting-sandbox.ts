import {createHash,randomUUID} from "node:crypto";
import {mkdir,readdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {NextRequest} from "next/server";
import {localWriteGuardEnabled} from "@/lib/local-write-guard";

/** Local-only preview persistence. NEVER writes to Supabase or production.
 * This branch is isolated to a development server accessed via loopback.
 */
export function localMeetingSandbox(request:NextRequest):boolean{
 return process.env.NODE_ENV==="development"
  &&localWriteGuardEnabled()
  &&["localhost","127.0.0.1"].includes(request.nextUrl.hostname);
}
export type SandboxMeeting={
 id:string;organization_id:string;project_id:string;created_by:string;
 title:string;held_at:string;participants:string;objective:string;summary:string;
 advances:string;decisions:string;commitments:string;pending_items:string;risks:string;
 next_follow_up:string|null;source_conversation_id:string|null;source_artifact_id:string|null;
 created_at:string;updated_at:string;links:[];
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function directory(org:string,project:string){
 if(!uuid.test(org)||!uuid.test(project))throw Error("Identificador inválido para armazenamento local.");
 return join(process.cwd(),".local-meetings",org,project);
}
function fingerprint(title:string,date:string){
 return createHash("sha256").update(JSON.stringify([title,date])).digest("hex");
}
export async function listSandboxMeetings(org:string,project:string):Promise<SandboxMeeting[]>{
 const path=directory(org,project);
 let filenames:string[];
 try{filenames=(await readdir(path)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));}
 catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return [];throw e;}
 const data=await Promise.all(filenames.map(async filename=>{
  const raw=JSON.parse(await readFile(join(path,filename),"utf8")) as SandboxMeeting;
  if(raw.organization_id!==org||raw.project_id!==project)return null;
  return raw;
 }));
 return data.filter((x):x is SandboxMeeting=>x!==null)
  .sort((a,b)=>b.held_at.localeCompare(a.held_at)).slice(0,100);
}
export async function saveSandboxMeeting(
 input:Omit<SandboxMeeting,"id"|"created_at"|"updated_at"|"links">,
):Promise<{meeting:SandboxMeeting;duplicate:boolean}>{
 const dir=directory(input.organization_id,input.project_id);
 await mkdir(dir,{recursive:true,mode:0o700});
 const createdAt=new Date().toISOString();
 const meeting:SandboxMeeting={...input,id:randomUUID(),created_at:createdAt,updated_at:createdAt,links:[]};
 const path=join(dir,fingerprint(input.title,input.held_at)+".json");
 try{
  await writeFile(path,JSON.stringify(meeting,null,2),{encoding:"utf8",flag:"wx",mode:0o600});
  return {meeting,duplicate:false};
 }catch(e){
  if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;
  const existing=JSON.parse(await readFile(path,"utf8")) as SandboxMeeting;
  return {meeting:existing,duplicate:true};
 }
}
