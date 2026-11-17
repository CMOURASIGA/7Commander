import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectById,getProjectAccessRole} from "@/services/project-service";
import {getEffectiveTenantForUser} from "@/lib/tenant-runtime";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {prepareMeetingDraft,allowedMeetingFile} from "@/services/meeting-transcript-draft";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"private,no-store"}});
export async function POST(request:NextRequest,context:{params:Promise<{projectId:string}>}){
 try{
  const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
  const {projectId}=await context.params;
  const project=await getProjectById({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
  if(!project)return fail("Projeto não encontrado ou sem acesso.",404);
  const role=await getProjectAccessRole({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail,verifiedProject:project});
  if(role==="none")return fail("Sem autorização para consultar este projeto.",403);
  const tenant=await getEffectiveTenantForUser(auth.context.userId);
  const db=getSupabaseServerClient();
  if(!tenant||!db)return fail("Empresa indisponível.",403);
  const scoped=await db.from("projects").select("id").eq("id",projectId).eq("organization_id",tenant).maybeSingle();
  if(scoped.error||!scoped.data)return fail("Projeto fora da empresa autorizada.",403);
  if(Number(request.headers.get("content-length")||0)>9*1024*1024)return fail("Envio maior que 9 MB.",413);
  const form=await request.formData();
  const file=form.get("file");
  const text=String(form.get("text")??"").trim();
  if(file!==null&&!(file instanceof File))return fail("Arquivo inválido.",400);
  if(file instanceof File&&(!allowedMeetingFile(file.name)||file.size>8*1024*1024))return fail("Formato ou tamanho não suportado (máximo 8 MB).",400);
  if(!file&&text.length<80)return fail("Informe uma transcrição de ao menos 80 caracteres.",400);
  if(text.length>100000)return fail("Texto maior que 100 mil caracteres.",400);
  const [riskRows,decisionRows]=await Promise.all([
   db.from("risks").select("titulo").eq("project_id",projectId).eq("organization_id",tenant).limit(80),
   db.from("decisions").select("titulo").eq("project_id",projectId).eq("organization_id",tenant).limit(80)
  ]);
  const existingRecords=[
   ...(!riskRows.error?(riskRows.data??[]).map(row=>"Risco: "+row.titulo):[]),
   ...(!decisionRows.error?(decisionRows.data??[]).map(row=>"Decisão: "+row.titulo):[])
  ].slice(0,120);
  const payload={file:file instanceof File?file:undefined,content:text,projectName:project.name,existingRecords};
  // The streaming response is only sent after authentication, scope and input validation.
  // Each event represents a real completed operation, not an estimated clock percentage.
  if(request.headers.get("accept")?.includes("application/x-ndjson")){
   const encoder=new TextEncoder();
   const stream=new ReadableStream<Uint8Array>({
    start(controller){
     void (async()=>{
     const emit=(value:unknown)=>{try{controller.enqueue(encoder.encode(JSON.stringify(value)+"\n"));}catch{/* client disconnected */}};
     try{
      const draft=await prepareMeetingDraft({...payload,signal:request.signal,
       onProgress:progress=>emit({type:"progress",...progress})});
      emit({type:"result",data:draft,source:{filename:file instanceof File?file.name:null,kind:"unverified"},status:"review_required"});
     }catch(error){
      const message=error instanceof Error?error.message:"Falha ao interpretar documento.";
      console.error("[meetings/draft] stream failed",message);
      emit({type:"error",error:message});
     }finally{try{controller.close();}catch{/* disconnected */}}
     })();
    }
   });
   return new Response(stream,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8",
    "Cache-Control":"private,no-store,no-transform","X-Content-Type-Options":"nosniff"}});
  }
  const draft=await prepareMeetingDraft(payload);
  // Read-only preview. No meeting, risk, task or decision is created here.
  return NextResponse.json({data:draft,source:{filename:file instanceof File?file.name:null,kind:"unverified"},status:"review_required"},
   {headers:{"Cache-Control":"private,no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"Não foi possível preparar a ata.";
  console.error("[meetings/draft] extraction failed",message);
  return fail(message,422);
 }
}
