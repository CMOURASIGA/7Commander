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
foreach ($name in @("COMMANDER_LOCAL_READ_ONLY", "NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY", "SEVEN_COMMANDER_TENANT_SCHEMA_READY", "SEVEN_COMMANDER_MULTI_TENANT_READY")) {
  if ($text -match "(?m)^$name=") {
    $text = [regex]::Replace($text, "(?m)^$name=.*$", "$name=true")
  } else {
    $text = $text.TrimEnd() + "`r`n$name=true`r`n"
  }
}
Set-Content -LiteralPath $envPath -Value $text -Encoding utf8

Write-Host ""
Write-Host "Configuracao local somente leitura e multiempresa ativadas." -ForegroundColor Green
Write-Host "A protecao HTTP e do cliente Supabase nao substitui permissao SQL read-only." -ForegroundColor Yellow
Write-Host "Nao copie chaves service_role de producao para desenvolver." -ForegroundColor Yellow
Write-Host "Revise NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY."

if ($InstallDependencies) { npm ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw "npm ci falhou" } }
if ($StartDev) {
  npm run env:check
  if ($LASTEXITCODE -ne 0) { throw "Preencha primeiro as variaveis exigidas." }
  npm run dev
}
