param(
  [switch]$InstallDependencies,
  [switch]$StartDev,
  [switch]$EnableCrud
)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path ".env.example")) { throw "Arquivo .env.example ausente." }
if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host "Criado .env.local a partir de .env.example." -ForegroundColor Green
} else {
  Write-Host ".env.local existente preservado (sem sobrescrita)." -ForegroundColor Yellow
}

$envPath = (Resolve-Path ".env.local").Path
$text = Get-Content -Raw -LiteralPath $envPath
$text = [regex]::Replace($text, '(?m)^NEXT_PUBLIC_APP_URL=.*$', 'NEXT_PUBLIC_APP_URL=http://localhost:3000')
function Set-LocalEnv([string]$name,[string]$value) {
  $script:text = [regex]::Replace($script:text, "(?m)^$name=.*$", "$name=$value")
  if ($script:text -notmatch "(?m)^$name=") {
    $script:text = $script:text.TrimEnd() + "`r`n$name=$value`r`n"
  }
}
Set-LocalEnv "SEVEN_COMMANDER_TENANT_SCHEMA_READY" "true"
Set-LocalEnv "SEVEN_COMMANDER_MULTI_TENANT_READY" "true"
Set-LocalEnv "COMMANDER_LOCAL_AUTH_ENABLED" "true"
Set-LocalEnv "NEXT_PUBLIC_COMMANDER_LOCAL_AUTH_ENABLED" "true"
if ($EnableCrud) {
  Set-LocalEnv "COMMANDER_LOCAL_READ_ONLY" "false"
  Set-LocalEnv "NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY" "false"
} else {
  # Never silently revert a previously chosen CRUD mode to read-only.
  if ($text -notmatch '(?m)^COMMANDER_LOCAL_READ_ONLY=') { Set-LocalEnv "COMMANDER_LOCAL_READ_ONLY" "true" }
  if ($text -notmatch '(?m)^NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=') { Set-LocalEnv "NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY" "true" }
}
Set-Content -LiteralPath $envPath -Value $text -Encoding utf8

Write-Host ""
Write-Host "Configuracao local multiempresa ativada. Modo de escrita conforme .env.local." -ForegroundColor Green
Write-Host "ATENCAO: se READ_ONLY=false, todo CRUD permitido por RLS sera gravado no Supabase oficial." -ForegroundColor Yellow
Write-Host "Nao copie chaves service_role de producao para desenvolver." -ForegroundColor Yellow
Write-Host "Revise NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY."

if ($InstallDependencies) { npm ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw "npm ci falhou" } }
if ($StartDev) {
  npm run env:check
  if ($LASTEXITCODE -ne 0) { throw "Preencha primeiro as variaveis exigidas." }
  npm run dev
}
