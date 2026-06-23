"use client";

import {
  getCharacter,
  initials,
  partTheme,
  rarityOf,
  type RarityTier,
} from "@/lib/roster";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HelpCircle, Skull } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

// ── Portrait (image with stylized part-color fallback) ───────────────────────

export function CharacterPortrait({
  character,
  placeholderAccent,
  monogramScale = "text-6xl sm:text-7xl",
}: {
  character?: Character;
  placeholderAccent?: string;
  monogramScale?: string;
}) {
  // Track which character id failed to load (not a bare bool) so that swapping
  // to a new character automatically retries its image — no effect required.
  const [erroredId, setErroredId] = useState<string | null>(null);

  // No character → neutral "ready" plate with a team-tinted question mark.
  if (!character) {
    return (
      <div className="relative h-full w-full bg-gradient-to-b from-[#1c140c] to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute inset-0 grid place-items-center">
          <HelpCircle
            size={64}
            strokeWidth={1.4}
            style={{ color: placeholderAccent ?? "#6b5b44", opacity: 0.5 }}
          />
        </div>
      </div>
    );
  }

  const theme = partTheme(character.part);
  const showImage = Boolean(character.imageUrl) && erroredId !== character.id;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={character.imageUrl}
        alt={character.name}
        onError={() => setErroredId(character.id)}
        className="h-full w-full object-cover object-top"
        draggable={false}
      />
    );
  }

  // Stylized fallback plate — part-themed gradient + big monogram + part badge.
  return (
    <div
      className={cn("relative h-full w-full bg-gradient-to-b", theme.gradient)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.18),transparent_58%)]" />
      <div className="absolute inset-0 grid place-items-center">
        <span
          className={cn("font-display leading-none", monogramScale)}
          style={{ color: theme.accent2, opacity: 0.22 }}
        >
          {initials(character.name)}
        </span>
      </div>
      <div
        className="absolute left-2 top-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
        style={{
          color: theme.accent2,
          backgroundColor: "rgba(0,0,0,0.45)",
          boxShadow: `inset 0 0 0 1px ${theme.accent}66`,
        }}
      >
        {theme.title}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}

// ── Gold name-plate ribbon ────────────────────────────────────────────────────

export function NamePlate({
  name,
  className,
  small,
}: {
  name: string;
  className?: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "nameplate clip-ribbon relative mx-auto overflow-hidden text-center",
        small ? "px-3 py-0.5" : "px-4 py-1",
        className,
      )}
    >
      <span
        className={cn(
          "block truncate font-display uppercase italic leading-tight text-[#2a1605]",
          small ? "text-[10px]" : "text-xs sm:text-sm",
        )}
        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
      >
        {name}
      </span>
    </div>
  );
}

// ── Part sub-ribbon (echoes the game's ASSIST plate position) ────────────────

function PartTag({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      className="clip-ribbon mx-auto flex max-w-full items-center justify-center gap-1.5 bg-black/85 px-2.5 py-[3px]"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}55` }}
    >
      <span
        className="shrink-0 font-display text-[8px] uppercase leading-none tracking-[0.08em] sm:text-[9px]"
        style={{ color: accent }}
      >
        {title}
      </span>
      <span className="truncate text-[8px] font-bold uppercase leading-none tracking-[0.06em] text-zinc-300 sm:text-[9px]">
        {subtitle}
      </span>
    </div>
  );
}

// ── Rarity strip + lock-in flourish ──────────────────────────────────────────

function RarityStrip({ rarity }: { rarity: RarityTier }) {
  return (
    <div
      className="mx-auto flex w-fit max-w-full items-center gap-1 px-2 py-[2px] text-center"
      style={{
        background: `linear-gradient(180deg, ${rarity.color}f2, ${rarity.color2 ?? rarity.color}cc)`,
        boxShadow: `0 0 10px ${rarity.color}99, inset 0 1px 0 rgba(255,255,255,0.4)`,
        clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
      }}
    >
      <span
        className="truncate font-display text-[8px] uppercase leading-none tracking-[0.12em] text-black/85 sm:text-[9px]"
        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
      >
        {rarity.short}
      </span>
    </div>
  );
}

/** A burst of radial shards used by the higher rarity tiers. */
function Shards({ color, color2, count, dist }: { color: string; color2: string; count: number; dist: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (360 / count) * i + (i % 2) * 12;
        const d = dist * (0.7 + ((i * 37) % 30) / 100);
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={
              {
                background: i % 2 ? color2 : color,
                boxShadow: `0 0 8px ${i % 2 ? color2 : color}`,
                animation: `rarityShard 1.1s ease-out forwards`,
                ["--a" as string]: `${a}deg`,
                ["--d" as string]: `${d}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}

