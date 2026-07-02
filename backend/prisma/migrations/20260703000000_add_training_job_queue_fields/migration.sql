-- TrainingJob initial state is now called QUEUED (was PENDING) to match the
-- training queue introduced in this phase.
ALTER TYPE "TrainingStatus" RENAME VALUE 'PENDING' TO 'QUEUED';

-- Mirrors the som_ executable's NUMERO_NEURONAS config field (Phase 9).
-- Stored explicitly rather than derived on read so every TrainingJob keeps
-- the exact neuron count it was created with.
ALTER TABLE "TrainingJob" ADD COLUMN "neuronCount" INTEGER NOT NULL;
