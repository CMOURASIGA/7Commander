import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function parseEnvFile(content) {
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    entries[key] = value;
  }

  return entries;
}

if (!fs.existsSync(envPath)) {
  console.error("Arquivo .env.local nao encontrado.");
  console.error("Copie .env.example para .env.local e preencha os valores.");
  process.exit(1);
}

const fileContent = fs.readFileSync(envPath, "utf8");
const values = parseEnvFile(fileContent);
const localReadOnly = values.COMMANDER_LOCAL_READ_ONLY === "true" && values.NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY === "true";
const localAuthenticated = values.COMMANDER_LOCAL_AUTH_ENABLED === "true";
const needed = localAuthenticated || localReadOnly
  ? required.filter(key => key !== "SUPABASE_SERVICE_ROLE_KEY" && key !== "OPENAI_API_KEY")
  : required;
const missing = needed.filter((key) => !values[key]);

if ((localReadOnly || localAuthenticated) && values.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Modo local autenticado nao pode conter SUPABASE_SERVICE_ROLE_KEY. Remova o valor do .env.local.");
  process.exit(1);
}

if (missing.length > 0) {
  console.error("Variaveis obrigatorias ausentes no .env.local:");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

console.log(localAuthenticated
  ? `Env OK: autenticacao local RLS. Escrita ${localReadOnly ? "bloqueada" : "permitida segundo autorizacao RLS"}; sem service_role.`
  : localReadOnly ? "Env OK: modo local leitura." : "Env OK.");
