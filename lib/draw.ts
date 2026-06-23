// ─────────────────────────────────────────────────────────────────────────────
// Weighted randomizer with a per-rarity, stackable bad-luck-protection system
// ("Resonance").
//
//  • Each fighter's draw weight comes from its rarity tier. The base weights are
//    tuned against the roster's per-tier head-count so the *category* odds land
//    where we want them: Normal is the most common pull, the Bad/Very-Bad tiers
//    sit below it, Strong beats Very Bad, Very Strong is the rarest tier except
//    Overpowered, and Overpowered is the rarest of all.
//
//  • Luck is NOT one flat number. Each boostable tier (Strong, Very Strong,
//    Overpowered) has its OWN accumulator that stacks while you fail to pull it
//    and discharges when you do. A bad pull charges every accumulator above it,
//    and the worse the pull the more it charges — so a dry streak bends the odds
//    upward noticeably, per tier, without ever making Overpowered common.
//
//  • A soft guarantee discharges the Very-Strong accumulator once it's very high:
//    the team is upgraded so at least one Very Strong+ fighter appears.
//
//  Overpowered keeps its original gentle treatment — it boosts the slowest and
//  has no hard guarantee, so it stays a genuine once-in-a-while event.
// ─────────────────────────────────────────────────────────────────────────────

import { RARITY, rarityOf } from "@/lib/roster";
import type { Character, RarityLuck } from "@/lib/types";

// Per-fighter base weight by rarity value (higher = more common to draw). These
// are calibrated against the roster counts so the resulting *tier* probabilities
// read: Normal ≫ Strong > Bad > Very Bad > Very Strong ≫ Overpowered.
export const DRAW_BASE: Record<number, number> = {
  1: 2, // Overpowered  — rarest tier overall
  3: 4, // Very Strong  — rarest tier except Overpowered
  5: 14, // Strong      — more common than Very Bad
  7: 50, // Normal      — the most common pull (peak of the curve)
  9: 90, // Bad         — below Normal
  10: 70, // Very Bad   — below Normal, below Strong
};

// The tiers that earn bad-luck protection. Weaker tiers (Normal/Bad/Very Bad)
// are already common and never get a luck boost.
export const BOOST_TIERS = [5, 3, 1] as const; // Strong · Very Strong · Overpowered

// How much each accumulated luck point boosts that tier's weight. Rarer tiers
// gain more per point — except Overpowered, which is deliberately the gentlest
// so it never floods the board.
export const LUCK_BOOST: Record<number, number> = {
  5: 0.06, // Strong
  3: 0.1, // Very Strong
  1: 0.05, // Overpowered (kept gentle on purpose)
};

// Base luck charged into a tier on a draw that MISSES it. Rarer tiers charge
// faster, so their dry streaks resolve sooner.
const LUCK_GAIN: Record<number, number> = {
  5: 2.0, // Strong
  3: 3.0, // Very Strong
  1: 1.6, // Overpowered (slow build — keeps it special)
};

// Per-tier ceiling so a runaway streak can't make a tier a certainty.
export const LUCK_CAP = 60;

// When the Very-Strong accumulator reaches this, the next draw is upgraded to
// guarantee a Very Strong+ fighter, then that accumulator discharges.
export const LUCK_GUARANTEE = 42;

const DEFAULT_BASE = 50;

// Rank of each boostable tier (6 = Overpowered … 1 = Very Bad). A draw "hits" a
// tier when its best fighter is that rank or better.
const TIER_RANK: Record<number, number> = {
  5: RARITY[5].rank, // 4
  3: RARITY[3].rank, // 5
  1: RARITY[1].rank, // 6
};

const NORMAL_RANK = RARITY[7].rank; // 3 — the neutral point of the curve

export function emptyLuck(): RarityLuck {
  return { 1: 0, 3: 0, 5: 0 };
}

/** Defensive read: treat missing/odd luck maps as zeroed. */
function luckAt(luck: RarityLuck | undefined, value: number): number {
  const v = luck?.[value];
  return Number.isFinite(v) ? Math.max(0, v as number) : 0;
}

// ── Luck bookkeeping ──────────────────────────────────────────────────────────

/**
 * Advance one player's per-rarity luck after they pull a team. For each
 * boostable tier: if the player hit it (or better) the accumulator discharges;
 * otherwise it charges — and the worse their best pull was, the harder it
 * charges ("luck increases more noticeably when you don't get good pulls").
 */
export function luckAfterDraw(luck: RarityLuck, drawn: Character[]): RarityLuck {
  const next: RarityLuck = { ...emptyLuck(), ...luck };
  if (drawn.length === 0) return clampLuck(next);

  const bestRank = drawn.reduce((acc, c) => Math.max(acc, rarityOf(c).rank), 0);
  // 1.0 at Normal, scaling up the worse the best pull is (Very Bad ⇒ 2.0).
  const severity = Math.max(0.35, 1 + (NORMAL_RANK - bestRank) * 0.5);

  for (const tier of BOOST_TIERS) {
    if (bestRank >= TIER_RANK[tier]) {
      // Hit this tier — spend the protection that was building toward it.
      next[tier] = luckAt(next, tier) * 0.15;
    } else {
      // Missed it — charge proportional to how unlucky the pull was.
      next[tier] = luckAt(next, tier) + LUCK_GAIN[tier] * severity;
    }
  }
  return clampLuck(next);
}

