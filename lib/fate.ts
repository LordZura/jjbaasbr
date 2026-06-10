import { tierRank } from "@/lib/roster";
import type { BalanceSettings, Character, FateState, PlayerProfile, SpinRecord, Tier } from "@/lib/types";
import { clamp } from "@/lib/utils";

const weakTiers = new Set<Tier>(["Bad", "Very Bad"]);
const eliteTiers = new Set<Tier>(["Overpowered", "Very Strong"]);

export function weightedSpin(
  characters: Character[],
  player: PlayerProfile,
  settings: BalanceSettings
) {
  const weighted = characters.map((character) => {
    const recent = player.history.slice(-settings.recentWindow);
    const duplicateHits = recent.filter((entry) => entry.characterId === character.id).length;
    const weakRecent = recent.filter((entry) => weakTiers.has(entry.tier)).length;
    const sameLast = recent.at(-1)?.characterId === character.id ? settings.repeatDecay : 1;
    const rarityInversion = 11 - clamp(character.weight, 1, 10);
    const pityBoost =
      eliteTiers.has(character.tier) || tierRank[character.tier] >= 4
        ? Math.min(settings.rareTierBoostCap, 1 + weakRecent * settings.pityStrength + player.pity * 0.018)
        : 1;
    const duplicateModifier = Math.pow(1 - settings.duplicateReduction, duplicateHits) * sameLast;
    const luckModifier = 1 + clamp(player.luck, -12, 18) / 260;
    const base = Math.max(0.1, character.weight);
    const finalWeight = base * duplicateModifier * pityBoost * luckModifier * (1 + rarityInversion * 0.006);

    return {
      character,
      finalWeight: Math.max(0.05, finalWeight)
    };
  });

  const total = weighted.reduce((sum, item) => sum + item.finalWeight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.finalWeight;
    if (roll <= 0) {
      return item.character;
    }
  }

  return weighted.at(-1)?.character ?? characters[0];
}

export function applySpinResult(
  player: PlayerProfile,
  character: Character,
  settings: BalanceSettings
): PlayerProfile {
  const timestamp = new Date().toISOString();
  const record: SpinRecord = {
    characterId: character.id,
    characterName: character.name,
    tier: character.tier,
    timestamp
  };
  const wasWeak = weakTiers.has(character.tier);
  const wasElite = eliteTiers.has(character.tier);
  const nextLuck = clamp(
    player.luck + (wasWeak ? settings.luckDrift : wasElite ? -settings.luckDrift * 1.2 : -0.15),
    -18,
    24
  );

  return {
    ...player,
    spins: player.spins + 1,
    history: [...player.history, record],
    perCharacterCounts: {
      ...player.perCharacterCounts,
      [character.id]: (player.perCharacterCounts[character.id] ?? 0) + 1
    },
    tierCounts: {
      ...player.tierCounts,
      [character.tier]: (player.tierCounts[character.tier] ?? 0) + 1
    },
    luck: nextLuck,
    pity: clamp(wasWeak ? player.pity + 1 : wasElite ? player.pity - 2 : player.pity - 0.4, 0, 18),
    lastActiveAt: timestamp
  };
}

export function getFateState(player?: PlayerProfile): FateState {
  const score = (player?.luck ?? 0) + (player?.pity ?? 0) * 0.8;
  if (score >= 16) return { label: "Blessed", fortune: "Destiny: Rising", tone: "text-gold" };
  if (score >= 5) return { label: "Favorable", fortune: "Fate: Favorable", tone: "text-acid" };
  if (score <= -8) return { label: "Terrible", fortune: "Fortune: Uneasy", tone: "text-rose" };
  return { label: "Uncertain", fortune: "Fate: Uncertain", tone: "text-cyan" };
}

export function collectionStats(characters: Character[], player?: PlayerProfile) {
  const counts = player?.perCharacterCounts ?? {};
  const collected = characters.filter((character) => counts[character.id] > 0);
  const missing = characters.filter((character) => !counts[character.id]);
  const completion = characters.length ? (collected.length / characters.length) * 100 : 0;
  const byPart = groupProgress(characters, collected, "part");
  const byTier = groupProgress(characters, collected, "tier");

  return { collected, missing, completion, byPart, byTier };
}

function groupProgress(characters: Character[], collected: Character[], key: "part" | "tier") {
  const groups = new Map<string, { total: number; collected: number }>();
  for (const character of characters) {
    const current = groups.get(character[key]) ?? { total: 0, collected: 0 };
    current.total += 1;
    groups.set(character[key], current);
  }
  for (const character of collected) {
    const current = groups.get(character[key]);
    if (current) current.collected += 1;
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}
