# deploy-beanstalk.ps1
# Genera deploy.zip listo para subir a Elastic Beanstalk.
# Ejecutar desde la raiz del proyecto: .\backend\scripts\deploy-beanstalk.ps1

Set-Location "$PSScriptRoot\.."

Write-Host "Compilando TypeScript..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build fallido"; exit 1 }

$zipPath = "deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

$exclude = @("node_modules", "src", "scripts", ".env", ".env.example",
             "storage", "*.log", ".ebignore", ".gitignore", ".dockerignore",
             "deploy.zip", "createdb.js")

$items = Get-ChildItem -Path "." | Where-Object {
    $name = $_.Name
    -not ($exclude | Where-Object { $name -like $_ -or $name -eq $_ })
}

Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -Force

$size = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host "deploy.zip creado ($size KB) — listo para subir en Beanstalk -> Upload and deploy"