function clampLuck(luck: RarityLuck): RarityLuck {
  const out: RarityLuck = {};
  for (const tier of BOOST_TIERS) {
    out[tier] = Math.max(0, Math.min(LUCK_CAP, luckAt(luck, tier)));
  }
  return out;
}

/** Whether a player's luck is charged enough to force a Very Strong+ pull. */
export function guaranteeReady(luck: RarityLuck): boolean {
  return luckAt(luck, 3) >= LUCK_GUARANTEE;
}

// ── Weighting + sampling ──────────────────────────────────────────────────────

function weightOf(c: Character, luck: RarityLuck): number {
  const base = DRAW_BASE[c.rarity] ?? DEFAULT_BASE;
  const boost = LUCK_BOOST[c.rarity];
  if (!boost) return base;
  return base * (1 + luckAt(luck, c.rarity) * boost);
}

function sampleWeighted(
  pool: Character[],
  luck: RarityLuck,
): Character | undefined {
  let total = 0;
  for (const c of pool) total += weightOf(c, luck);
  if (total <= 0) return pool[Math.floor(Math.random() * pool.length)];
  let r = Math.random() * total;
  for (const c of pool) {
    r -= weightOf(c, luck);
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

/**
 * Expected per-tier pull probability under a given luck state. Used by the
 * collection view to surface the *estimated* odds (e.g. Overpowered pull rate)
 * the algorithm is currently offering a player.
 */
export function tierProbabilities(
  pool: Character[],
  luck: RarityLuck,
): Record<number, number> {
  const weightByTier: Record<number, number> = {};
  let total = 0;
  for (const c of pool) {
    const w = weightOf(c, luck);
    weightByTier[c.rarity] = (weightByTier[c.rarity] ?? 0) + w;
    total += w;
  }
  const out: Record<number, number> = {};
  if (total <= 0) return out;
  for (const [value, w] of Object.entries(weightByTier)) {
    out[Number(value)] = w / total;
  }
  return out;
}

export type TeamDraw = { team: Character[]; guaranteed: boolean };

export type DrawResult = {
  p1: string[];
  p2: string[];
  p1Guaranteed: boolean;
  p2Guaranteed: boolean;
};

/**
 * Draw two teams of 3 unique fighters. Each team is weighted by ITS player's own
 * luck, all six fighters stay distinct, and each team independently honors its
 * side ban and its own Very-Strong+ soft guarantee.
 */
export function weightedDrawTeams(
  pool: Character[],
  p1Luck: RarityLuck,
  p2Luck: RarityLuck,
  p1Ban: string,
  p2Ban: string,
): DrawResult {
  const used = new Set<string>();

  const pickThree = (ban: string, luck: RarityLuck): Character[] => {
    const out: Character[] = [];
    // First honor the side ban; if that starves us, relax it as a fallback.
    for (const allowBan of [false, true]) {
      while (out.length < 3) {
        const cands = pool.filter(
          (c) => !used.has(c.id) && (allowBan || c.id !== ban),
        );
        if (cands.length === 0) break;
        const c = sampleWeighted(cands, luck);
        if (!c) break;
        used.add(c.id);
        out.push(c);
      }
      if (out.length === 3) break;
    }
    return out;
  };

  // Soft pity: once a player's Very-Strong luck is charged, ensure their team
  // contains a Very Strong+ fighter, upgrading their weakest slot if needed.
  const applyGuarantee = (
    team: Character[],
    ban: string,
    luck: RarityLuck,
  ): boolean => {
    if (!guaranteeReady(luck) || team.length === 0) return false;
    if (team.some((c) => rarityOf(c).rank >= RARITY[3].rank)) return false;
    const upgrades = pool.filter(
      (c) => rarityOf(c).rank >= RARITY[3].rank && !used.has(c.id) && c.id !== ban,
    );
    const repl = sampleWeighted(upgrades, luck);
    if (!repl) return false;
    let worstIdx = 0;
    for (let i = 1; i < team.length; i += 1) {
      if (rarityOf(team[i]).rank < rarityOf(team[worstIdx]).rank) worstIdx = i;
    }
    used.delete(team[worstIdx].id);
    used.add(repl.id);
    team[worstIdx] = repl;
    return true;
  };

  const p1 = pickThree(p1Ban, p1Luck);
  const p2 = pickThree(p2Ban, p2Luck);

  const p1Guaranteed = applyGuarantee(p1, p1Ban, p1Luck);
  const p2Guaranteed = applyGuarantee(p2, p2Ban, p2Luck);

  return {
    p1: p1.map((c) => c.id),
    p2: p2.map((c) => c.id),
    p1Guaranteed,
    p2Guaranteed,
  };
}