function RarityBurst({ rarity }: { rarity: RarityTier }) {
  const { anim, color, color2 } = rarity;

  if (anim === "vbad") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div
          className="absolute inset-0"
          style={{
            animation: "vbadFlicker 0.7s ease-out forwards",
            background: `radial-gradient(circle at 50% 45%, ${color}cc, transparent 70%)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px]"
          style={{
            animation: "vbadPuff 0.8s ease-out forwards",
            background: `radial-gradient(circle, ${color2}, transparent 70%)`,
          }}
        />
      </div>
    );
  }

  if (anim === "bad") {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          animation: "rarityFlash 0.45s ease-out forwards",
          background: `radial-gradient(circle at 50% 45%, ${color}, transparent 68%)`,
        }}
      />
    );
  }

  if (anim === "normal") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div
          className="absolute inset-0"
          style={{
            animation: "rarityFlash 0.55s ease-out forwards",
            background: `radial-gradient(circle at 50% 42%, #ffffff, ${color} 55%, transparent 76%)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: color, animation: "rarityRing 0.6s ease-out forwards" }}
        />
      </div>
    );
  }

  // strong / vstrong / op — escalating layered explosions
  const isOp = anim === "op";
  const isVStrong = anim === "vstrong";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* core flash */}
      <div
        className="absolute inset-0"
        style={{
          animation: `rarityFlash ${isOp ? "0.8s" : "0.6s"} ease-out forwards`,
          background: `radial-gradient(circle at 50% 42%, #ffffff, ${color} 50%, transparent 78%)`,
        }}
      />
      {/* rotating ray fan */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "180%",
          aspectRatio: "1",
          animation: `rarityRays ${isOp ? "1.6s" : isVStrong ? "1.1s" : "0.85s"} ease-out forwards`,
          background: isOp
            ? "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.9) 0deg 4deg, transparent 4deg 15deg)"
            : `repeating-conic-gradient(from 0deg, ${color} 0deg 5deg, transparent 5deg 18deg)`,
          WebkitMaskImage: "radial-gradient(circle, black 6%, transparent 64%)",
          maskImage: "radial-gradient(circle, black 6%, transparent 64%)",
          filter: isOp ? "hue-rotate(0deg)" : undefined,
        }}
      />
      {/* shock rings */}
      <div
        className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: color, animation: "rarityRing 0.7s ease-out forwards" }}
      />
      {isOp && (
        <div
          className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: color2, animation: "rarityRing 0.95s ease-out 0.15s forwards" }}
        />
      )}
      {/* flung shards */}
      <Shards
        color={color}
        color2={color2}
        count={isOp ? 16 : isVStrong ? 10 : 6}
        dist={isOp ? 150 : 110}
      />
      {/* prismatic sweep (op + vstrong) */}
      {(isOp || isVStrong) && (
        <div
          className="absolute inset-y-0 w-1/2"
          style={{
            animation: `prismSweep ${isOp ? "1.1s" : "0.9s"} ease-in-out forwards`,
            background: isOp
              ? "linear-gradient(90deg, transparent, rgba(255,0,128,0.4), rgba(255,214,0,0.5), rgba(0,200,255,0.4), transparent)"
              : `linear-gradient(90deg, transparent, ${color}88, transparent)`,
            mixBlendMode: "screen",
          }}
        />
      )}
    </div>
  );
}

// ── Tall slanted VS-board fighter panel (the ASBR select-screen pillar) ───────

