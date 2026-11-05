/** INT01: allowlist of server-owned operation identifiers for central pilot. */
const RULES = [

  // CP-04: previously unmapped modules. Each operation is explicit and remains
  // denied until central product role mapping grants the exact permission.
  [/^\/api\/chat$/, { POST:'chat.use' }],
  [/^\/api\/conversations(?:\/.*)?$/, { GET:'conversations.view', POST:'conversations.write', PATCH:'conversations.write', DELETE:'conversations.delete' }],
  [/^\/api\/memories(?:\/.*)?$/, { GET:'memories.view', POST:'memories.write', PATCH:'memories.write', DELETE:'memories.delete' }],
  [/^\/api\/voice(?:\/.*)?$/, { POST:'voice.use' }],
  [/^\/api\/daily$/, { GET:'daily.view', POST:'daily.write' }],
  [/^\/api\/integrations\/(?:gmail\/messages|google-calendar\/events|google-drive\/files|azure-devops\/work-items)$/, { GET:'integrations.read' }],
  [/^\/api\/integrations\/n8n\/flows$/, { GET:'integrations.read', POST:'integrations.execute' }],
  [/^\/api\/integrations\/health$/, { GET:'integrations.health' }],
  [/^\/api\/kairos\/profile$/, { GET:'kairos.profile.read', PATCH:'kairos.profile.write', POST:'kairos.profile.write', PUT:'kairos.profile.write' }],
  [/^\/api\/auth\/profile$/, { POST:'profile.write' }],
  [/^\/api\/auth\/ui-capabilities$/, { GET:'organizations.view' }],
  [/^\/api\/status-report\/logo$/, { GET:'reports.view' }],
  // Administrative and platform APIs intentionally have NO customer permission.
  // Session endpoints are secured independently using local JWT + Origin checks.
  [/^\/api\/projects(?:\/.*)?$/, { GET:'projects.view', HEAD:'projects.view', POST:'projects.write', PATCH:'projects.write', PUT:'projects.write', DELETE:'projects.delete' }],
  [/^\/api\/tasks(?:\/.*)?$/, { GET:'tasks.view', POST:'tasks.write', PATCH:'tasks.write', PUT:'tasks.write', DELETE:'tasks.delete' }],
  [/^\/api\/risks(?:\/.*)?$/, { GET:'risks.view', POST:'risks.write', PATCH:'risks.write', PUT:'risks.write', DELETE:'risks.delete' }],
  [/^\/api\/decisions(?:\/.*)?$/, { GET:'decisions.view', POST:'decisions.write', PATCH:'decisions.write', PUT:'decisions.write', DELETE:'decisions.delete' }],
  [/^\/api\/knowledge(?:\/.*)?$/, { GET:'knowledge.view', POST:'knowledge.write', PATCH:'knowledge.write', PUT:'knowledge.write', DELETE:'knowledge.delete' }],
  [/^\/api\/clients(?:\/.*)?$/, { GET:'clients.view', POST:'clients.write', PATCH:'clients.write', PUT:'clients.write', DELETE:'clients.delete' }],
  [/^\/api\/organizations\/mine$/, { GET:'organizations.view' }],
  [/^\/api\/organizations\/branding$/, { GET:'organizations.view' }],
  [/^\/api\/organizations\/select$/, { POST:'organizations.select' }],
  [/^\/api\/status-report(?:\/.*)?$/, { GET:'reports.view', POST:'reports.write', PATCH:'reports.write' }],
  [/^\/api\/planning(?:\/.*)?$/, { GET:'planning.view', POST:'planning.write', PATCH:'planning.write', DELETE:'planning.delete' }],
  [/^\/api\/my-tasks(?:\/.*)?$/, { GET:'tasks.view', POST:'tasks.write', PATCH:'tasks.write' }],
  [/^\/api\/operational-decisions(?:\/.*)?$/, { GET:'decisions.view', POST:'decisions.write', PATCH:'decisions.write' }],
  [/^\/api\/activities(?:\/.*)?$/, { GET:'activities.view' }],
  [/^\/api\/team(?:\/.*)?$/, { GET:'team.view', POST:'team.write', PATCH:'team.write' }],
];
export function permissionForRoute(path, method) {
  if (typeof path !== 'string' || typeof method !== 'string') return null;
  const upper = method.toUpperCase();
  for (const [pattern, perms] of RULES) if (pattern.test(path)) return perms[upper] ?? null;
  return null; // fail closed on new route or mutation
}
export const localRolePermissions = Object.freeze({
  owner: ['projects.view','projects.write','projects.delete','tasks.view','tasks.write','tasks.delete','risks.view','risks.write','risks.delete','decisions.view','decisions.write','decisions.delete','knowledge.view','knowledge.write','knowledge.delete','clients.view','clients.write','clients.delete','organizations.view','organizations.select','reports.view','reports.write','planning.view','planning.write','planning.delete','activities.view','team.view','team.write'],
  admin: ['projects.view','projects.write','tasks.view','tasks.write','risks.view','risks.write','decisions.view','decisions.write','knowledge.view','knowledge.write','clients.view','clients.write','organizations.view','organizations.select','reports.view','reports.write','planning.view','planning.write','activities.view','team.view','team.write'],
  manager: ['projects.view','projects.write','tasks.view','tasks.write','risks.view','risks.write','decisions.view','decisions.write','knowledge.view','knowledge.write','clients.view','organizations.view','organizations.select','reports.view','planning.view','planning.write','activities.view','team.view'],
  member: ['projects.view','tasks.view','risks.view','decisions.view','knowledge.view','clients.view','organizations.view','reports.view','planning.view','activities.view'],
});
