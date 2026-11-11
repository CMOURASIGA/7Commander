import {test,expect} from "@playwright/test";
import {isSupabaseDataMutation,readOnlySupabaseFetch} from "../../lib/local-supabase-fetch";

test("blocks inserts, updates, deletes and PostgREST RPC",()=>{
  const base="https://example.supabase.co";
  for(const method of ["POST","PATCH","PUT","DELETE"]){
    expect(isSupabaseDataMutation(base+"/rest/v1/projects",{method})).toBe(true);
    expect(isSupabaseDataMutation(base+"/rest/v1/rpc/int01_sync_central_membership",{method})).toBe(true);
  }
});
test("permits reading data and auth login but denies storage and functions writes",()=>{
  const base="https://example.supabase.co";
  expect(isSupabaseDataMutation(base+"/rest/v1/projects",{method:"GET"})).toBe(false);
  expect(isSupabaseDataMutation(base+"/auth/v1/token?grant_type=password",{method:"POST"})).toBe(false);
  expect(isSupabaseDataMutation(base+"/storage/v1/object/docs",{method:"POST"})).toBe(true);
  expect(isSupabaseDataMutation(base+"/functions/v1/process",{method:"POST"})).toBe(true);
});
test("fetch fails closed locally without calling upstream for mutation",async()=>{
  let calls=0;
  const upstream:typeof fetch=async()=>{calls++;return new Response("ok",{status:200});};
  const guarded=readOnlySupabaseFetch(upstream);
  const blocked=await guarded("https://example.supabase.co/rest/v1/projects",{method:"POST"});
  expect(blocked.status).toBe(403);
  expect(calls).toBe(0);
  const allowed=await guarded("https://example.supabase.co/rest/v1/projects",{method:"GET"});
  expect(allowed.status).toBe(200);
  expect(calls).toBe(1);
});
