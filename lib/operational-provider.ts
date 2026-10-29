import {Input,policy,simulate,Verdict} from "@/lib/operational-intelligence";
import {evaluateWithJev} from "@/lib/jev-gateway-adapter";
export type DecisionProvider={id:string;evaluate:(input:Input)=>Promise<Verdict>};
export const simulationProvider:DecisionProvider={id:"simulation-v1",async evaluate(input){return policy(simulate(input));}};
export const jevProvider:DecisionProvider={id:"typesafe-ai/jev-1.14.0",evaluate:evaluateWithJev};
export type IntelligenceMode="disabled"|"simulation"|"observation";
export function intelligenceMode():IntelligenceMode{
 const mode=process.env.SEVEN_COMMANDER_DECISIONS_MODE;
 if(mode==="observation"&&process.env.SEVEN_COMMANDER_JEV_ENABLED==="true")return "observation";
 return mode==="simulation"?"simulation":"disabled";
}
export function providerForMode():DecisionProvider|null{
 const mode=intelligenceMode();
 return mode==="simulation"?simulationProvider:mode==="observation"?jevProvider:null;
}
