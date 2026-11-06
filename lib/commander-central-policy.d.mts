export type CentralPolicyInput = {
 enabled:boolean; productCode:string; requestedCompanyId:string;requiredLocalPermission:string;
 central:{verified:boolean;accessTokenVerified:boolean;identityId:string;clientId:string;decision:{allowed:boolean;reasonCode:string;identityId:string;clientId:string;productCode:string;roleCodes:string[]}};
 local:{verified:boolean;userId:string;companyId:string;membershipActive:boolean;role:'owner'|'admin'|'manager'|'member';permissions:string[]};
 mapping:{status:string;companyStatus:string;identityStatus:string;clientId:string;companyId:string;identityId:string;userId:string};
 roleLinks:{status:string;productCode:string;centralRoleCode:string;commanderRole:string;allowedPermissions:string[]}[];
};
export function evaluateCommanderCentralAccess(input:CentralPolicyInput):{allowed:boolean;reasonCode:string};
