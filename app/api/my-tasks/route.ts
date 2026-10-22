import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
  const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponivel"},{status:503});
  const email=auth.context.userEmail?.trim().toLowerCase();
  if(!email)return NextResponse.json({data:[],count:0},{headers:{"Cache-Control":"no-store"}});
  const m=await db.from("task_members").select("task_id,project_id,role").or(`member_user_id.eq.${auth.context.userId},member_email.eq.${email}`).limit(300);
  if(m.error)return NextResponse.json({error:"Falha ao consultar atribuições"},{status:503});
  const ids=[...new Set((m.data??[]).map(x=>x.task_id))];
  if(!ids.length)return NextResponse.json({data:[],count:0},{headers:{"Cache-Control":"no-store"}});
  const t=await db.from("tasks").select("id,project_id,titulo,status,prioridade,due_date,updated_at").in("id",ids).neq("status","concluida").order("due_date",{ascending:true,nullsFirst:false}).limit(100);
  if(t.error)return NextResponse.json({error:"Falha ao consultar atividades"},{status:503});
  const projectIds=[...new Set((t.data??[]).map(x=>x.project_id).filter(Boolean))];
  const p=projectIds.length?await db.from("projects").select("id,nome").in("id",projectIds):{data:[],error:null};
  if(p.error)return NextResponse.json({error:"Falha ao consultar projetos"},{status:503});
  const names=new Map((p.data??[]).map(x=>[x.id,x.nome]));
  const data=(t.data??[]).map(x=>({id:x.id,projectId:x.project_id,projectName:names.get(x.project_id)||"Projeto",title:x.titulo,status:x.status,priority:x.prioridade,dueDate:x.due_date}));
  return NextResponse.json({data,count:data.length},{headers:{"Cache-Control":"no-store"}});
}
