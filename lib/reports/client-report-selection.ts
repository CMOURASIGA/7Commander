import type {ClientReportFact} from "@/lib/scrum/report-data";

/** A selected Sprint automatically includes all of its US, with their current status.
 * User Stories are not independently selectable as Kanban deliverables.
 * Applied in preview AND on the server when issuing a snapshot.
 */
export function selectClientReportFacts(candidates:ClientReportFact[],selectedIds:readonly string[]):ClientReportFact[]{
 const selected=new Set(selectedIds);
 return candidates.filter(fact=>
  fact.id.startsWith("story:")
   ? Boolean(fact.source_reference&&selected.has(fact.source_reference))
   : selected.has(fact.id)
 );
}

/** Selection UI only lists explicit choices, excluding Sprint-dependent US. */
export function clientSelectableFacts(candidates:ClientReportFact[]):ClientReportFact[]{
 return candidates.filter(fact=>!fact.id.startsWith("story:"));
}
