/**
 * PERF-05: opt-in real user timings, without persisting request bodies,
 * authorization headers, URL query values, or user identifiers.
 * In a browser use ?perf=1 to display measurements in DevTools.
 */
type Sample = {route:string;method:string;status:number;elapsedMs:number;at:number};
const samples:Sample[]=[];
export function getClientPerformanceSummary(){
 const groups=new Map<string,number[]>();
 for(const sample of samples){
  const key=sample.method+" "+sample.route;
  groups.set(key,[...(groups.get(key)||[]),sample.elapsedMs]);
 }
 return [...groups.entries()].map(([route,values])=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {route,calls:values.length,p50Ms:sorted[Math.floor((sorted.length-1)*0.5)],p95Ms:sorted[Math.ceil(sorted.length*0.95)-1]};
 });
}
export async function measuredFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 if(typeof window==="undefined"||typeof performance==="undefined")return fetch(input,init);
 const start=performance.now();
 let response:Response|undefined;
 try{return response=await fetch(input,init);}
 finally{
  const elapsedMs=Math.round((performance.now()-start)*10)/10;
  const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
  let route="unknown";
  try{route=new URL(raw,window.location.origin).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,":id");}catch{/* no raw URL logging */}
  const method=(init?.method||"GET").toUpperCase();
  const sample={route,method,status:response?.status||0,elapsedMs,at:Date.now()};
  samples.push(sample);
  if(samples.length>120)samples.shift();
  performance.measure("7Commander "+method+" "+route,{start,end:performance.now()});
  if(new URLSearchParams(window.location.search).get("perf")==="1"){
   console.info("[PERF-05]",sample,"p95",getClientPerformanceSummary().find(x=>x.route===method+" "+route)?.p95Ms);
  }
 }
}
