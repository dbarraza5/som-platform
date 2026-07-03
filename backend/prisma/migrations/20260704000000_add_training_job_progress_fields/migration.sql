-- Mirrors statusRNA.dat's "ciclos"/"iteracion" fields (Phase 10.4), synced
-- periodically by the Worker while som_ trains. Nullable: unset until the
-- first status read after the process starts.
ALTER TABLE "TrainingJob" ADD COLUMN "currentIteration" INTEGER;
ALTER TABLE "TrainingJob" ADD COLUMN "currentCycle" INTEGER;
