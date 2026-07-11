# deploy-s3.ps1
# Ejecutar desde la carpeta frontend/: .\scripts\deploy-s3.ps1

$BUCKET = "som-platform-frontend"
$DISTRIBUTION_ID = "[REEMPLAZAR_CON_ID_DE_CLOUDFRONT]"

Write-Host "Compilando frontend..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build fallido"; exit 1 }

Write-Host "Subiendo a S3..."
aws s3 sync dist/ s3://$BUCKET --delete

Write-Host "Invalidando cache de CloudFront..."
aws cloudfront create-invalidation `
  --distribution-id $DISTRIBUTION_ID `
  --paths "/*"

Write-Host "Deploy completado"
