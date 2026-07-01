CREATE TYPE "NormalizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Dataset"
  ADD COLUMN "normalizationStatus" "NormalizationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "normalizationError"  TEXT;
