import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getDecisionById,updateDecisionFields} from "@/services/decision-service";
import {getProjectAccessRole} from "@/services/project-service";
export async function PATCH(request:NextRequest,context:{params:Promise<{decisionId:string}>}){
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 const {decisionId}=await context.params;
 const current=await getDecisionById({userId:auth.context.userId,decisionId});
 if(!current||!current.projectId)return NextResponse.json({error:"Decisão não encontrada no projeto."},{status:404});
 const role=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId:current.projectId});
 if(role!=="owner"&&role!=="editor")
  return NextResponse.json({error:"Sem permissão para editar decisão."},{status:403});
 const body=await request.json().catch(()=>({}));
 if(typeof body.title!=="string"||!body.title.trim()||body.title.length>180
   ||["context","reason","impact"].some(key=>typeof body[key]!=="string"||body[key].length>10000))
  return NextResponse.json({error:"Conteúdo da decisão inválido."},{status:400});
 const updated=await updateDecisionFields({userId:auth.context.userId,decisionId,
  patch:{title:body.title,context:body.context,reason:body.reason,impact:body.impact}});
 return updated?NextResponse.json({data:updated}):NextResponse.json({error:"Falha ao atualizar decisão."},{status:409});
}
