import {getSupabaseServerClient} from "@/lib/supabase/server";
import {localWriteGuardEnabled} from "@/lib/local-write-guard";
import {listSandboxMeetings} from "@/services/local-meeting-sandbox";

type DB=NonNullable<ReturnType<typeof getSupabaseServerClient>>;
export type MeetingReportRecord={
 id:string;title:string;held_at:string;commitments:string;pending_items:string;
 next_follow_up:string|null;source_artifact_id:string|null;local_only:boolean;
};
export type MeetingReportLine={meetingId:string;meetingTitle:string;heldAt:string;category:"commitment"|"pending";position:number;title:string;details:string;sourceReference:string;localOnly:boolean};
export function meetingReportLines(meeting:MeetingReportRecord):MeetingReportLine[]{
 const values:[MeetingReportLine["category"],string][]=[["commitment",meeting.commitments],["pending",meeting.pending_items]];
 return values.flatMap(([category,source])=>source.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
  .slice(0,80).map((line,index)=>{
   const parts=line.split(/\s*\|\s*/);
   const title=(parts.shift()||"").trim().slice(0,180);
   return {
    meetingId:meeting.id,meetingTitle:meeting.title,heldAt:meeting.held_at,
    category,position:index,title,details:parts.join(" · ").slice(0,800),
    sourceReference:"meeting:"+meeting.id+":"+category+":"+index,
    localOnly:meeting.local_only
   };
  }).filter(x=>x.title.length>=3));
}
export function localMeetingReportEnabled():boolean{
 return process.env.NODE_ENV==="development"&&localWriteGuardEnabled();
}
export async function loadProjectMeetingReport(
 db:DB,org:string,projectId:string,limit=30
):Promise<{records:MeetingReportRecord[];source:"local"|"official"}>{
 if(localMeetingReportEnabled()){
  const rows=await listSandboxMeetings(org,projectId);
  return {source:"local",records:rows.slice(0,limit).map(row=>({
   id:row.id,title:row.title,held_at:row.held_at,
   commitments:row.commitments,pending_items:row.pending_items,
   next_follow_up:row.next_follow_up,source_artifact_id:row.source_artifact_id,
   local_only:true
  }))};
 }
 const result=await db.from("project_meetings")
  .select("id,title,held_at,commitments,pending_items,next_follow_up,source_artifact_id")
  .eq("organization_id",org).eq("project_id",projectId)
  .order("held_at",{ascending:false}).limit(limit);
 if(result.error){
  console.error("[meeting-report] source unavailable",{code:result.error.code,projectId});
  throw Error("Consulta de reuniões indisponível. Nenhuma informação de reunião foi presumida.");
 }
 return {source:"official",records:(result.data||[]).map(row=>({
  id:row.id,title:row.title,held_at:row.held_at,
  commitments:row.commitments||"",pending_items:row.pending_items||"",
  next_follow_up:row.next_follow_up||null,
  source_artifact_id:row.source_artifact_id||null,local_only:false
 }))};
}
