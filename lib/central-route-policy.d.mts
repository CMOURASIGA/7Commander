export function permissionForRoute(path:string,method:string):string|null;
export const localRolePermissions:Readonly<Record<'owner'|'admin'|'manager'|'member',ReadonlyArray<string>>>;
