param(
  [switch]$InstallDependencies,
  [switch]$StartDev
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
if ($text -match '(?m)^COMMANDER_LOCAL_READ_ONLY=') {
  $text = [regex]::Replace($text, '(?m)^COMMANDER_LOCAL_READ_ONLY=.*$', 'COMMANDER_LOCAL_READ_ONLY=true')
} else {
  $text = $text.TrimEnd() + "`r`nCOMMANDER_LOCAL_READ_ONLY=true`r`n"
}
if ($text -match '(?m)^NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=') {
  $text = [regex]::Replace($text, '(?m)^NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=.*

Write-Host ""
Write-Host "IMPORTANTE: configure as credenciais apenas no seu .env.local, nunca no GitHub." -ForegroundColor Yellow
Write-Host "O bloqueio local cobre metodos de escrita nas APIs Next.js, nao o acesso direto ao Supabase." -ForegroundColor Yellow
Write-Host "Nao copie chaves service_role de producao para desenvolver."
Write-Host "Revise NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY."
Write-Host ""

if ($InstallDependencies) { npm ci --no-audit --no-fund; if($LASTEXITCODE -ne 0){throw "npm ci falhou"} }
if ($StartDev) {
  npm run env:check
  if ($LASTEXITCODE -ne 0) { throw "Preencha primeiro as variaveis exigidas." }
  npm run dev
}
, 'NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=true')
} else {
  $text = $text.TrimEnd() + "`r`nNEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=true`r`n"
}
Set-Content -LiteralPath $envPath -Value $text -Encoding utf8

Write-Host ""
Write-Host "IMPORTANTE: configure as credenciais apenas no seu .env.local, nunca no GitHub." -ForegroundColor Yellow
Write-Host "O bloqueio local cobre metodos de escrita nas APIs Next.js, nao o acesso direto ao Supabase." -ForegroundColor Yellow
Write-Host "Nao copie chaves service_role de producao para desenvolver."
Write-Host "Revise NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY."
Write-Host ""

if ($InstallDependencies) { npm ci --no-audit --no-fund; if($LASTEXITCODE -ne 0){throw "npm ci falhou"} }
if ($StartDev) {
  npm run env:check
  if ($LASTEXITCODE -ne 0) { throw "Preencha primeiro as variaveis exigidas." }
  npm run dev
}
