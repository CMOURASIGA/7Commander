import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("INT-01 pilot tenant UUID uses five groups", () => {
  const text = source("lib/customer-pilot.ts");
  assert.match(text, /\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/);
});

test("INT-01 client mutations are hidden for read-only pilot", () => {
  const text = source("app/clients/page.tsx");
  assert.match(text, /useCentralPilotReadOnly/);
  assert.match(text, /readOnly \|\| checking \|\| !form\.name\.trim/);
  assert.match(text, /!readOnly && !checking \? <SurfaceCard>/);
  assert.match(text, /!readOnly && !checking \? <div className="flex gap-2"/);
});

test("INT-01 company selector requires server-derived switch permission", () => {
  const text = source("app/organizations/page.tsx");
  assert.match(text, /if\(!canSwitchCompany \|\| checking \|\| !orgs\.some/);
  assert.match(text, /Empresa ativa confirmada/);
});

test("INT-01 project create and management controls are hidden", () => {
  const text = source("app/projects/page.tsx");
  assert.match(text, /if \(readOnly \|\| checking\) return/);
  assert.match(text, /!readOnly && !checking && manageProjectsOpen/);
});

test("INT-01 UI guard does not replace server authorization", () => {
  const text = source("lib/use-central-pilot-read-only.ts");
  assert.match(text, /\/api\/auth\/ui-capabilities/);
  assert.match(text, /readOnly:true,checking:false,canSwitchCompany:false/);
});
