// Recommended SOM grid sizes offered in the training configuration UI
// (Phase 10.7.1). Only square topologies are offered — width and height
// are always equal — to keep the first version of this form simple.
export interface SomTopologyOption {
  value: string
  label: string
  width: number
  height: number
}

export const SOM_TOPOLOGY_OPTIONS: SomTopologyOption[] = [
  { value: '20', label: '20 × 20', width: 20, height: 20 },
  { value: '30', label: '30 × 30', width: 30, height: 30 },
  { value: '40', label: '40 × 40', width: 40, height: 40 },
  { value: '50', label: '50 × 50', width: 50, height: 50 },
  { value: '60', label: '60 × 60', width: 60, height: 60 },
  { value: '80', label: '80 × 80', width: 80, height: 80 },
]

export const DEFAULT_TOPOLOGY = '40'

// Match the som_ executable's own built-in defaults (documented in
// worker/README.md, Phase 9) — the closest thing this platform has to an
// authoritative "current default" for these two parameters.
export const DEFAULT_ALPHA = 0.5
export const DEFAULT_OMEGA = 0.005 // sent to the Backend as `beta`

// Not exposed in this phase's form ("no exponer configuración avanzada"),
// but still required by the existing TrainingJob creation contract — held
// fixed at som_'s own defaults until a future phase adds them to the UI.
export const DEFAULT_NEIGHBORHOOD_RADIUS = 4
export const DEFAULT_OBJECTIVE_DIMENSION_WEIGHT = 0

export function getTopologyOption(value: string): SomTopologyOption {
  return (
    SOM_TOPOLOGY_OPTIONS.find((option) => option.value === value) ??
    SOM_TOPOLOGY_OPTIONS.find((option) => option.value === DEFAULT_TOPOLOGY)!
  )
}
