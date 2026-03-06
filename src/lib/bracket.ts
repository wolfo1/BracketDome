/**
 * Bracket generation logic for single-elimination tournaments.
 * Pads to next power of 2 with "BYE" slots, uses seeding for first-round matchups.
 */

export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function getRoundName(roundNumber: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNumber + 1;
  if (fromEnd === 1) return "Final";
  if (fromEnd === 2) return "Semifinals";
  if (fromEnd === 3) return "Quarterfinals";
  return `Round of ${Math.pow(2, fromEnd)}`;
}

/**
 * Returns seeded matchup pairs for the first round.
 * Standard seeding: 1 vs 2^n, 2 vs (2^n - 1), etc.
 */
export function generateFirstRoundMatchups(
  seeds: number[]
): [number, number][] {
  const size = seeds.length; // must be power of 2
  const pairs: [number, number][] = [];

  function buildBracket(seedList: number[]): [number, number][] {
    if (seedList.length === 2) return [[seedList[0], seedList[1]]];
    const half = seedList.length / 2;
    const top = seedList.slice(0, half);
    const bottom = seedList.slice(half).reverse();
    const merged: number[] = [];
    for (let i = 0; i < top.length; i++) {
      merged.push(top[i], bottom[i]);
    }
    const result: [number, number][] = [];
    for (let i = 0; i < merged.length; i += 2) {
      result.push([merged[i], merged[i + 1]]);
    }
    return result;
  }

  // Standard single-elimination seeding
  const ordered = Array.from({ length: size }, (_, i) => i + 1);
  return buildBracket(ordered);
}

/**
 * Generates all rounds structure for a tournament.
 * Returns an array of rounds, each with match position slots.
 */
export function generateBracketStructure(contestantCount: number): {
  rounds: { number: number; name: string; matchCount: number }[];
  bracketSize: number;
} {
  const bracketSize = nextPowerOf2(contestantCount);
  const totalRounds = Math.log2(bracketSize);

  const rounds = [];
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    rounds.push({
      number: r,
      name: getRoundName(r, totalRounds),
      matchCount,
    });
  }

  return { rounds, bracketSize };
}
