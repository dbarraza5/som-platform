# SOM Platform — Worker

Python 3.12 process. Consumes two independent Redis queues (`src/services/dispatcher.py` routes each message by its `operation` field): normalization jobs (`src/services/message_handler.py`, Phases 7.3–7.6) and, since Phase 10.2, training-environment preparation (`src/services/training_message_handler.py`). See the root [README](../README.md) and [docs/architecture.md](../docs/architecture.md) for the full system.

## SOM training executable (Phase 9)

**This phase only integrates and studies the executable. No training runs yet — `message_handler.py` does not invoke it.** That's the next phase.

### Location

```
worker/executables/som_
```

**Not committed to git** — `worker/executables/` is gitignored, same as the root `/ejecutable/` staging folder it was copied from. To rebuild the worker image, place `som_` at `worker/executables/som_` manually before running `docker compose build worker`; the Dockerfile does the rest (see below).

A single statically-linked ELF 64-bit binary (`not a dynamic executable` per `ldd` — no shared-library dependencies, nothing to install on top of `python:3.12-slim`). Not stripped, so its C++ symbol table is still readable (used below to understand its internals without running an actual training job).

The Dockerfile copies the whole build context (`COPY . .`) and then explicitly restores the execute bit, since the host filesystem (Windows/NTFS) doesn't preserve Unix permissions:

```dockerfile
RUN chmod +x executables/som_
```

### Running it manually

The binary always works relative to its **current working directory** — it reads/writes its config and data files next to wherever it's invoked from, not next to the binary itself. To test it without touching the real `executables/` directory:

```bash
docker compose exec worker sh -c "
  mkdir -p /tmp/som_run && cp executables/som_ /tmp/som_run/ && cd /tmp/som_run
  ./som_
"
```

No CLI flags are recognized (`--help`, `-h`, and any other argument are silently ignored — the program always runs the same startup sequence).

### Expected behavior with no Dataset (this phase)

```
$ ./som_
Fichero no encontrado
$ echo $?
0
```

`Fichero no encontrado` ("File not found") and exit code `0` are the **expected, correct** result for this phase — there is no `DatosEntrenamiento.csv` yet. This is not an error. An error would be: the binary failing to start, a missing shared library, a permissions failure, or the two config files below not being generated.

### Files generated on first run

| File | Generated when | Rewritten on later runs? |
|---|---|---|
| `ConfiguracionRNA.conf` | Only if it doesn't already exist | **No** — once present, its values are treated as authoritative and read as-is. |
| `ConfiguracionRNA.xml` | Every run | **Yes** — always rewritten from whatever `ConfiguracionRNA.conf` currently contains, plus the row count actually read from the training CSV (`0` when the file is missing). |

This was confirmed experimentally: pre-seeding a custom `ConfiguracionRNA.conf` before running causes `ConfiguracionRNA.xml` to reflect those custom values on output, while deleting `ConfiguracionRNA.conf` (even with a customized `.xml` still present) causes both files to be regenerated from scratch with hardcoded defaults, ignoring the leftover `.xml`. **`.conf` is the single source of truth; `.xml` is a derived, always-regenerated report.**

#### `ConfiguracionRNA.conf` — default content (first run, nothing pre-existing)

```ini
RUTA_ARCHIVO = DatosEntrenamiento.csv
NUMERO_ENTRADAS = 38
NUMERO_NEURONAS = 1600
LARGO = 40
el largo puede ser cualquier pero el ancho tiene que ser par(para que la estructura hexagonal pueda unirse en sus limites)
como un balon de futbol con caras hexagonales
ANCHO = 40
ALFA = 0.5
BETA = 0.005
RANGO_VECINDAD = 4
PESO_DIMENSION_OBJ = 0
#funciona si el numero de iteraciones es mayor que 0
NUMERO_LIMITE_ITERACIONES = 0
#0: sin olvido logaritmico 1: con olvido logaritmico
OLVIDO_LOGARITMICO = 0
#funciona si el numero de hilos es mayor a 1
NUMERO_HILOS = 1
```

Format: `KEY = value` lines (whitespace-tolerant), plus free-text comment lines mixed in (some prefixed with `#`, some not — the parser apparently just looks for known `KEY =` tokens and ignores everything else). **This is the file the Worker will need to generate dynamically** in the training-integration phase, one per job.

