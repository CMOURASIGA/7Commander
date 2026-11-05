/** INT-01 CP-02/03: pure, fail-closed authorization decision. All inputs MUST be assembled server-side. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = new Set(['owner', 'admin', 'manager', 'member']);
const CODE = /^[A-Za-z0-9_-]{2,100}$/;
const deny = reasonCode => ({ allowed: false, reasonCode });

/**
 * A local role can NEVER exceed the permission ceiling defined by the ACTIVE
 * product-specific central-role mapping. Local membership alone cannot upgrade it.
 * This policy is not authentication and must not be called with browser claims.
 */
export function evaluateCommanderCentralAccess(input) {
  if (!input || input.enabled !== true) return deny('CENTRAL_INTEGRATION_DISABLED');
  const { central, local, mapping, roleLinks, requestedCompanyId, productCode, requiredLocalPermission } = input;
  if (!UUID.test(requestedCompanyId ?? '') || !CODE.test(productCode ?? '') ||
      typeof requiredLocalPermission !== 'string' || !requiredLocalPermission)
    return deny('INVALID_CONTEXT');
  if (!central?.verified || central.accessTokenVerified !== true ||
      !UUID.test(central.identityId ?? '') || !UUID.test(central.clientId ?? ''))
    return deny('CENTRAL_IDENTITY_UNVERIFIED');
  if (!local?.verified || !UUID.test(local.userId ?? '') || !UUID.test(local.companyId ?? '') ||
      local.membershipActive !== true || !ROLES.has(local.role) || !Array.isArray(local.permissions))
    return deny('LOCAL_MEMBERSHIP_INVALID');
  if (local.companyId !== requestedCompanyId) return deny('COMPANY_CONTEXT_MISMATCH');
  if (!mapping || mapping.status !== 'ACTIVE' || mapping.companyStatus !== 'ACTIVE' || mapping.identityStatus !== 'ACTIVE' ||
      mapping.clientId !== central.clientId || mapping.companyId !== requestedCompanyId ||
      mapping.identityId !== central.identityId || mapping.userId !== local.userId)
    return deny('EXPLICIT_MAPPING_REQUIRED');
  const decision = central.decision;
  if (!decision || decision.allowed !== true || decision.reasonCode !== 'ACCESS_GRANTED' ||
      decision.identityId !== central.identityId || decision.clientId !== central.clientId ||
      decision.productCode !== productCode || !Array.isArray(decision.roleCodes) ||
      !decision.roleCodes.length || !decision.roleCodes.every(code => typeof code === 'string' && CODE.test(code)))
    return deny('CENTRAL_ACCESS_DENIED');
  if (!Array.isArray(roleLinks)) return deny('ROLE_MAPPING_REQUIRED');
  const matchingLinks = roleLinks.filter(link => link && link.status === 'ACTIVE' &&
    link.productCode === productCode && decision.roleCodes.includes(link.centralRoleCode) &&
    link.commanderRole === local.role && Array.isArray(link.allowedPermissions));
  if (!matchingLinks.length) return deny('ROLE_MAPPING_DENIED');
  if (!local.permissions.includes(requiredLocalPermission)) return deny('LOCAL_PERMISSION_DENIED');
  if (!matchingLinks.some(link => link.allowedPermissions.includes(requiredLocalPermission)))
    return deny('CENTRAL_ROLE_PERMISSION_DENIED');
  return { allowed: true, reasonCode: 'ACCESS_GRANTED', companyId: requestedCompanyId, userId: local.userId };
}
