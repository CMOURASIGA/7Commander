import {test,expect} from "@playwright/test";
import {beginLocalIdentity,verifyLocalIdentity,getLocalIdentity} from "../../lib/local-request-identity";

test("unverified request context never exposes a Supabase token",async()=>{
  beginLocalIdentity("token-untrusted");
  expect(getLocalIdentity()).toBeNull();
  await Promise.resolve();
  expect(getLocalIdentity()).toBeNull();
  expect(verifyLocalIdentity("different-token","valid-user")).toBe(false);
  expect(getLocalIdentity()).toBeNull();
});

test("verified context survives an awaited authentication boundary",async()=>{
  async function requireAuthSimulation(){
    beginLocalIdentity("token-verified");
    await Promise.resolve();
    expect(verifyLocalIdentity("token-verified","user-one")).toBe(true);
  }
  await requireAuthSimulation();
  expect(getLocalIdentity()).toEqual({token:"token-verified",userId:"user-one"});
});

test("concurrent requests must not share user identity",async()=>{
  async function simulate(token:string,userId:string){
    beginLocalIdentity(token);
    await Promise.resolve();
    verifyLocalIdentity(token,userId);
    await Promise.resolve();
    return getLocalIdentity();
  }
  const [one,two]=await Promise.all([
    simulate("token-one","one"),simulate("token-two","two"),
  ]);
  expect(one).toEqual({token:"token-one",userId:"one"});
  expect(two).toEqual({token:"token-two",userId:"two"});
});
