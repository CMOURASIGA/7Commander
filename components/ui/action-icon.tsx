import type {SVGProps} from "react";

export type ActionIconName="plus"|"trash"|"arrow-left"|"pencil"|"x"|"refresh"|"external-link"|"eye"|"star"|"circle-minus"|"check"|"download"|"copy";
export function ActionIcon({name,...props}:SVGProps<SVGSVGElement>&{name:ActionIconName}){
 const path:Record<ActionIconName,string>={
  plus:"M12 5v14M5 12h14",
  trash:"M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7",
  "arrow-left":"M19 12H5m7-7-7 7 7 7",
  pencil:"M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z",
  x:"M18 6 6 18M6 6l12 12",
  refresh:"M20 7v5h-5M4 17v-5h5M5 9a7 7 0 0 1 12-2l3 5M4 12l3 5a7 7 0 0 0 12-2",
  "external-link":"M14 4h6v6M20 4l-9 9M20 13v7H4V4h7",
  eye:"M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  star:"m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z",
  "circle-minus":"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM8 12h8",
  check:"m5 12 4 4L19 6",
  download:"M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4",
  copy:"M8 8h12v12H8zM16 8V4H4v12h4"
 };
 return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
  width={props.width??20} height={props.height??20} fill="none"
  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
  aria-hidden="true" focusable="false">
  <path d={path[name]}/>
 </svg>;
}
