#!/bin/bash
set -e

BUCKET="som-platform-frontend"
DISTRIBUTION_ID="[REEMPLAZAR_CON_ID_DE_CLOUDFRONT]"

echo "Compilando frontend..."
npm run build

echo "Subiendo a S3..."
aws s3 sync dist/ s3://$BUCKET --delete

echo "Invalidando cache de CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Deploy completado"
