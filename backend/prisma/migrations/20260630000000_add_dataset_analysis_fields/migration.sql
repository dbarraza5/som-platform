-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Dataset"
  ADD COLUMN "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "analysisError"  TEXT;
