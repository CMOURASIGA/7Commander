import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("SSO entry accepts form POST from allowlisted portal only, never query credentials",()=>{
 const s=read("app/api/auth/portal-entry/route.ts");
 assert.match(s,/COMMANDER_PORTAL_SSO_ALLOWED_ORIGINS/);
 assert.match(s,/allowed\.includes\(origin\)/);
 assert.match(s,/request\.formData\(\)/);
 assert.match(s,/centralAccessToken/);
 assert.doesNotMatch(s,/searchParams\.get/);
 assert.match(s,/Referrer-Policy/);
});
test("Commander verifies central bearer, entitlement and tenant before local OTP",()=>{
 const s=read("app/api/auth/central-exchange/route.ts");
 assert.match(s,/auth\.auth\.getUser\(input\.centralAccessToken as string\)/);
 assert.match(s,/checkCentralProductAccess/);
 assert.match(s,/evaluateCommanderCentralAccess/);
 assert.match(s,/generateLink/);
 assert.match(s,/tokenLogin/);
});
test("single-use OTP lives in short-lived HTTP-only cookie, then consumed locally",()=>{
 const entry=read("app/api/auth/portal-entry/route.ts");
 const redeem=read("app/api/auth/portal-finalize/route.ts");
 const page=read("app/portal-finalize/page.tsx");
 assert.match(entry,/maxAge: 45/);
 assert.match(entry,/httpOnly: true/);
 assert.match(redeem,/maxAge: 0/);
 assert.match(redeem,/sameOriginMutation/);
 assert.match(page,/verifyOtp/);
 assert.match(page,/local-session/);
 const middleware=read("middleware.ts");
 assert.match(middleware,/portal-finalize/);
});

test("protected preview starts SSO on GET before same-origin central exchange",()=>{
 const app=read("app/portal-start/page.tsx");
 const middleware=read("middleware.ts");
 assert.match(app,/COMMANDER_PORTAL_READY/);
 assert.match(app,/SEVENSERVICE_CENTRAL_SESSION/);
 assert.match(app,/event\.origin !== origin/);
 assert.match(app,/event\.source !== opener/);
 assert.match(app,/\/api\/auth\/central-exchange/);
 assert.match(app,/verifyOtp/);
 assert.match(middleware,/portal-start/);
});
