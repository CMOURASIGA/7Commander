import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
/** Public connectivity probe: never return Postgres errors or infrastructure hints. */
export async function GET() {
 const db=getSupabaseServerClient();
 if(!db)return NextResponse.json({ready:false},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const {error}=await db.from('conversations').select('id').limit(1);
  return NextResponse.json({ready:!error},{status:error?503:200,headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({ready:false},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
