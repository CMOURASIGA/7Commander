import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
/** No tokens/emails/headers/payloads are logged. A failed allow-audit must deny access. */
export async function recordCentralDecision(input:{userId:string;companyId:string;route:string;method:string;allowed:boolean;reasonCode:string}) {
  try{
   const db=getSupabaseServerClient();if(!db)return false;
   const {error}=await db.from('central_access_decision_audit').insert({
     commander_user_id:input.userId,commander_company_id:input.companyId,
     route:input.route.slice(0,200),method:input.method.slice(0,12),allowed:input.allowed,
     reason_code:input.reasonCode.slice(0,100)
   });return !error;
  }catch{return false;}
}
