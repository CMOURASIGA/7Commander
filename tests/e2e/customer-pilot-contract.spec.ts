import { expect, test } from "@playwright/test";
import { shouldEnforceCustomerPilot } from "../../lib/customer-pilot";

const qaOrg = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrg = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("central access is opt-in for one approved customer organization", () => {
  const base = {
    enabled: true,
    isPlatformAdmin: false,
    activeOrganizationId: qaOrg,
    pilotOrganizationId: qaOrg,
  };
  expect(shouldEnforceCustomerPilot(base)).toBe(true);
  expect(shouldEnforceCustomerPilot({ ...base, activeOrganizationId: otherOrg })).toBe(false);
  expect(shouldEnforceCustomerPilot({ ...base, enabled: false })).toBe(false);
  expect(shouldEnforceCustomerPilot({ ...base, isPlatformAdmin: true })).toBe(false);
  expect(shouldEnforceCustomerPilot({ ...base, pilotOrganizationId: "" })).toBe(false);
  expect(shouldEnforceCustomerPilot({ ...base, pilotOrganizationId: "not-a-uuid" })).toBe(false);
});
