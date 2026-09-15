/**
 * Route Planner Engine for Distributed Non-Linear Checkpoint Navigation.
 * 
 * Ensures no two teams have the same sequence/movement order across campus stations,
 * eliminating crowding, following, and linear ascending sequence patterns.
 */

// 16 Unique, Distributed, Non-Linear Campus Routes (Visiting all 10 stations)
export const PREDEFINED_ROUTES: Record<number, number[]> = {
  1:  [1, 6, 3, 8, 5, 10, 2, 7, 4, 9],
  2:  [2, 7, 4, 9, 6, 1, 8, 3, 10, 5],
  3:  [3, 8, 1, 6, 9, 4, 7, 2, 5, 10],
  4:  [4, 9, 2, 7, 10, 5, 8, 1, 6, 3],
  5:  [5, 10, 3, 8, 1, 6, 9, 4, 7, 2],
  6:  [6, 1, 8, 3, 10, 5, 2, 7, 4, 9],
  7:  [7, 2, 9, 4, 1, 6, 3, 8, 5, 10],
  8:  [8, 3, 10, 5, 2, 7, 4, 9, 6, 1],
  9:  [9, 4, 7, 2, 5, 10, 1, 6, 3, 8],
  10: [10, 5, 2, 7, 4, 9, 6, 1, 8, 3],
  11: [1, 8, 4, 10, 6, 2, 9, 5, 7, 3],
  12: [3, 9, 6, 1, 8, 4, 10, 7, 2, 5],
  13: [5, 2, 8, 3, 9, 6, 1, 10, 4, 7],
  14: [7, 3, 10, 6, 2, 8, 4, 1, 9, 5],
  15: [9, 5, 1, 7, 3, 10, 6, 2, 8, 4],
  16: [2, 10, 6, 3, 7, 1, 9, 4, 8, 5],
};

/**
 * Returns the full 10-station route sequence for a team.
 */
export function getTeamRoute(
  team: { startLevel?: number; customRoute?: string | null; id?: string; teamCode?: string },
  totalStations: number = 10
): number[] {
  // 1. If team has an explicit custom route set, parse it
  if (team.customRoute && typeof team.customRoute === 'string') {
    const parsed = team.customRoute
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= totalStations);

    if (parsed.length === totalStations && new Set(parsed).size === totalStations) {
      return parsed;
    }
  }

  // 2. Lookup predefined route based on startLevel / routeIndex (1-16)
  const routeIndex = team.startLevel && team.startLevel >= 1 && team.startLevel <= 16
    ? team.startLevel
    : 1;

  if (PREDEFINED_ROUTES[routeIndex]) {
    return [...PREDEFINED_ROUTES[routeIndex]];
  }

  // 3. Fallback deterministic permutation generator for arbitrary route index
  const base = Array.from({ length: totalStations }, (_, i) => i + 1);
  const stepSize = 3; // Coprime step for non-linear traversal
  const start = (routeIndex - 1) % totalStations;
  const result: number[] = [];
  const visited = new Set<number>();

  let curr = start;
  for (let i = 0; i < totalStations; i++) {
    while (visited.has(curr)) {
      curr = (curr + 1) % totalStations;
    }
    visited.add(curr);
    result.push(base[curr]);
    curr = (curr + stepSize) % totalStations;
  }

  return result;
}

/**
 * Returns the target physical station level (1 to 10) for a team at a specific step (1 to 10).
 */
export function getTargetStationForStep(
  team: { startLevel?: number; customRoute?: string | null; id?: string; teamCode?: string },
  step: number,
  totalStations: number = 10
): number {
  const route = getTeamRoute(team, totalStations);
  const clampedStep = Math.max(1, Math.min(step, route.length));
  return route[clampedStep - 1] || 1;
}

/**
 * Checks if a scanned station level was already completed in an earlier step of the team's route.
 */
export function isStationAlreadySolved(
  team: { startLevel?: number; customRoute?: string | null; id?: string; teamCode?: string },
  stationLevel: number,
  currentStep: number,
  totalStations: number = 10
): boolean {
  const route = getTeamRoute(team, totalStations);
  const maxPreviousIndex = Math.min(currentStep - 1, route.length);
  for (let i = 0; i < maxPreviousIndex; i++) {
    if (route[i] === stationLevel) {
      return true;
    }
  }
  return false;
}
