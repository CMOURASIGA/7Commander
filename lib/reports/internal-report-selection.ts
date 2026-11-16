import type {ReportData} from "@/lib/scrum/report-data";

export type InternalReportSelection = {
  cards:string[];
  risks:string[];
  decisions:string[];
  sprints:string[];
  stories:string[];
  tasks:string[];
  meetings:string[];
};
export const INTERNAL_REPORT_SELECTION_KEYS=[
  "cards","risks","decisions","sprints","stories","tasks","meetings"
] as const;
export type InternalReportSelectionKey=typeof INTERNAL_REPORT_SELECTION_KEYS[number];
const identifier=/^[a-zA-Z0-9:_-]{1,180}$/;
export function parseInternalReportSelection(input:unknown):InternalReportSelection|null {
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const data=input as Record<string,unknown>;
  const output={} as InternalReportSelection;
  for(const key of INTERNAL_REPORT_SELECTION_KEYS){
    if(!Array.isArray(data[key])||data[key].length>500||
      !(data[key] as unknown[]).every(x=>typeof x==="string"&&identifier.test(x)))return null;
    output[key]=[...new Set(data[key] as string[])];
  }
  return output;
}
export function selectionAllows(selected:string[]|undefined,id:string):boolean{
  return !selected||selected.includes(id);
}
export function applyInternalReportSelection(report:ReportData,selection:InternalReportSelection):ReportData {
  const stories=(report.internal?.stories||[]).filter(x=>selectionAllows(selection.stories,x.id));
  const tasks=(report.internal?.tasks||[]).filter(x=>selectionAllows(selection.tasks,x.id));
  const meetings=(report.internal?.meetingLines||[]).filter(x=>selectionAllows(selection.meetings,x.sourceReference));
  const sprints=report.scrum.sprints.filter(x=>selectionAllows(selection.sprints,x.id));
  const assessments=(report.riskAssessments||[]).filter(x=>selectionAllows(selection.risks,x.id));
  return {
    ...report,
    internalSelection:selection,
    scrum:{...report.scrum,sprints,stories_total:stories.length,tasks_total:tasks.length,tasks_done:tasks.filter(x=>x.state==="done").length,backlog_stories:stories.filter(x=>!x.sprint_id).length},
    riskAssessments:assessments,
    governance:{...report.governance,
      risks_open:assessments.filter(x=>["aberto","em_mitigacao"].includes(x.status.toLowerCase())).length,
      client_decisions:report.governance.client_decisions, // resolved from verified decision IDs by the history endpoint
    },
    internal:report.internal?{...report.internal,stories,tasks,meetingLines:meetings}:undefined,
  };
}
