import {Input,policy,simulate,Verdict} from "@/lib/operational-intelligence";
export type DecisionProvider={id:string;evaluate:(input:Input)=>Promise<Verdict>};
export const simulationProvider:DecisionProvider={id:"simulation-v1",async evaluate(input){return policy(simulate(input));}};
export function intelligenceMode(){return process.env.SEVEN_COMMANDER_DECISIONS_MODE==="simulation"?"simulation":"disabled";}
export function providerForMode():DecisionProvider|null{return intelligenceMode()==="simulation"?simulationProvider:null;}
/* Jev adapter is deliberately not instantiated until AI SDK 7.x and Gateway authorization are installed and reviewed.
 * No model can access Supabase or execute business actions through this interface. */
