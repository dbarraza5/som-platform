-- Tracks how many times the Worker has attempted to resume this
-- TrainingJob after an interruption (Phase 10.5). Persisted so the count
-- survives a Worker restart, since that's exactly the scenario recovery
-- exists to handle.
ALTER TABLE "TrainingJob" ADD COLUMN "recoveryAttempts" INTEGER NOT NULL DEFAULT 0;
