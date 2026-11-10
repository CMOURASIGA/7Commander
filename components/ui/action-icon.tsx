import type {SVGProps} from "react";
export type ActionIconName="plus"|"trash"|"arrow-left"|"pencil"|"x"|"refresh"|"external-link";
export function ActionIcon({name,...props}:SVGProps<SVGSVGElement>&{name:ActionIconName}){
 const path:Record<ActionIconName,string>={
  plus:"M12 5v14M5 12h14",trash:"M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7",
  "arrow-left":"M19 12H5m7-7-7 7 7 7",pencil:"M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z",
  x:"M18 6 6 18M6 6l12 12",refresh:"M20 7v5h-5M4 17v-5h5M5 9a7 7 0 0 1 12-2l3 5M4 12l3 5a7 7 0 0 0 12-2",
  "external-link":"M14 4h6v6M20 4l-9 9M20 13v7H4V4h7"
 };
 return <svg {...props} viewBox="0 0 24 24" width={props.width||16} height={props.height||16} fill="none"
  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d={path[name]}/>
 </svg>;
}
