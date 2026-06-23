// ─────────────────────────────────────────────────────────────────────────────
// Core domain — JoJo's Bizarre Adventure: ASBR competitive 3v3 match tracker.
// Everything here is the SOURCE OF TRUTH. Player records, leaderboards, and
// character win-rates are NEVER stored — they are derived from `matches` on the
// fly (see lib/stats.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type Character = {
  id: string;
  name: string;
  /** JoJo Part number 1-8 — drives the randomizer filter + the card color theme. */
  part: number;
  /** Optional portrait. Empty/broken URLs fall back to a stylized part-color plate. */
  imageUrl?: string;
  /**
   * Power tier — lower is rarer/stronger: 1 Overpowered · 3 Very Strong ·
   * 5 Strong · 7 Normal · 9 Bad · 10 Very Bad. Drives the lock-in flourish.
   */
  rarity: number;
};

export type Player = {
  id: string;
  name: string;
  createdAt: string;
};

/**
 * Per-rarity bad-luck-protection accumulators ("algorithm luck"), keyed by
 * rarity value. Only the boostable tiers carry entries: 1 Overpowered, 3 Very
 * Strong, 5 Strong. Stackable — each entry charges on misses and discharges on
 * hits (see lib/draw.ts).
 */
export type RarityLuck = Record<number, number>;

/**
 * A player's gacha collection — what they have actually pulled, plus their live
 * algorithm-luck state. This IS persisted (shared per account), unlike the
 * match-derived stats which are recomputed on the fly.
 */
export type Collection = {
  playerId: string;
  /** characterId → how many times this player has pulled them. */
  pulls: Record<string, number>;
  /** Current per-rarity algorithm luck driving this player's draws. */
  luck: RarityLuck;
};

export type Match = {
  id: string;
  date: string; // ISO timestamp
  p1Id: string;
  p2Id: string;
  p1Team: string[]; // exactly 3 character ids
  p2Team: string[]; // exactly 3 character ids
  winnerId: string; // p1Id | p2Id
  kills: Record<string, number> | null; // per character id; null when not recorded
};

// ── Derived stat shapes (computed from matches, never persisted) ─────────────

export type PlayerRecord = {
  playerId: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
};

export type CharacterRecord = {
  characterId: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
};

export type HeadToHead = {
  aId: string;
  bId: string;
  aWins: number;
  bWins: number;
  total: number;
};

// A single pulled character with its running count, for the collection grid.
export type PullEntry = {
  characterId: string;
  count: number;
  rarity: number;
};

/**
 * Everything the collection panel shows for one player. "Estimated" values come
 * from the algorithm (the odds it is currently offering); "actual" values are
 * measured from real pull history. They are kept deliberately separate.
 */
export type CollectionStats = {
  entries: PullEntry[]; // pulled characters, rarest-first
  totalPulls: number;
  rarityCounts: Record<number, number>; // rarity value → pulls in that tier
  luck: RarityLuck; // current algorithm luck (estimated side)
  estimatedOpRate: number; // 0..1 — algorithm's current Overpowered odds
  actualOpRate: number; // 0..1 — measured Overpowered pulls ÷ total pulls
  estimatedPerformance: number; // expected luck-points per pull (algorithm)
  actualPerformance: number; // measured luck-points per pull (history)
};

export type SyncStatus = "loading" | "saving" | "synced" | "error";

export type Toast = {
  id: string;
  kind: "error" | "info" | "success";
  message: string;
};
