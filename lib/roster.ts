import rawCharacters from "@/data/characters.asbr.json";
import type { Character } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════════════
//  CHARACTER ROSTER — JoJo's Bizarre Adventure: All-Star Battle R
// ═══════════════════════════════════════════════════════════════════════════
//
//  TO SWAP IN REAL PORTRAITS:
//  Open data/characters.asbr.json and set each character's `imageUrl` to a
//  direct image URL (or a local import path under /public). Anything that is
//  empty OR fails to load automatically falls back to a stylized part-color
//  name-plate, so the board always looks intentional.
//
//  Format: { "id": "dio", "name": "DIO", "part": 3, "imageUrl": "YOUR_URL_HERE" }
//
//  Good sources: https://jojowiki.com/  (ASBR press kit / character galleries)
//  or any fan CDN that allows hot-linking. Square-ish portraits look best.
// ═══════════════════════════════════════════════════════════════════════════

export const CHARACTERS = rawCharacters as Character[];

export const charById = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string): Character | undefined {
  return charById.get(id);
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, " ") // drop parentheticals like "(Part 4)"
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// ── Per-Part visual identity ─────────────────────────────────────────────────
// `accent` is the neon hex used for borders / glows / text. `gradient` is a set
// of Tailwind classes (literal so the JIT keeps them) for the card plate.

export type PartTheme = {
  title: string; // "Part 3"
  subtitle: string; // "Stardust Crusaders"
  accent: string; // primary neon hex
  accent2: string; // secondary hex
  gradient: string; // tailwind gradient classes for the fallback plate
};

export const PART_THEME: Record<number, PartTheme> = {
  1: {
    title: "Part 1",
    subtitle: "Phantom Blood",
    accent: "#5b8fd6",
    accent2: "#b8c7e0",
    gradient: "from-[#1b2c52] via-[#10182f] to-[#070a14]",
  },
  2: {
    title: "Part 2",
    subtitle: "Battle Tendency",
    accent: "#ff8a3d",
    accent2: "#ffd27a",
    gradient: "from-[#5a2a12] via-[#2c1608] to-[#0c0703]",
  },
  3: {
    title: "Part 3",
    subtitle: "Stardust Crusaders",
    accent: "#b07ce0",
    accent2: "#ffd66b",
    gradient: "from-[#3a2356] via-[#1d1330] to-[#0a0712]",
  },
  4: {
    title: "Part 4",
    subtitle: "Diamond is Unbreakable",
    accent: "#ff6fae",
    accent2: "#5fe0d0",
    gradient: "from-[#5a2348] via-[#2a1230] to-[#0c0712]",
  },
  5: {
    title: "Part 5",
    subtitle: "Golden Wind",
    accent: "#ffcf4d",
    accent2: "#5fd17a",
    gradient: "from-[#4f3d12] via-[#231d08] to-[#0a0a04]",
  },
  6: {
    title: "Part 6",
    subtitle: "Stone Ocean",
    accent: "#37d6a0",
    accent2: "#48b6ff",
    gradient: "from-[#12463f] via-[#0a2430] to-[#040d12]",
  },
  7: {
    title: "Part 7",
    subtitle: "Steel Ball Run",
    accent: "#cf9a54",
    accent2: "#e6d2a0",
    gradient: "from-[#4a3414] via-[#241a0a] to-[#0b0804]",
  },
  8: {
    title: "Part 8",
    subtitle: "JoJolion",
    accent: "#7cc6e8",
    accent2: "#f0a8c8",
    gradient: "from-[#1d3c50] via-[#0f2030] to-[#060c12]",
  },
};

export function partTheme(part: number): PartTheme {
  return PART_THEME[part] ?? PART_THEME[1];
}

export const ALL_PARTS = [1, 2, 3, 4, 5, 6, 7, 8];

// ── Rarity / power tiers ─────────────────────────────────────────────────────
// Lower `value` = rarer & stronger. `rank` (6→1) drives how intense the lock-in
// flourish is. `anim` selects the keyframe set in globals.css.

export type RarityAnim = "op" | "vstrong" | "strong" | "normal" | "bad" | "vbad";

export type RarityTier = {
  value: number; // 1, 3, 5, 7, 9, 10
  rank: number; // 6 (best) → 1 (worst)
  label: string; // "Overpowered"
  short: string; // tight label for the strip
  color: string; // primary neon
  color2: string; // secondary / accent
  anim: RarityAnim;
};

export const RARITY: Record<number, RarityTier> = {
  1: {
    value: 1,
    rank: 6,
    label: "Overpowered",
    short: "Overpowered",
    color: "#ffe14d",
    color2: "#ff3fd0",
    anim: "op",
  },
  3: {
    value: 3,
    rank: 5,
    label: "Very Strong",
    short: "Very Strong",
    color: "#ff3fa0",
    color2: "#ff9a3d",
    anim: "vstrong",
  },
  5: {
    value: 5,
    rank: 4,
    label: "Strong",
    short: "Strong",
    color: "#a06bff",
    color2: "#6bc4ff",
    anim: "strong",
  },
  7: {
    value: 7,
    rank: 3,
    label: "Normal",
    short: "Normal",
    color: "#35e8b0",
    color2: "#9bffd9",
    anim: "normal",
  },
  9: {
    value: 9,
    rank: 2,
    label: "Bad",
    short: "Bad",
    color: "#8893a6",
    color2: "#aab3c2",
    anim: "bad",
  },
  10: {
    value: 10,
    rank: 1,
    label: "Very Bad",
    short: "Very Bad",
    color: "#6f5f49",
    color2: "#9b8a6e",
    anim: "vbad",
  },
};

const NORMAL_TIER = RARITY[7];

export function rarityOf(c?: { rarity?: number } | null): RarityTier {
  if (!c || c.rarity === undefined) return NORMAL_TIER;
  return RARITY[c.rarity] ?? NORMAL_TIER;
}
