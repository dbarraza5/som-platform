#!/bin/bash
set -e

echo "Compilando TypeScript..."
npm run build

echo "Creando paquete de deploy..."
zip -r deploy.zip . \
  --exclude "*.ts" \
  --exclude "src/*" \
  --exclude "scripts/*" \
  --exclude "node_modules/*" \
  --exclude ".env*" \
  --exclude "*.log" \
  --exclude "storage/*"

echo "Paquete creado: deploy.zip"
echo "Sube deploy.zip en Beanstalk -> Upload and deploy"
