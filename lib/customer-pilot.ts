/** Customer central access is opt-in and scoped to one validated tenant. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function shouldEnforceCustomerPilot(input: {
  enabled: boolean;
  isPlatformAdmin: boolean;
  activeOrganizationId: string | null;
  pilotOrganizationId: string | null;
}): boolean {
  return Boolean(
    input.enabled &&
      !input.isPlatformAdmin &&
      input.activeOrganizationId &&
      input.pilotOrganizationId &&
      uuid.test(input.pilotOrganizationId) &&
      input.activeOrganizationId === input.pilotOrganizationId,
  );
}