Field-by-field purpose, and how each maps onto the *already-existing* `TrainingJob` Prisma model (`backend/prisma/schema.prisma` — not modified in this phase, mapping noted purely for the next phase's benefit):

| `.conf` key | Meaning | `TrainingJob` field | Static or dynamic per job? |
|---|---|---|---|
| `RUTA_ARCHIVO` | Filename of the training CSV, read relative to the working directory | — (the Worker controls this; the file must be named exactly this and placed next to the binary) | **Dynamic** — or the Worker could keep it fixed at `DatosEntrenamiento.csv` and always place the normalized dataset under that name instead. |
| `NUMERO_ENTRADAS` | Number of input columns/dimensions | derived from `Dataset.columns` / `dimensions.xml` (Phase 7.5), not stored on `TrainingJob` directly | **Dynamic** — must match the dataset being trained, or the program errors out (see below). |
| `NUMERO_NEURONAS` | Total neuron count (appears to just be `LARGO × ANCHO`) | derived from `gridWidth × gridHeight` | **Dynamic**, derived. |
| `LARGO` | Grid length | `gridWidth` or `gridHeight` (needs confirming which axis is which) | **Dynamic** |
| `ANCHO` | Grid width — **must be even** ("para que la estructura hexagonal pueda unirse en sus limites", comment in the file itself) | `gridHeight` or `gridWidth` | **Dynamic** |
| `ALFA` | Learning rate | `alpha` | **Dynamic** |
| `BETA` | Beta parameter | `beta` | **Dynamic** |
| `RANGO_VECINDAD` | Neighborhood radius | `neighborhoodRadius` | **Dynamic** |
| `PESO_DIMENSION_OBJ` | Objective dimension weight | `objectiveDimensionWeight` | **Dynamic** |
| `NUMERO_LIMITE_ITERACIONES` | Iteration cap (`0` = works only "si el numero de iteraciones es mayor que 0", per the file's own comment — unclear yet if `0` means unlimited or means "off") | `iterationLimit` | **Dynamic** |
| `OLVIDO_LOGARITMICO` | `0`/`1` flag for logarithmic forgetting | `useLogarithmicForget` | **Dynamic** |
| `NUMERO_HILOS` | Thread count (only takes effect "si el numero de hilos es mayor a 1", per the file's own comment) | `threadCount` | **Dynamic** |

Every configurable value in this file already has a home in the `TrainingJob` schema — nothing new needs to be added to Prisma for this. `NUMERO_ENTRADAS` is the one exception: it comes from the dataset's dimension count, not from `TrainingJob` itself.

#### `ConfiguracionRNA.xml` — content after a run with no training data

```xml
<configuracion>
     <numero-entradas>38</numero-entradas>
     <numero-neuronas>1600</numero-neuronas>
     <numero-datos>0</numero-datos>
     <largo>40</largo>
     <ancho>40</ancho>
     <alfa>0.5</alfa>
     <beta>0.005</beta>
     <rango-vecindad>4</rango-vecindad>
     <peso-dimension>0</peso-dimension>
     <olvido-logaritmico>0</olvido-logaritmico>
</configuracion>
```

Same fields as the `.conf`, minus `RUTA_ARCHIVO` and `NUMERO_HILOS`, plus one addition: **`numero-datos`** — the row count actually read from the training CSV (`0` here, since the file doesn't exist). This confirms `.xml` is a runtime status report, not a second source of input. (Oddity observed only on the very first-ever run in a fresh directory: `numero-datos` showed a leftover value of `62385` instead of `0` — looked like uninitialized memory rather than a real reading; every run after that consistently showed `0`. Worth re-checking once a real CSV is fed in a later phase, but not a blocker.)

### What else the binary is expected to produce (inferred, not yet observed)

No training data exists yet in this phase, so none of these were actually generated — this is from reading the binary's embedded string table and demangled C++ symbols (the binary isn't stripped), listed here so the training-integration phase knows what to expect and doesn't have to rediscover it:

| File | Evidence | Likely purpose |
|---|---|---|
| `pesosRNA.csv` | `FicheroRNA::guardarPesosRNA` / `FicheroRNA::leerPesosRNA`, error string `"No se pudo leer los pesos RNA :("` | The trained neuron weight matrix — almost certainly **the actual model output** of a training run, and also what a **resumed** run reads back in. |
| `statusRNA.dat` | `FicheroRNA::guardarStatusRNA` / `FicheroRNA::leerStatusRNA`, error string `"No se pudo leer Status de la RNA :("`, `GestionadorSOM::statusProgresoRNA` | Training progress/checkpoint state — likely what backs a **progress percentage** (`TrainingJob.progress` already exists in the schema for this) and what a resumed run restores from. |
| `activacion_rna.csv` | `FicheroRNA::escribirActivacionRNA(int,int,NeuronaHex**,double**)` | Per-record neuron activation / cluster assignment — probably the file downstream visualization would read. |
| `aux.csv` | referenced directly as a string constant | Purpose unclear from the name alone; not yet observed being written. |

Also found: `GestionadorSOM::empezarEntrenamiento()` **and** `GestionadorSOM::reanudarEntrenamiento()` ("resume training") — the binary appears to natively support resuming a training run from `statusRNA.dat` + `pesosRNA.csv`, which lines up with `TrainingJob.progress` existing in the schema already.

The stdout progress line format was also found as a literal string: `"total: %d | iteracion: %d | por: %f| ciclo: %d"` — this is almost certainly printed during training and would be what the training-integration phase parses to update `TrainingJob.progress` in near-real-time.

One validation to be aware of: `"Error Archivo Configuracion: El numero de columnas del archivo no coincide con el numero entrada."` — the program checks that the training CSV's column count matches `NUMERO_ENTRADAS`. The Worker will need to set `NUMERO_ENTRADAS` from the dataset's actual dimension count (available from `dimensions.xml`, Phase 7.5) before invoking the binary, not leave it at the default `38`.

### Open question for the next phase

The normalization algorithm (Phase 7.5) outputs `normalized.csv` as **semicolon-delimited, no header row**. Whether `FicheroRNA::leerCSV(...)` (the binary's CSV reader) expects that same format hasn't been verified — doing so would require supplying an actual training file, which is out of scope for this phase (the goal here was specifically the "no dataset present" path). Confirm this before wiring the two together.

### Error handling

Only these count as real failures for this phase — everything else (including "file not found") is expected:

- the binary doesn't start / isn't executable
- a missing shared library (`ldd` reported none — should not happen, but re-check if the base image ever changes)
- a permissions error
- `ConfiguracionRNA.conf` / `ConfiguracionRNA.xml` fail to be created on first run

None of these occurred during this phase's verification.

---

## Training Environment Preparation (Phase 10.2)

**This phase only prepares the working directory — it does not run `som_`.** `training_message_handler.py` never invokes the binary; that's the next phase. On success the `TrainingJob` is left exactly as it was (`QUEUED`) — only failure changes its status, to `FAILED`.

### Consuming two queues

`src/main.py` now calls `consumer.consume([QUEUE_NAME, TRAINING_QUEUE_NAME], dispatch_message)`. `RedisQueueConsumer.consume()` does a single `BRPOP` across both list keys — whichever has a message first wins — and `dispatcher.py` routes the decoded message by its `operation` field (`NORMALIZE` → `message_handler.handle_message`, `TRAIN` → `training_message_handler.handle_training_message`). One process, one connection, no separate consumer thread per queue.

### The queue message only identifies the job

Per Phase 10.1, the `TRAIN` message is `{ operation, trainingJobId, datasetId, timestamp }` — no file paths, no training parameters. `handle_training_message()` treats that as the only trustworthy part of the message and fetches everything else from the Backend:

```
handle_training_message(message)
        │
  GET /api/internal/training-jobs/:id   (X-Internal-Api-Key)  → TrainingJob (params, datasetId)
        │
  GET /api/internal/datasets/:id        (X-Internal-Api-Key)  → Dataset (projectId, normalizationStatus)
        │
        ▼
  os.makedirs(storage/training/<trainingJobId>/)
        │
        ▼
  storage.download(                                            ← same IStorageProvider as Phase 7.4
    "projects/<projectId>/datasets/<datasetId>/normalized.csv",
    storage/training/<trainingJobId>/DatosEntrenamiento.csv,
  )
        │
        ▼
  count_columns(DatosEntrenamiento.csv)   → NUMERO_ENTRADAS
        │
        ▼
  TrainingEnvironmentService.generate_conf(...)  → ConfiguracionRNA.conf (validated immediately)
        │
        ▼
  Entorno preparado correctamente — TrainingJob.status untouched, still QUEUED
```

Two new internal Backend endpoints back this (both `internalAuth`, same shared-secret pattern as the Phase 7.6 normalization callback):

| Endpoint | Purpose |
|---|---|
| `GET /api/internal/training-jobs/:id` | Fetch a TrainingJob's full row (params + datasetId) |
| `GET /api/internal/datasets/:id` | Fetch a Dataset's full row (projectId, normalizationStatus, …) |
| `PATCH /api/internal/training-jobs/:id/status` | Report `FAILED` (or, in later phases, `RUNNING`/`COMPLETED`) with an error message |

### Training directory structure

```
storage/                                  ← STORAGE_LOCAL_PATH, the same storage_data
    training/                               volume the backend/worker already share
        <trainingJobId>/
            DatosEntrenamiento.csv        ← copy of normalized.csv, StorageProvider.download()
            ConfiguracionRNA.conf         ← generated by this phase
```

Unlike the ephemeral `temp/job-<datasetId>/` used for normalization (Phase 7.5–7.6), this directory is **never cleaned up** — on purpose. It lives under the same persistent `storage_data` volume the backend also mounts, specifically so it survives a Worker container restart. That's what "reanudación automática" (a later phase) needs: `pesosRNA.csv` + `statusRNA.dat` (Phase 9's findings) will land in this same directory once training actually runs, and a resumed job just needs to find them here again. Every `TrainingJob` gets its own directory — nothing is ever shared between two jobs, even against the same Dataset.

### Calculating `NUMERO_ENTRADAS`

Explicitly **not** read from `Dataset.columns` (that reflects the original, pre-normalization CSV, analyzed synchronously on upload — Phase 6.4). Instead, `count_columns()` (`training_environment_service.py`) opens the freshly-downloaded `DatosEntrenamiento.csv` itself, reads the first non-empty line, and counts `;`-separated fields — the exact delimiter `NormalizationService` (Phase 7.5) writes with, headerless. This guarantees `NUMERO_ENTRADAS` always matches the file `som_` will actually be pointed at, regardless of what the database happens to say.

### Generating `ConfiguracionRNA.conf`

`TrainingEnvironmentService.generate_conf()` writes all twelve keys `som_` expects (Phase 9's findings) in one pass, sourced only from the `TrainingJob` fetched from the Backend plus the freshly-computed `NUMERO_ENTRADAS` — never from the queue message:

| `.conf` key | Source |
|---|---|
| `RUTA_ARCHIVO` | Always the literal `DatosEntrenamiento.csv` |
| `NUMERO_ENTRADAS` | Computed by `count_columns()`, not stored anywhere |
| `NUMERO_NEURONAS` | `TrainingJob.neuronCount` (already `gridWidth × gridHeight`, computed server-side in Phase 10.1) |
| `LARGO` / `ANCHO` | `TrainingJob.gridWidth` / `TrainingJob.gridHeight` — **assumed** mapping, not yet confirmed against the binary (see Phase 9's open question about which axis is "ancho") |
| `ALFA` / `BETA` / `RANGO_VECINDAD` / `PESO_DIMENSION_OBJ` | `TrainingJob.alpha` / `.beta` / `.neighborhoodRadius` / `.objectiveDimensionWeight` |
| `NUMERO_LIMITE_ITERACIONES` | `TrainingJob.iterationLimit`, or `0` if not set |
| `OLVIDO_LOGARITMICO` | `1` if `TrainingJob.useLogarithmicForget` else `0` |
| `NUMERO_HILOS` | `TrainingJob.threadCount` |

Immediately after writing, `validate_conf()` re-reads the file, confirms all twelve keys are present, and confirms `NUMERO_ENTRADAS` matches what was computed — not just that the file is non-empty. Any mismatch raises, which `handle_training_message()` catches and reports as a `FAILED` TrainingJob with a clear `errorMessage`.

### Why `ConfiguracionRNA.xml` is not generated here

Per Phase 9's findings, `.xml` is not a second input — it's a status report `som_` **always regenerates on every run** from whatever `.conf` currently contains, plus the row count it actually reads from the training CSV. Writing it ourselves would be redundant (it'll be overwritten the instant `som_` runs) and risks the file briefly claiming a `numero-datos` count that hasn't actually been read yet. It's left for the executable to produce once it starts running, in the next phase.

### Error handling

Every step above is wrapped in one `try/except` in `handle_training_message()`. Any failure — the Backend being unreachable, the TrainingJob or Dataset not existing, the normalized CSV missing from storage, an empty CSV, or a `ConfiguracionRNA.conf` validation failure — is caught, logged with a clear message, and reported to the Backend via `PATCH .../status` (`status: FAILED`, `errorMessage`). `report_training_job_failed()` itself never raises (mirrors `BackendNotifier` from Phase 7.6), so a Backend outage during the failure report can't crash the Worker either. The training directory is **not** deleted on failure — kept for diagnosis, same reasoning as Phase 7.6's normalization temp dir.

### Worker environment variable

| Variable | Default | Description |
|----------|---------|-------------|
| `TRAINING_QUEUE_NAME` | `training_jobs` | Second queue the Worker listens on, alongside `QUEUE_NAME` |

---

## Running the Training (Phase 10.3)

Immediately after environment preparation succeeds (Phase 10.2, same `handle_training_message()` call), the Worker now actually runs `som_` to completion. **Still no progress reporting, no automatic resume, no uploading results to Storage** — those are later phases. On success, nothing except `TrainingJob.status`/`startedAt`/`finishedAt` changes; `progress` is explicitly set to `0` when entering `RUNNING` and is never touched again in this phase.

### How the Worker runs `som_`

`TrainingExecutionService.run(working_dir)` (`training_execution_service.py`) calls:

```python
subprocess.run([SOM_EXECUTABLE_PATH], cwd=working_dir, capture_output=True, text=True)
```

- **`cwd=working_dir`** — the process is launched with its working directory set to `storage/training/<trainingJobId>/`, not the Worker's own `/app`. This is what makes `som_` find `ConfiguracionRNA.conf` and `DatosEntrenamiento.csv` using their bare, relative names (Phase 9's finding: the binary always resolves paths relative to whatever directory it's invoked from). `SOM_EXECUTABLE_PATH` itself is resolved to an absolute path (`os.path.abspath("executables/som_")`, computed from the Worker's own cwd, which subprocess's `cwd=` parameter doesn't change) so it's still found correctly regardless of where the child process's cwd points.
- **`capture_output=True`** — this is `subprocess.run`'s built-in `Popen(...).communicate()` under the hood, which reads stdout and stderr concurrently as the child writes them. Manually wiring up `Popen` with `PIPE` and calling `.wait()` before draining both pipes is a classic deadlock (the child blocks writing to a full pipe buffer while the parent blocks waiting for exit) — `subprocess.run(capture_output=True)` sidesteps that entirely, which is what "la forma más adecuada para ejecutar procesos externos desde Python" means here.
- **`text=True`** — decodes stdout/stderr as `str` instead of `bytes`, so they can go straight into log messages and the `errorMessage` sent to the Backend.
- **No timeout.** `subprocess.run()` blocks the Worker's single message loop until `som_` exits — by design, since "esperar a que el proceso finalice" is the explicit requirement this phase, and there's no worker pool or async execution model yet. The Worker won't pick up its next queue message until the current training finishes. No timeout was added since none was requested; a very long or hung `som_` process would currently block the Worker indefinitely. Worth revisiting once multiple concurrent trainings matter.

### Determining success — and an important caveat

The Worker treats `exit_code == 0` as success (→ `COMPLETED`) and anything else as failure (→ `FAILED`, with `stderr`/`stdout` folded into `errorMessage`). This matches what the phase asks for literally, but **testing this phase surfaced a real limitation worth flagging explicitly**: `som_` appears to *always* exit `0`, even when it didn't actually train.

Reproduced directly (bypassing the Worker, running `som_` by hand in a scratch directory) by deliberately setting `NUMERO_ENTRADAS` in `ConfiguracionRNA.conf` to not match the CSV's real column count:

```
$ ./som_
El numero de columnas del archivo: 3.
Error Archivo Configuracion: El numero de columnas del archivo no coincide con el numero entrada.
$ echo $?
0
```

Same as Phase 9's "Fichero no encontrado" finding — the binary prints a Spanish error message to stdout and exits `0` regardless. Because `handle_training_message()` (Phase 10.2) always computes `NUMERO_ENTRADAS` from the real, freshly-downloaded CSV, this specific mismatch can't happen through the normal automated flow — but it demonstrates that **exit code alone cannot be fully trusted** to distinguish a real training run from an early validation bail-out, for *any* class of `som_`-side error, not just this one.

A real, successful training run was verified end-to-end (see below) and does exit `0` — so exit-code-based detection isn't wrong for the happy path, just not sufficient as the *only* signal for every failure mode. A future phase should strengthen this, e.g. by also checking that `pesosRNA.csv` and `statusRNA.dat` were actually produced (or by matching known error substrings — `"Error Archivo Configuracion"`, `"Fichero no encontrado"` — in stdout) before trusting a `0` exit code as a real success. Not addressed in this phase to avoid guessing at a detection strategy that wasn't specified.

### Detecting generated files

Before running `som_`, the Worker snapshots `os.listdir(training_dir)`. After the process exits, it snapshots again and logs the **set difference** — genuinely new files, not a hardcoded filename list (`DatosEntrenamiento.csv` and `ConfiguracionRNA.conf`, already present from Phase 10.2, are correctly excluded this way). A real training run against a 5-row, 3-column dataset produced all four files Phase 9 predicted from reading the binary's symbol table alone, confirming those predictions:

| File | Confirmed content |
|---|---|
| `ConfiguracionRNA.xml` | Rewritten as expected (Phase 9); `numero-datos` now correctly shows `5`, matching the real row count read — resolves Phase 9's open question about that field. |
| `statusRNA.dat` | Plain `key = value` text, not binary despite the `.dat` extension: `termino_entrenarse = si`, `ciclos = 41`, `iteracion = 205`, plus `alfa`/`beta`/`alfas`/`betas`. This is what a future resume/progress phase would parse. |
| `pesosRNA.csv` | The trained neuron weight matrix — one row per neuron (36 rows for a 6×6 grid), `;`-separated floats, one column per input dimension (3, matching `NUMERO_ENTRADAS`). |
| `activacion_rna.csv` | Generated, not yet inspected in depth — deferred to whichever future phase actually consumes it. |

None of these are uploaded to Storage in this phase — they simply remain in `storage/training/<trainingJobId>/` alongside `DatosEntrenamiento.csv` and `ConfiguracionRNA.conf` (6 files total after a successful run).

### Error handling

Execution failures are caught in a second `try/except` (separate from Phase 10.2's environment-preparation one, so a failure here is clearly attributable to "training execution" vs. "environment prep" in the logged message) and reported the same way: `client.report_training_job_failed(training_job_id, error_message)`. Covers: the executable missing/not executable (raised explicitly by `TrainingExecutionService.run()` before even calling `subprocess.run`), a non-zero exit code (message includes exit code + stderr + stdout), and any unexpected Python-side exception. The training directory is never cleaned up, success or failure — same reasoning as Phase 10.2.

> **Superseded by Phase 10.4 below**: success/failure is no longer decided by exit code alone — see "Determining completion" in the next section. Exit code, stdout, and stderr are still captured and folded into the failure message for diagnostics, per Phase 10.4's explicit instruction that stdout may be kept for debugging but never used to derive status.

### Training directory after a successful run

```
storage/training/<trainingJobId>/
    DatosEntrenamiento.csv       ← Phase 10.2
    ConfiguracionRNA.conf        ← Phase 10.2
    ConfiguracionRNA.xml         ← written by som_ itself
    pesosRNA.csv                 ← written by som_ itself
    statusRNA.dat                ← written by som_ itself
    activacion_rna.csv           ← written by som_ itself
```

---

## Training Monitoring (Phase 10.4)

While `som_` runs, the Worker now periodically reads `statusRNA.dat` — **the single official source of training state** — and syncs it to the Backend. `stdout` is captured for diagnostics only (Phase 10.3) and is never used to derive status or progress, per this phase's explicit instruction.

### `TrainingStatusReader`

`training_status_reader.py`. Its only job is turning `statusRNA.dat` into a `TrainingStatus` domain object:

```python
@dataclass
class TrainingStatus:
    termino_entrenarse: bool   # "si" → True, anything else → False
    ciclos: int
    iteracion: int
    raw: Dict[str, str]        # every key=value pair found, for logging/future use
```

`read(training_dir)` returns `None` — never raises — in three cases, all treated identically by the caller ("no data yet, try again next tick"):
- the file doesn't exist yet (`som_` hasn't written it),
- it exists but is missing one of the three required keys,
- it exists but a line failed to parse as an int (`ValueError`) or a read hit an OS-level error (`OSError`) — this covers reading the file at the exact moment `som_` is mid-write and it's momentarily truncated/malformed, a real race condition since the Worker and `som_` touch the same file concurrently.

### Known `statusRNA.dat` structure

```ini
termino_entrenarse = si
ciclos = 41
iteracion = 205
alfa = 0.4
beta = 0.01
alfas = [-0.01, -0.01, -0.01]
betas = [0.01, 0.01, 0.01]
```

Plain `key = value` text (confirmed in Phase 10.3, re-confirmed here), not binary despite the `.dat` extension. Fields actually used: `termino_entrenarse`, `ciclos`, `iteracion` — the phase's explicit minimum. `alfa`/`beta`/`alfas`/`betas` are parsed into `raw` but **deliberately not stored** on `TrainingJob` (already have `alpha`/`beta` from the job's own config; re-deriving them from a training-time snapshot would be redundant and was explicitly excluded by this phase).

One finding worth noting: `iteracion` (205) equals `ciclos` (41) × the training row count (5) in every run observed — consistent with `ciclos` counting full passes over the dataset and `iteracion` counting per-sample updates.

### How execution changed to allow polling

Phase 10.3's `TrainingExecutionService.run()` used `subprocess.run()`, which blocks until the process exits — leaving no window to read `statusRNA.dat` *during* the run. It's now `subprocess.Popen()` plus a poll loop:

```python
process = subprocess.Popen([self._executable_path], cwd=working_dir, stdout=stdout_f, stderr=stderr_f, text=True)
while process.poll() is None:
    if on_tick is not None:
        on_tick()
    time.sleep(self._poll_interval_s)
```

`stdout`/`stderr` are now redirected to `tempfile.TemporaryFile()` handles instead of `PIPE` — real files, opened *outside* `working_dir` so they never show up in the "generated files" diff, and immune to the classic `PIPE`-fills-up-and-both-sides-block deadlock regardless of how much output accumulates over a long run (the original `capture_output=True` risk from Phase 10.3 doesn't apply to a growing pipe over a multi-hour training the same way it does to a short-lived process). `training_message_handler.py` passes an `on_tick` closure that does the actual read-and-sync work — `TrainingExecutionService` itself still has no idea what happens inside the callback, keeping it ignorant of Redis/Queue/Backend, consistent with every other "pure" service in this Worker.

### Sync frequency and payload

Controlled by `TRAINING_STATUS_POLL_INTERVAL_S` (default `5` seconds). Each tick, if `statusRNA.dat` has readable data:

```
[WORKER] Leyendo statusRNA.dat...
[WORKER] Iteración: 205
[WORKER] Ciclo: 41
[WORKER] Sincronizando estado con Backend...
```

→ `PATCH /api/internal/training-jobs/:id/status` with `{ status: "RUNNING", progress: 0, currentIteration, currentCycle }`. The endpoint (extended this phase) now also accepts `progress`, `currentIteration`, `currentCycle`. A bug from Phase 10.3 was fixed while extending it: `reportStatus` used to set `startedAt = new Date()` on *every* `RUNNING` update — harmless when `RUNNING` was set once, but wrong now that the Worker resends `status: "RUNNING"` on every poll tick. It's now only set `if (data.status === 'RUNNING' && !trainingJob.startedAt)` — first transition only.

If `statusRNA.dat` isn't available yet, the tick just logs `statusRNA.dat todavía no disponible. Reintentando...` and returns without calling the Backend at all — exactly the "wait a few seconds and retry, don't fail immediately" behavior this phase asks for. Observed in practice: for the small (5-row) dataset used throughout this project's manual testing, the entire ~5–10 second training completes before `statusRNA.dat` is ever written mid-run — every tick during execution finds nothing, and the only real data comes from the *final* read after the process exits. The polling and Backend-sync machinery is exercised and correct either way; a longer, real-world training is what would actually show intermediate values flowing through it.

### Progress percentage

`progress` is computed from `TrainingJob.alpha` / `TrainingJob.beta` (the "Omega" field in the Frontend): `total_cycles = alpha / beta`, then `progress = min(100, round(ciclos / total_cycles * 100))` (`_total_cycles` / `_progress_from_cycles` in `training_runner.py`). `alpha` is `som_`'s initial learning rate and `beta` the final rate it decays to, so this ratio approximates the number of decay cycles the run needs — confirmed against real completed runs (e.g. `alpha=0.5`, `beta=0.005` → `total_cycles=100`, and real trainings with those defaults finish around `ciclos≈100-101`). `NUMERO_LIMITE_ITERACIONES` is still **not** used for this (Phase 10.3 already found its semantics aren't fully understood: a run with `iterationLimit=50` still produced `iteracion=205`, so it isn't a hard cap the way its name suggests). `training_job` (with `alpha`/`beta`) is fetched once at the start of `run_and_monitor`, so both the normal flow and Phase 10.5's recovery path get the same calculation for free. If `beta` is ever `0`, `total_cycles` is undefined and `progress` reports `0` rather than dividing by zero.

### Detecting a stalled `statusRNA.dat`

Each tick compares `(ciclos, iteracion)` against the previous successful read. If unchanged for `_STALE_TICKS_WARNING_THRESHOLD` (`3`) consecutive ticks, the Worker logs a `WARNING` — nothing else. Per this phase's explicit scope, no recovery action is taken while `som_` is still running; that only ever happens after a Worker restart (Phase 10.5, below) — a stale-but-still-running process is not touched.

### Determining completion

`statusRNA.dat` is now the sole source of truth for whether training actually finished — not the process's exit code. After `som_` exits, the Worker does one final `TrainingStatusReader.read()`:

- **`termino_entrenarse == True`** → `COMPLETED`, `progress: 100`, `currentIteration`/`currentCycle` set to their final values, monitoring ends.
- **Anything else** (file missing, or present but `termino_entrenarse` isn't `"si"`) → `FAILED`, with an error message that folds in the exit code, the raw `statusRNA.dat` contents if any, and stderr/stdout for diagnostics.

This directly closes the gap flagged in Phase 10.3: `som_` was found to exit `0` even on a genuine configuration error, which made exit code alone unreliable. `termino_entrenarse` is a much stronger signal — it's the executable's own explicit claim about whether it actually finished, not just whether the OS process happened to return cleanly.

### Worker environment variable

| Variable | Default | Description |
|----------|---------|-------------|
| `TRAINING_STATUS_POLL_INTERVAL_S` | `5` | Seconds between `statusRNA.dat` reads while `som_` is running |

---

## Automatic Recovery (Phase 10.5)

If the Worker restarts while a training is in progress — a crash, a redeploy, `docker compose restart` — the `som_` child process dies with it (it's a direct child of the Worker's own process, killed together whenever the container is). This phase makes the Worker notice that on its next startup and pick the training back up, using `som_`'s own native resume support rather than starting over.

### Shared code, not duplicated logic

The actual "run `som_`, poll `statusRNA.dat`, decide `COMPLETED`/`FAILED`" logic (Phases 10.3/10.4) moved out of `training_message_handler.py` into `training_runner.py`'s `run_and_monitor(client, training_job_id, training_dir)`. Both a brand-new `TRAIN` message and a recovered one call the exact same function once the working directory exists — the only difference is who calls it and whether environment preparation (Phase 10.2: download the dataset, generate `ConfiguracionRNA.conf`) runs first.

```
New TRAIN message                          Worker startup
        │                                          │
        ▼                                          ▼
handle_training_message()              recover_interrupted_trainings()
        │                                          │
  prepare environment (10.2)            find TrainingJobs with status=RUNNING
        │                                          │
        └──────────────┬───────────────────────────┘
                        ▼
              training_runner.run_and_monitor()
```

### What happens on startup

`main.py` calls `recover_interrupted_trainings()` right after connecting to Redis, before the Worker starts consuming either queue — so any recovery work finishes before new jobs are picked up:

```
[WORKER] Buscando entrenamientos pendientes de recuperación.
[WORKER] TrainingJob encontrado. trainingJobId=...
[WORKER] Verificando archivos del entrenamiento.
[WORKER] statusRNA.dat encontrado.
[WORKER] Reanudando entrenamiento. trainingJobId=... intento=1/3
[WORKER] Iniciando entrenamiento...
...
[WORKER] Entrenamiento recuperado correctamente. trainingJobId=...
```

`GET /api/internal/training-jobs?status=RUNNING` (new endpoint, same `internalAuth` pattern as everything else) is how the Worker finds candidates — a `TrainingJob` only ends up `RUNNING` in the database while `som_` is actually meant to be executing, so this list is exactly "trainings that didn't get a chance to reach `COMPLETED`/`FAILED` before something died."

### Is it already running? (`TrainingExecutionService.is_running`)

Before touching anything, the Worker checks whether a `som_` process is already alive for that `TrainingJob` — the phase's "si ya existe, no hacer nada" requirement. `TrainingExecutionService.run()` now writes a `.worker.lock` file (just the PID) into the training directory for the duration of the process, removed in a `finally` block regardless of success or failure. `is_running()` reads that file and calls `os.kill(pid, 0)` (checks liveness without sending a real signal) to tell "the lock is stale from a killed process" apart from "there's a real `som_` still going."

In this project's actual deployment (`restart: unless-stopped`, one Worker process per container), a full container restart always kills every child process too — so in practice this check will basically never find a live process. It's implemented anyway because it's cheap, correctly matches the spec, and stops mattering the moment the Worker ever runs with more headroom (multiple replicas, a supervisor that restarts the Python process without killing children, etc.).

The lock file itself never leaks into the "generated files" diff (`training_runner.py`'s before/after `os.listdir()` comparison): it's created and removed entirely within `TrainingExecutionService.run()`, so it's gone by the time either place-in-time snapshot is taken.

### Required files to resume

```
ConfiguracionRNA.conf     ← Phase 10.2, never regenerated
DatosEntrenamiento.csv    ← Phase 10.2, never re-downloaded
statusRNA.dat             ← written by som_ itself — the actual checkpoint
```

If the training directory itself is missing, or any of these three files is missing, the Worker logs the specific missing filename(s), reports the `TrainingJob` `FAILED` with a clear message, and does **not** attempt to run `som_` — an incomplete environment isn't safe to resume, and this phase explicitly excludes trying to regenerate what's missing (that would mean re-downloading the dataset and re-creating the config, which is Phase 10.2's job on a fresh message, not recovery's).

### Resuming touches nothing

Per the phase's explicit instruction, recovery only ever re-invokes `som_` in the existing directory — via the same `TrainingExecutionService`/`run_and_monitor` used for a fresh run. It never re-downloads the dataset, never regenerates `ConfiguracionRNA.conf`, and never writes to `statusRNA.dat` itself. Whatever `som_` does with its own checkpoint on the next launch is entirely up to `som_`.

### Retry limit

`TrainingJob.recoveryAttempts` (new `Int`, default `0`, migration `20260705000000`) persists across Worker restarts specifically because the DB is the only thing that survives one — an in-memory counter would reset to `0` on every crash, defeating the entire point of a retry limit. Before attempting a resume, the Worker compares it against `MAX_RECOVERY_ATTEMPTS` (default `3`); at or past the limit, it reports `FAILED` ("Se alcanzó el límite de intentos de recuperación") instead of trying again. On each attempt actually taken, the Worker increments the count via `PATCH /api/internal/training-jobs/:id/status` (extended this phase to accept `recoveryAttempts`) *before* calling `run_and_monitor` — so a crash during the resumed run itself still leaves the incremented count behind for the next startup to see.

### What was actually verified

Two real, end-to-end scenarios against the running stack (not simulated):

1. **A genuinely early interruption.** Let a `TrainingJob` complete normally, then hand-edited its `statusRNA.dat` to a plausible mid-training snapshot (`termino_entrenarse = no`, small `ciclos`/`iteracion` values consistent with an early stop), set the job back to `RUNNING`, and restarted the Worker. Recovery found it, verified all three files, incremented `recoveryAttempts` to `1`, and successfully re-ran `som_` — the job reached `COMPLETED` with `progress: 100`, converging to the same `ciclos: 41` / `iteracion: 205` every other run of this dataset reaches. `som_` did not error, hang, or need any special handling.

2. **A real interruption from a real crash.** Created a `TrainingJob` and killed the Worker container (`docker compose kill`) ~1 second later, mid-preparation — before `som_` had even written `statusRNA.dat` yet. On restart, recovery correctly found the file missing, logged `Faltan archivos necesarios para reanudar: statusRNA.dat`, and reported the job `FAILED` without attempting to resume — exactly the documented "missing file" path, exercised by an actual crash rather than a contrived one.

### An honest caveat about what "resume" means under the hood

A third, deliberately adversarial test hand-edited a **completed** run's `statusRNA.dat` to `termino_entrenarse = no` while leaving `ciclos`/`iteracion` at their final values (`41`/`205` — i.e., a self-contradictory state no real interruption would ever produce, since a real interruption stops *before* reaching those numbers). Re-running `som_` against that file did not crash, but got stuck printing the same progress line (`total: 250 | iteracion: 205 | por: 0.820000 | ciclo: 41`) in a tight loop indefinitely — over three minutes with no change, until manually killed. `run_and_monitor` handled this correctly (no crash, no hang in *our* code, a clear `FAILED` once the process was killed, `errorMessage` capturing the exit code, the stuck `statusRNA.dat` contents, and the repeated stdout for diagnosis) — but **there is currently no timeout on `som_` itself**. A hung `som_` process — for this reason or any other — blocks the Worker (single-threaded, one job at a time) indefinitely unless something external kills it. Worth a watchdog/timeout in a future phase; out of scope here.

That same test incidentally confirmed the stdout progress line format Phase 9 could only find as a string constant in the binary: `total: %d | iteracion: %d | por: %f | ciclo: %d`, where `total` = `NUMERO_LIMITE_ITERACIONES × row count` (`50 × 5 = 250`) and `por` = `iteracion / total`. Still not used for anything here — Phase 10.4's "no stdout, no `NUMERO_LIMITE_ITERACIONES`" rule for progress stands — but now backed by a confirmed formula instead of just a string constant, for whenever a future phase implements real progress percentages.

Separately, it's not fully possible to distinguish, from black-box testing alone, whether `som_` truly resumes iteration-by-iteration from a checkpoint or performs a warm-started fresh run that happens to converge to the same point — both produce identical final `statusRNA.dat` values for this project's small test dataset. What is conclusively verified: `som_` does react differently depending on whether prior state exists (confirmed by the hang above, which only happens with pre-existing files), it completes successfully given a *consistent* partial checkpoint, and the Worker's own responsibilities (detect, verify, retry-limit, re-invoke, report) all behave exactly as specified regardless of `som_`'s internal resume mechanics.

### Worker environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_RECOVERY_ATTEMPTS` | `3` | How many times the Worker will try to resume the same TrainingJob across restarts before giving up (`FAILED`) |

---

## Publishing Results & Closing Out (Phase 10.6)

This is the last phase of the training pipeline — `termino_entrenarse = si` in `statusRNA.dat` no longer just means `COMPLETED`. It now triggers publishing every result file to permanent storage and cleaning up the temporary working directory, so the training is genuinely done: nothing left depending on the Worker's local disk, nothing left for a future phase to still worry about closing out.

### Where this plugs in

Entirely inside `training_runner.py`'s completion branch — the same one Phase 10.4 added and Phase 10.5 already reuses for resumed trainings. No new entry point, no special-casing between a fresh run and a recovered one:

```
statusRNA.dat says termino_entrenarse = si
        │
        ▼
[WORKER] Entrenamiento finalizado.
        │
        ▼
_publish_and_finalize()
        │
  [WORKER] Publicando resultados.
        │
  storage.upload() each result file, verified with storage.exists()
        │
  [WORKER] Actualizando TrainingJob.     ← status=COMPLETED, progress=100,
        │                                 only reached if every upload verified
        ▼
  [WORKER] Limpiando directorio temporal.   ← shutil.rmtree(training_dir)
        │
        ▼
  [WORKER] Entrenamiento finalizado correctamente.
```

If `_publish_and_finalize()` raises anything — a missing file, a storage error, a verification failure — `run_and_monitor()` catches it, reports `FAILED` with a clear message, and does **not** delete `training_dir`. Since a resumed training goes through the exact same function, this phase requires zero changes to `training_recovery_service.py` — verified by an actual test (below).

### `TrainingResultsPublisher`

New, small, and — like every other service in this Worker — ignorant of Redis/Queue/Backend. `training_results_publisher.py`:

```python
KNOWN_RESULT_FILENAMES = (
    "pesosRNA.csv",
    "statusRNA.dat",
    "activacion_rna.csv",
    "ConfiguracionRNA.xml",
)

class TrainingResultsPublisher:
    def publish(self, training_dir, project_id, dataset_id, training_job_id, extra_filenames=()):
        filenames = sorted(set(KNOWN_RESULT_FILENAMES) | set(extra_filenames))
        for filename in filenames:
            ...  # upload + verify, or raise
```

For each filename it: confirms the file exists locally (raises immediately naming the missing file if not), uploads it via the same `IStorageProvider.upload()` used since Phase 7.4/7.6, then confirms with `storage.exists()` that the upload actually landed — never assumes success just because `upload()` didn't raise.

### Why the filename list is a union, not just a diff

`run_and_monitor()` already computes `generated_files` (the before/after `os.listdir()` diff used for logging since Phase 10.3) and passes it in as `extra_filenames`. This matters for a subtle but real reason discovered while testing: **on a resumed training, the four result files already existed before this particular `run_and_monitor()` call started** (they were written by the interrupted first attempt) — so the before/after diff for *this* run may only catch a subset of them (whichever ones `som_` happened to rewrite this time), missing the others entirely. `KNOWN_RESULT_FILENAMES` is the fixed safety net that guarantees all four are always attempted regardless of whether this specific run's diff noticed them; `extra_filenames` is what lets a future `som_` version's new output file get published automatically without a code change, exactly as the phase requires ("el diseño deberá permitir agregarlos fácilmente").

Confirmed directly: a recovery test's "Archivos generados" log showed only `['activacion_rna.csv', 'pesosRNA.csv']` (the other two already existed from the interrupted attempt), yet the very next log lines show all four — `ConfiguracionRNA.xml`, `activacion_rna.csv`, `pesosRNA.csv`, `statusRNA.dat` — being uploaded.

### Where results land

```
projects/<projectId>/datasets/<datasetId>/training-jobs/<trainingJobId>/<filename>
```

Filenames are never renamed. The `training-jobs/<trainingJobId>/` segment is necessary, not incidental: a Dataset has many TrainingJobs (per the domain model in the root `CLAUDE.md`), and every training produces files with the *same* four names — without a per-job subfolder, a second training against the same Dataset would silently overwrite the first one's results. This sits alongside the Dataset's own files (`original.csv`, `normalized.csv`, `dimensions.xml` — Phases 6–7.6), never touching them; confirmed by listing the Dataset's storage folder after a full run and seeing both untouched.

### Error handling: no partial success, nothing deleted

`TrainingResultsPublisher.publish()` raises on the *first* problem it hits — a missing local file or a failed upload — so the Worker never marks `COMPLETED` after only some files made it. Whatever was already uploaded before the failure stays in permanent storage (harmless: a retry re-uploads and overwrites, `upload()` isn't additive), and `training_dir` is left completely intact for a later retry attempt, per the phase's explicit requirement not to delete local files on a publish failure. There is no automatic retry-on-startup for a publish failure (unlike Phase 10.5's recovery of `RUNNING` jobs) — that's a `FAILED` TrainingJob with a clear `errorMessage`, and retrying it is a manual/future-phase action, not implemented here.

### Cleanup

`shutil.rmtree(training_dir)` only runs *after* every file is uploaded and verified *and* the Backend confirms `COMPLETED` — never before, never on any failure path. This is the **only** thing this phase deletes: no Dataset file, no `TrainingJob` row, nothing else in the Backend is touched or removed.

### Verified end-to-end, twice

1. **Fresh completion.** Created a `TrainingJob`, let it run normally. Logs showed the exact sequence the phase specifies (`Entrenamiento finalizado.` → `Publicando resultados.` → `Subiendo: <each file>` → `Actualizando TrainingJob.` → `Limpiando directorio temporal.` → `Entrenamiento finalizado correctamente.`). Confirmed after: `storage/training/<id>/` gone, all four files present under `storage/projects/.../datasets/.../training-jobs/<id>/`, and the Dataset's own `original.csv`/`normalized.csv`/`dimensions.xml` untouched.
2. **Recovered completion.** Interrupted a training via `docker compose kill`, hand-crafted an early `statusRNA.dat` checkpoint (no `pesosRNA.csv` this time, to avoid Phase 10.5's discovered hang risk from a malformed one), and restarted the Worker. Recovery resumed it (`recoveryAttempts: 1`), it converged normally, and — with zero code changes needed for this path — published all four files and cleaned up exactly like a fresh run. This is what confirmed the union-vs-diff filename behavior described above.

A standalone failure test (missing `ConfiguracionRNA.xml` in an otherwise-real directory) confirmed `TrainingResultsPublisher.publish()` raises immediately naming the missing file, and nothing gets left behind in a half-published state.

### Responsibilities, end to end

| | Worker | StorageProvider |
|---|---|---|
| Detect completion | Reads `statusRNA.dat`, checks `termino_entrenarse` | — |
| Publish | Decides *what* to publish and *when* (only after real completion) | Decides *how* — local disk today, S3 later, without the Worker's training code changing |
| Verify | Trusts `storage.exists()` after each upload, not just the absence of an exception | Reports existence truthfully for whatever backing store it wraps |
| Update Backend | Only after every file is verified published | — |
| Clean up | Deletes only its own temp directory, only after Backend confirms `COMPLETED` | Owns the permanent copies forever after; the Worker never touches them again |

This closes the training pipeline started in Phase 10.1: a `TrainingJob` now goes from creation through queuing, environment prep, execution, monitoring, automatic recovery, and finally durable publication — with nothing left in a temporary or ambiguous state at the end.
