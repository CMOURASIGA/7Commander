import {test,expect} from "@playwright/test";
import {localWriteGuardEnabled,shouldBlockLocalApiMutation} from "../../lib/local-write-guard";

test("local read only remains enabled when next start uses production mode",()=>{
  expect(localWriteGuardEnabled({NODE_ENV:"development",COMMANDER_LOCAL_READ_ONLY:"true"} as NodeJS.ProcessEnv)).toBe(true);
  expect(localWriteGuardEnabled({NODE_ENV:"production",COMMANDER_LOCAL_READ_ONLY:"true"} as NodeJS.ProcessEnv)).toBe(true);
  expect(localWriteGuardEnabled({NODE_ENV:"development",COMMANDER_LOCAL_READ_ONLY:"false"} as NodeJS.ProcessEnv)).toBe(false);
});
test("all Next.js API mutation methods are blocked",()=>{
  for(const method of ["POST","PUT","PATCH","DELETE"]){
    expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/tasks/123",method})).toBe(true);
    expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/chat",method})).toBe(method!=="POST");
    expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/auth/profile",method})).toBe(true);
  }
});
test("API GET and static pages remain reachable",()=>{
  for(const method of ["GET","HEAD","OPTIONS"]){
    expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/projects",method})).toBe(false);
  }
  expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/projects",method:"POST"})).toBe(false);
  expect(shouldBlockLocalApiMutation({enabled:false,pathname:"/api/tasks",method:"DELETE"})).toBe(false);
});
test("chat and local cookie sync are the only allowed POST operations",()=>{
  expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/chat",method:"POST"})).toBe(false);
  expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/chat",method:"DELETE"})).toBe(true);
  expect(shouldBlockLocalApiMutation({enabled:true,pathname:"/api/auth/profile",method:"POST"})).toBe(true);
});
