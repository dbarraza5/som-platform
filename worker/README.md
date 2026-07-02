# SOM Platform — Worker

Python 3.12 process. Reads normalization jobs from the queue (`src/services/message_handler.py`, Phases 7.3–7.6) and, starting Phase 9, is being prepared to also run SOM training via a native executable. See the root [README](../README.md) and [docs/architecture.md](../docs/architecture.md) for the full system.

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
