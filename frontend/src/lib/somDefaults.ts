export interface SomTopologyOption {
  value: string
  label: string
  width: number
  height: number
  // Max neighborhood radius scales at ~15% of the grid side (40×40 → 6).
  // Default is the recommended starting point for each grid size.
  maxNeighborhoodRadius: number
  defaultNeighborhoodRadius: number
}

export const SOM_TOPOLOGY_OPTIONS: SomTopologyOption[] = [
  { value: '20', label: '20 × 20', width: 20, height: 20, maxNeighborhoodRadius: 3,  defaultNeighborhoodRadius: 2 },
  { value: '30', label: '30 × 30', width: 30, height: 30, maxNeighborhoodRadius: 5,  defaultNeighborhoodRadius: 3 },
  { value: '40', label: '40 × 40', width: 40, height: 40, maxNeighborhoodRadius: 6,  defaultNeighborhoodRadius: 4 },
  { value: '50', label: '50 × 50', width: 50, height: 50, maxNeighborhoodRadius: 8,  defaultNeighborhoodRadius: 5 },
  { value: '60', label: '60 × 60', width: 60, height: 60, maxNeighborhoodRadius: 9,  defaultNeighborhoodRadius: 6 },
  { value: '80', label: '80 × 80', width: 80, height: 80, maxNeighborhoodRadius: 12, defaultNeighborhoodRadius: 8 },
]

export const DEFAULT_TOPOLOGY = '40'

export const DEFAULT_ALPHA = 0.5
export const DEFAULT_OMEGA = 0.005 // sent to the Backend as `beta`

export const DEFAULT_OBJECTIVE_DIMENSION_WEIGHT = 0

export function getTopologyOption(value: string): SomTopologyOption {
  return (
    SOM_TOPOLOGY_OPTIONS.find((option) => option.value === value) ??
    SOM_TOPOLOGY_OPTIONS.find((option) => option.value === DEFAULT_TOPOLOGY)!
  )
}
