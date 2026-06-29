-- Step 1: Drop TrainingJob (references old enum and old projectId FK)
DROP TABLE IF EXISTS "TrainingJob";

-- Step 2: Replace TrainingStatus enum
--         PostgreSQL requires recreating the type when removing values
DROP TYPE IF EXISTS "TrainingStatus";
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Step 3: Remove trainingJobs relation from Project
--         (was a virtual Prisma relation backed by TrainingJob.projectId FK — already dropped above)

-- Step 4: Create Dataset table
CREATE TABLE "Dataset" (
    "id"               TEXT        NOT NULL,
    "projectId"        TEXT        NOT NULL,
    "name"             TEXT        NOT NULL,
    "description"      TEXT,
    "originalFilename" TEXT,
    "storageKey"       TEXT,
    "mimeType"         TEXT,
    "fileSize"         INTEGER,
    "rows"             INTEGER,
    "columns"          INTEGER,
    "uploadedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Dataset"
    ADD CONSTRAINT "Dataset_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Recreate TrainingJob linked to Dataset
CREATE TABLE "TrainingJob" (
    "id"                       TEXT            NOT NULL,
    "datasetId"                TEXT            NOT NULL,
    "name"                     TEXT            NOT NULL,
    "description"              TEXT,
    "status"                   "TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "progress"                 INTEGER         NOT NULL DEFAULT 0,
    "gridWidth"                INTEGER         NOT NULL,
    "gridHeight"               INTEGER         NOT NULL,
    "alpha"                    DOUBLE PRECISION NOT NULL,
    "beta"                     DOUBLE PRECISION NOT NULL,
    "neighborhoodRadius"       DOUBLE PRECISION NOT NULL,
    "objectiveDimensionWeight" DOUBLE PRECISION NOT NULL,
    "useLogarithmicForget"     BOOLEAN         NOT NULL DEFAULT false,
    "threadCount"              INTEGER         NOT NULL DEFAULT 1,
    "iterationLimit"           INTEGER,
    "startedAt"                TIMESTAMP(3),
    "finishedAt"               TIMESTAMP(3),
    "errorMessage"             TEXT,
    "createdAt"                TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TrainingJob"
    ADD CONSTRAINT "TrainingJob_datasetId_fkey"
    FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
