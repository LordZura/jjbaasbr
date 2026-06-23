// ─────────────────────────────────────────────────────────────────────────────
// Derived statistics. The raw `matches` record is the ONLY source of truth —
// every record, leaderboard, head-to-head and character win-rate below is
// recomputed from it. Nothing here is ever persisted.
// ─────────────────────────────────────────────────────────────────────────────

import { tierProbabilities } from "@/lib/draw";
import { RARITY, getCharacter, rarityOf } from "@/lib/roster";
import type {
  Character,
  CharacterRecord,
  Collection,
  CollectionStats,
  HeadToHead,
  Match,
  Player,
  PlayerRecord,
} from "@/lib/types";

export function matchArray(matches: Record<string, Match>): Match[] {
  return Object.values(matches);
}

function involves(m: Match, playerId: string): boolean {
  return m.p1Id === playerId || m.p2Id === playerId;
}

/** Team a player fielded in a match + whether they won it. */
function sideOf(
  m: Match,
  playerId: string,
): { team: string[]; won: boolean } | null {
  if (m.p1Id === playerId) return { team: m.p1Team, won: m.winnerId === m.p1Id };
  if (m.p2Id === playerId) return { team: m.p2Team, won: m.winnerId === m.p2Id };
  return null;
}

// ── Player-level ─────────────────────────────────────────────────────────────

export function playerRecord(playerId: string, matches: Match[]): PlayerRecord {
  let wins = 0;
  let total = 0;
  for (const m of matches) {
    if (!involves(m, playerId)) continue;
    total += 1;
    if (m.winnerId === playerId) wins += 1;
  }
  return {
    playerId,
    matches: total,
    wins,
    losses: total - wins,
    winRate: total ? wins / total : 0,
  };
}

export function leaderboard(
  players: Player[],
  matches: Match[],
  minMatches = 3,
): { player: Player; record: PlayerRecord }[] {
  return players
    .map((player) => ({ player, record: playerRecord(player.id, matches) }))
    .filter((row) => row.record.matches >= minMatches)
    .sort(
      (a, b) =>
        b.record.winRate - a.record.winRate ||
        b.record.wins - a.record.wins ||
        a.player.name.localeCompare(b.player.name),
    );
}

// ── Character-level (per player) ─────────────────────────────────────────────

export function characterRecordsForPlayer(
  playerId: string,
  matches: Match[],
): CharacterRecord[] {
  const acc = new Map<string, { wins: number; total: number }>();
  for (const m of matches) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    for (const cid of side.team) {
      const cur = acc.get(cid) ?? { wins: 0, total: 0 };
      cur.total += 1;
      if (side.won) cur.wins += 1;
      acc.set(cid, cur);
    }
  }
  return toCharacterRecords(acc);
}

export function bestCharacter(
  playerId: string,
  matches: Match[],
  minMatches = 2,
): CharacterRecord | null {
  const ranked = characterRecordsForPlayer(playerId, matches).filter(
    (r) => r.matches >= minMatches,
  );
  return ranked[0] ?? null;
}

// ── Character-level (global) ─────────────────────────────────────────────────

export function globalCharacterRecords(matches: Match[]): CharacterRecord[] {
  const acc = new Map<string, { wins: number; total: number }>();
  for (const m of matches) {
    const winTeam = m.winnerId === m.p1Id ? m.p1Team : m.p2Team;
    const loseTeam = m.winnerId === m.p1Id ? m.p2Team : m.p1Team;
    for (const cid of winTeam) {
      const cur = acc.get(cid) ?? { wins: 0, total: 0 };
      cur.wins += 1;
      cur.total += 1;
      acc.set(cid, cur);
    }
    for (const cid of loseTeam) {
      const cur = acc.get(cid) ?? { wins: 0, total: 0 };
      cur.total += 1;
      acc.set(cid, cur);
    }
  }
  return toCharacterRecords(acc);
}

export function mostPicked(
  matches: Match[],
): { characterId: string; count: number }[] {
  const acc = new Map<string, number>();
  for (const m of matches) {
    for (const cid of [...m.p1Team, ...m.p2Team]) {
      acc.set(cid, (acc.get(cid) ?? 0) + 1);
    }
  }
  return [...acc.entries()]
    .map(([characterId, count]) => ({ characterId, count }))
    .sort((a, b) => b.count - a.count);
}

export function mostWinning(matches: Match[]): CharacterRecord[] {
  return [...globalCharacterRecords(matches)].sort(
    (a, b) => b.wins - a.wins || b.winRate - a.winRate,
  );
}

// ── Head-to-head ─────────────────────────────────────────────────────────────