export function BoardPanel({
  character,
  accent,
  tint,
  ordinal,
  reeling = false,
  locked = false,
  flashNonce = 0,
  trophy = false,
}: {
  character?: Character;
  accent: string;
  tint: string;
  ordinal: string;
  reeling?: boolean;
  locked?: boolean;
  flashNonce?: number;
  trophy?: boolean;
}) {
  const theme = character ? partTheme(character.part) : undefined;
  const rarity = rarityOf(character);
  const showRarity = Boolean(character) && !reeling;
  const isOp = showRarity && rarity.anim === "op";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      {/* ── ordinal label, now ABOVE the pillar ── */}
      <span
        className="text-stroke-dark font-display text-2xl italic leading-none sm:text-[1.9rem]"
        style={{
          color: tint,
          textShadow: `0 0 10px ${accent}, 0 0 20px ${accent}aa, 0 2px 0 rgba(0,0,0,0.55)`,
        }}
      >
        {ordinal}
      </span>

      <div
        className={cn("relative w-full", locked && "animate-lock-pop")}
        style={{ aspectRatio: "2 / 5" }}
      >
        {/* Overpowered rainbow halo, spinning behind the pillar */}
        {isOp && (
          <div
            className="anim-op-halo pointer-events-none absolute -inset-2"
            style={{
              background:
                "conic-gradient(from 0deg, #ff3fd0, #ffe14d, #35e8ff, #b06bff, #ff3fd0)",
              filter: "blur(14px)",
              opacity: 0.7,
            }}
          />
        )}

        {/* persistent rarity aura (skip the two dullest tiers) */}
        {showRarity && rarity.rank >= 3 && !isOp && (
          <div
            className="anim-aura pointer-events-none absolute -inset-1"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${rarity.color}, transparent 70%)`,
              filter: "blur(10px)",
            }}
          />
        )}

        {/* accent frame — drop-shadow follows the clipped slant for a neon edge */}
        <div
          className={cn("clip-panel relative h-full w-full", isOp && "anim-op-aura")}
          style={{
            background: `linear-gradient(158deg, ${accent} 0%, ${accent}55 52%, ${accent}dd 100%)`,
            filter: `drop-shadow(0 0 5px ${accent}cc) drop-shadow(0 0 16px ${accent}55)`,
          }}
        >
          {/* inner content sits 3px inside, leaving the accent as a neon border */}
          <div className="clip-panel absolute inset-[3px] overflow-hidden bg-black">
            <div className={cn("h-full w-full", reeling && "animate-slot-reel")}>
              <CharacterPortrait
                character={character}
                placeholderAccent={accent}
                monogramScale="text-5xl sm:text-7xl"
              />
            </div>

            {/* top shade + bottom scrim for legibility */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* scanline veil */}
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_3px)] opacity-40" />

            {/* rarity lock-in burst */}
            {locked && flashNonce > 0 && character && (
              <RarityBurst key={flashNonce} rarity={rarity} />
            )}

            {trophy && (
              <div className="absolute right-1.5 top-1.5 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/75 text-gold shadow-impact">
                <Skull size={15} />
              </div>
            )}

            {/* rarity strip pinned just inside the top */}
            {showRarity && (
              <div className="absolute inset-x-1 top-1 z-20">
                <RarityStrip rarity={rarity} />
              </div>
            )}
          </div>
        </div>

        {/* gold name ribbon + part sub-ribbon, pinned to the lower third */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[5%] z-20 grid gap-1 px-1">
          <NamePlate
            name={reeling ? "???" : character ? character.name : "READY"}
            small
          />
          {character && !reeling && theme && (
            <PartTag
              title={theme.title}
              subtitle={theme.subtitle}
              accent={theme.accent}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact chip (used in feeds / history / stat lists) ──────────────────────

export function CharacterChip({
  id,
  accent,
  trophy = false,
  size = "md",
  right,
}: {
  id: string;
  accent?: string;
  trophy?: boolean;
  size?: "sm" | "md";
  right?: ReactNode;
}) {
  const character = getCharacter(id);
  const theme = character ? partTheme(character.part) : undefined;
  const dim = accent ?? theme?.accent ?? "#6b5b44";
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={cn("relative shrink-0 overflow-hidden border", box)}
        style={{ borderColor: `${dim}88` }}
      >
        <CharacterPortrait character={character} monogramScale="text-lg" />
        {trophy && (
          <div className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/80 text-gold">
            <Skull size={9} />
          </div>
        )}
      </div>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-bold",
          size === "sm" ? "text-xs" : "text-sm",
        )}
        title={character?.name ?? id}
      >
        {character?.name ?? id}
      </span>
      {right}
    </div>
  );
}
