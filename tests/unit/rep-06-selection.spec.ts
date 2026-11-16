import {test,expect} from "@playwright/test";
import {applyInternalReportSelection,parseInternalReportSelection} from "../../lib/reports/internal-report-selection";
import type {ReportData} from "../../lib/scrum/report-data";

const sample=():ReportData=>({
 project:{id:"project-1",name:"Mardisa"},generated_at:"2026-11-16T00:00:00Z",scope:"current_snapshot",
 scrum:{enabled:true,backlog_stories:0,stories_total:3,tasks_total:3,tasks_done:1,sprints:[
  {id:"sprint-1",name:"Sprint A",goal:"",status:"active",start_date:"2026-11-01",end_date:"2026-11-15",
   stories:2,closed:1,resolved:0,active:1,blocked:0,overdue:0,points_planned:5,points_done:3,
   delivery_planned:0,delivery_actual:0,delivery_on_time:0,delivery_late:0},
  {id:"sprint-2",name:"Sprint B",goal:"",status:"planned",start_date:"2026-11-16",end_date:"2026-11-30",
   stories:1,closed:0,resolved:0,active:0,blocked:0,overdue:0,points_planned:2,points_done:0,
   delivery_planned:0,delivery_actual:0,delivery_on_time:0,delivery_late:0}
 ]},
 kanban:{total:3,todo:1,doing:1,done:1,overdue:0,completed_titles:["Entregue"],
  items:[{id:"card-1",title:"Pendente",status:"aberta",dueDate:null},
   {id:"card-2",title:"Andamento",status:"em_andamento",dueDate:null},
   {id:"card-3",title:"Entregue",status:"concluida",dueDate:null}]},
 governance:{risks_open:0,decisions_pending:0,client_risks:[],client_decisions:[]},
 internal:{stories:[
  {id:"story-1",sprint_id:"sprint-1",title:"US1",workflow_stage:"closed",story_points:3,due_date:null,actual_end_date:null,blocked:false,blocker_reason:"",responsible:null},
  {id:"story-2",sprint_id:"sprint-1",title:"US2",workflow_stage:"active",story_points:2,due_date:null,actual_end_date:null,blocked:false,blocker_reason:"",responsible:null},
  {id:"story-3",sprint_id:"sprint-2",title:"US3",workflow_stage:"new",story_points:2,due_date:null,actual_end_date:null,blocked:false,blocker_reason:"",responsible:null}
 ],tasks:[
  {id:"task-1",story_id:"story-1",title:"T1",state:"done",responsible:null},
  {id:"task-2",story_id:"story-2",title:"T2",state:"doing",responsible:null},
  {id:"task-3",story_id:"story-3",title:"T3",state:"todo",responsible:null}
 ],meetingLines:[]}
});
test("Sprint totals follow selected US and Tasks, never stale DB counters",()=>{
 const selected={cards:["card-1","card-2"],risks:[],decisions:[],sprints:["sprint-1"],
  stories:["story-2"],tasks:["task-2"],meetings:[]};
 const result=applyInternalReportSelection(sample(),selected);
 expect(result.scrum.sprints).toHaveLength(1);
 expect(result.scrum.sprints[0].stories).toBe(1);
 expect(result.scrum.sprints[0].closed).toBe(0);
 expect(result.scrum.sprints[0].active).toBe(1);
 expect(result.scrum.stories_total).toBe(1);
 expect(result.scrum.tasks_total).toBe(1);
 expect(result.scrum.tasks_done).toBe(0);
 expect(result.kanban.items?.map(x=>x.status)).toEqual(["aberta","em_andamento"]);
});
test("zero selection cannot repopulate Team contents",()=>{
 const empty={cards:[],risks:[],decisions:[],sprints:[],stories:[],tasks:[],meetings:[]};
 const result=applyInternalReportSelection(sample(),empty);
 expect(result.scrum.sprints).toHaveLength(0);
 expect(result.internal?.stories).toHaveLength(0);
 expect(result.internal?.tasks).toHaveLength(0);
 expect(result.kanban.items).toHaveLength(0);
 expect(parseInternalReportSelection(empty)).not.toBeNull();
});
test("Client report has no internal operational data in its source projection",()=>{
 const client:ReportData={...sample(),internal:undefined,internalSelection:undefined,kanban:{total:0,todo:0,doing:0,done:0,overdue:0,completed_titles:[]},scrum:{...sample().scrum,sprints:[]}};
 expect(client.internal).toBeUndefined();
 expect(client.kanban.items).toBeUndefined();
});
