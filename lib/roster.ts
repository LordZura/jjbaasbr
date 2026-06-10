import baseCharacters from "@/data/characters.asbr.json";
import type { Character, Tier } from "@/lib/types";

export const tierRank: Record<Tier, number> = {
  Overpowered: 6,
  "Very Strong": 5,
  Strong: 4,
  Normal: 3,
  Bad: 2,
  "Very Bad": 1
};

export const tierColors: Record<Tier, string> = {
  Overpowered: "from-gold via-rose to-cyan text-abyss",
  "Very Strong": "from-rose to-gold text-white",
  Strong: "from-cyan to-acid text-abyss",
  Normal: "from-zinc-200 to-zinc-500 text-abyss",
  Bad: "from-violet-500 to-zinc-700 text-white",
  "Very Bad": "from-zinc-700 to-black text-zinc-100"
};

export const defaultCharacters = (baseCharacters as Character[])
  .map((character) => ({
    ...character,
    weight: Math.max(1, Math.min(10, character.weight))
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function initials(name: string) {
  return name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function parseRosterJson(raw: string): Character[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Character JSON must be an array.");
  }

  return parsed.map((item, index) => {
    if (!item.id || !item.name || !item.part || !item.tier) {
      throw new Error(`Character at row ${index + 1} is missing id, name, part, or tier.`);
    }

    const weight = Number(item.weight);
    if (!Number.isFinite(weight) || weight < 1 || weight > 10) {
      throw new Error(`${item.name} has a weight outside 1-10.`);
    }

    return {
      id: String(item.id),
      name: String(item.name),
      part: String(item.part),
      weight,
      tier: item.tier,
      notes: String(item.notes ?? ""),
      portrait: item.portrait ? String(item.portrait) : undefined
    } satisfies Character;
  });
}
