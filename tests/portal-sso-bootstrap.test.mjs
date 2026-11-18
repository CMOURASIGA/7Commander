import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("portal-start is reachable before local Commander session", () => {
  const appShell = read("components/layout/app-shell.tsx");
  const middleware = read("middleware.ts");
  assert.match(appShell, /pathname === "\/portal-start"/);
  assert.match(middleware, /'\/portal-start'/);
});

test("first-login JIT uses centrally verified per-company entitlement, not membership listing", () => {
  const exchange = read("app/api/auth/central-exchange/route.ts");
  assert.doesNotMatch(exchange, /\/api\/v1\/authorization\/memberships/);
  assert.match(exchange, /checkCentralProductAccess\(/);
  assert.match(exchange, /entitlement\.identityId !== identityId/);
  assert.match(exchange, /entitlement\.roleCodes\[0\] !== "VIEWER"/);
  assert.match(exchange, /\.eq\("status","ACTIVE"\)\.limit\(51\)/);
});