export function h2hRecord(
  aId: string,
  bId: string,
  matches: Match[],
): { aWins: number; bWins: number; total: number } {
  let aWins = 0;
  let bWins = 0;
  let total = 0;
  for (const m of matches) {
    const pair =
      (m.p1Id === aId && m.p2Id === bId) || (m.p1Id === bId && m.p2Id === aId);
    if (!pair) continue;
    total += 1;
    if (m.winnerId === aId) aWins += 1;
    else if (m.winnerId === bId) bWins += 1;
  }
  return { aWins, bWins, total };
}

export function headToHeadMatrix(
  players: Player[],
  matches: Match[],
): HeadToHead[] {
  const out: HeadToHead[] = [];
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      const rec = h2hRecord(a.id, b.id, matches);
      if (rec.total > 0) {
        out.push({
          aId: a.id,
          bId: b.id,
          aWins: rec.aWins,
          bWins: rec.bWins,
          total: rec.total,
        });
      }
    }
  }
  return out.sort((x, y) => y.total - x.total);
}

export function hasPlayed(aId: string, bId: string, matches: Match[]): boolean {
  return h2hRecord(aId, bId, matches).total > 0;
}

export function isRivalry(
  aId: string,
  bId: string,
  matches: Match[],
  threshold = 5,
): boolean {
  return h2hRecord(aId, bId, matches).total >= threshold;
}

// ── Matches feed + kill trophy ───────────────────────────────────────────────

export function recentMatches(matches: Match[], n = 10): Match[] {
  return [...matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, n);
}

export function killLeader(
  kills: Record<string, number> | null | undefined,
): { characterId: string; count: number } | null {
  if (!kills) return null;
  let best: { characterId: string; count: number } | null = null;
  for (const [characterId, count] of Object.entries(kills)) {
    if (count > 0 && (!best || count > best.count)) best = { characterId, count };
  }
  return best;
}

// ── Collection (per player) ──────────────────────────────────────────────────

// "Luck points" per rarity — a single scale that rewards rare pulls and
// penalizes bad ones, centered on Normal (0). Tied to rarity (rarer ⇒ bigger
// swing), so both the estimated and actual performance read on the same axis.
export const LUCK_POINTS: Record<number, number> = {
  1: 8, // Overpowered
  3: 4, // Very Strong
  5: 2, // Strong
  7: 0, // Normal (neutral)
  9: -1, // Bad
  10: -2, // Very Bad
};

/**
 * Roll a player's persisted collection up into display stats. `referencePool`
 * is the full roster used to size the *estimated* odds the algorithm is
 * currently offering this player (given their live luck). Estimated values
 * (from the algorithm) are kept separate from actual ones (from real pulls).
 */
export function collectionStats(
  collection: Collection,
  referencePool: Character[],
): CollectionStats {
  const luck = collection.luck ?? {};

  const entries = Object.entries(collection.pulls ?? {})
    .map(([characterId, count]) => ({
      characterId,
      count,
      rarity: rarityOf(getCharacter(characterId)).value,
    }))
    .sort(
      (a, b) =>
        (RARITY[b.rarity]?.rank ?? 0) - (RARITY[a.rarity]?.rank ?? 0) ||
        b.count - a.count ||
        a.characterId.localeCompare(b.characterId),
    );

  const rarityCounts: Record<number, number> = {};
  let totalPulls = 0;
  for (const e of entries) {
    rarityCounts[e.rarity] = (rarityCounts[e.rarity] ?? 0) + e.count;
    totalPulls += e.count;
  }

  // Estimated side — what the algorithm currently offers, given this luck.
  const probs = tierProbabilities(referencePool, luck);
  const estimatedOpRate = probs[1] ?? 0;
  let estimatedPerformance = 0;
  for (const [value, p] of Object.entries(probs)) {
    estimatedPerformance += p * (LUCK_POINTS[Number(value)] ?? 0);
  }

  // Actual side — what really happened, measured from pull history.
  const actualOpRate = totalPulls ? (rarityCounts[1] ?? 0) / totalPulls : 0;
  let actualPoints = 0;
  for (const [value, count] of Object.entries(rarityCounts)) {
    actualPoints += count * (LUCK_POINTS[Number(value)] ?? 0);
  }
  const actualPerformance = totalPulls ? actualPoints / totalPulls : 0;

  return {
    entries,
    totalPulls,
    rarityCounts,
    luck,
    estimatedOpRate,
    actualOpRate,
    estimatedPerformance,
    actualPerformance,
  };
}

// ── shared ───────────────────────────────────────────────────────────────────

function toCharacterRecords(
  acc: Map<string, { wins: number; total: number }>,
): CharacterRecord[] {
  return [...acc.entries()]
    .map(([characterId, v]) => ({
      characterId,
      matches: v.total,
      wins: v.wins,
      losses: v.total - v.wins,
      winRate: v.total ? v.wins / v.total : 0,
    }))
    .sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.matches - a.matches ||
        a.characterId.localeCompare(b.characterId),
    );
}
