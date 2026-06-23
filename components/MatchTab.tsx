"use client";

import { BoardPanel } from "@/components/character";
import { KillsEditor } from "@/components/KillsEditor";
import { ConfirmButton, EmptyHint, Panel } from "@/components/ui";
import {
  LUCK_GUARANTEE,
  guaranteeReady,
  weightedDrawTeams,
} from "@/lib/draw";
import {
  ALL_PARTS,
  CHARACTERS,
  PART_THEME,
  getCharacter,
  rarityOf,
  type RarityTier,
} from "@/lib/roster";
import { collectionFor, playerName, useStore } from "@/lib/store";
import type { RarityLuck } from "@/lib/types";
import {
  h2hRecord,
  hasPlayed,
  isRivalry,
  killLeader,
  matchArray,
} from "@/lib/stats";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Ban,
  ChevronRight,
  Flame,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CYAN = "#35e8ff";
const PINK = "#ff3f7c";
const ORDINALS = ["1st", "2nd", "3rd"];

// ── helpers ──────────────────────────────────────────────────────────────────

function randomFrom(ids: string[]): string {
  return ids[Math.floor(Math.random() * ids.length)] ?? "";
}

// ── tiny audio (optional ticks) ──────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
function beep(freq: number, dur = 0.08, type: OscillatorType = "square") {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  audioCtx = audioCtx ?? new Ctor();
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// ── slot machine ─────────────────────────────────────────────────────────────
// Visible reel state (display/locked/flash) lives in React state so render
// never touches a ref. All timing internals (finals, lastChange, start clock)
// live in a ref and are only ever read/written inside callbacks — never render.

type VisibleSlots = {
  display: (string | undefined)[];
  locked: boolean[];
  flash: number[];
};

type Internals = VisibleSlots & {
  lastChange: number[];
  finals: (string | undefined)[];
  start: number;
};

function blankInternals(): Internals {
  return {
    display: Array(6).fill(undefined),
    locked: Array(6).fill(false),
    flash: Array(6).fill(0),
    lastChange: Array(6).fill(0),
    finals: Array(6).fill(undefined),
    start: 0,
  };
}

function blankVisible(): VisibleSlots {
  return {
    display: Array(6).fill(undefined),
    locked: Array(6).fill(false),
    flash: Array(6).fill(0),
  };
}

function useSlotMachine(
  poolIds: string[],
  sound: boolean,
  onResolved: () => void,
) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "locked">("idle");
  const [slots, setSlots] = useState<VisibleSlots>(blankVisible);

  const internals = useRef<Internals>(blankInternals());
  const timer = useRef<number | undefined>(undefined);
  const poolRef = useRef(poolIds);
  const soundRef = useRef(sound);
  const resolvedRef = useRef(onResolved);

  // Keep the latest props in refs without reading/writing them during render.
  useEffect(() => {
    poolRef.current = poolIds;
  }, [poolIds]);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    resolvedRef.current = onResolved;
  }, [onResolved]);

  const stop = useCallback(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Mirror the mutable internals into render state.
  const sync = () => {
    setSlots({
      display: [...internals.current.display],
      locked: [...internals.current.locked],
      flash: [...internals.current.flash],
    });
  };

  const reset = () => {
    stop();
    internals.current = blankInternals();
    sync();
    setPhase("idle");
  };

  const tick = () => {
    const now = performance.now();
    const reel = internals.current;
    const elapsed = now - reel.start;
    let remaining = false;
    for (let i = 0; i < 6; i += 1) {
      if (reel.locked[i]) continue;
      const row = Math.floor(i / 2);
      const lockAt = 1500 + row * 460; // 1st ~1.5s, 2nd ~2.0s, 3rd ~2.4s
      if (elapsed >= lockAt) {
        reel.display[i] = reel.finals[i];
        reel.locked[i] = true;
        reel.flash[i] = now;
        if (soundRef.current) beep(140 + row * 60, 0.12, "sawtooth");
      } else {
        remaining = true;
        const t = Math.min(1, elapsed / lockAt);
        const cadence = 45 + 150 * t * t; // fast → slow
        if (now - reel.lastChange[i] >= cadence) {
          reel.display[i] = randomFrom(poolRef.current);
          reel.lastChange[i] = now;
        }
      }
    }
    sync();
    if (!remaining) {
      stop();
      setPhase("locked");
      if (soundRef.current) beep(520, 0.3, "sawtooth");
      resolvedRef.current();
    }
  };

  const start = (teams: { p1: string[]; p2: string[] }) => {
    stop();
    const next = blankInternals();
    next.finals = [
      teams.p1[0],
      teams.p2[0],
      teams.p1[1],
      teams.p2[1],
      teams.p1[2],
      teams.p2[2],
    ];
    next.display = next.finals.map(() => randomFrom(poolRef.current));
    next.start = performance.now();
    internals.current = next;
    sync();
    setPhase("spinning");
    if (soundRef.current) beep(90, 0.25, "square");
    timer.current = window.setInterval(tick, 24);
  };

  return { phase, slots, start, reset };
}

// ── player select ────────────────────────────────────────────────────────────

function PlayerSelect({
  label,
  accent,
  value,
  onChange,
  players,
  align,
}: {
  label: string;
  accent: string;
  value: string;
  onChange: (id: string) => void;
  players: Player[];
  align: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p
        className="mb-1 font-display text-sm uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 bg-black/70 px-3 py-3 font-display text-lg uppercase text-white outline-none sm:text-xl"
        style={{ borderColor: accent, boxShadow: `0 0 16px ${accent}44` }}
      >
        <option value="">— pick player —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── versus splatter (center paint-cross) ─────────────────────────────────────

function VsSplatter({ active }: { active: boolean }) {
  return (
    <div
      className="relative z-20 flex shrink-0 items-center justify-center self-stretch pt-7 sm:pt-9"
      style={{ width: "clamp(42px, 6vw, 90px)" }}
    >
      {/* radiating paint flecks */}
      <div
        className="animate-starburst pointer-events-none absolute h-32 w-32 opacity-70 sm:h-44 sm:w-44"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,63,124,0.55) 0deg 5deg, transparent 5deg 19deg)",
          WebkitMaskImage: "radial-gradient(circle, black 6%, transparent 62%)",
          maskImage: "radial-gradient(circle, black 6%, transparent 62%)",
        }}
      />
      {/* soft magenta bloom */}
      <div
        className="pointer-events-none absolute h-24 w-24 rounded-full sm:h-32 sm:w-32"
        style={{
          background:
            "radial-gradient(circle, rgba(255,63,124,0.5), rgba(255,63,124,0.1) 55%, transparent 72%)",
          filter: "blur(2px)",
        }}
      />
      <div
        className={cn(
          "relative font-display text-5xl italic leading-none sm:text-7xl",
          active && "animate-vs-pulse",
        )}
        style={{
          color: "#ffffff",
          WebkitTextStroke: "2px #ff1f6a",
          textShadow:
            "0 0 16px #ff3f7c, 0 0 34px rgba(255,63,124,0.7), 0 3px 0 #5a0a22",
        }}
      >
        VS
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MATCH TAB
// ═══════════════════════════════════════════════════════════════════════════

export function MatchTab() {
  const players = useStore((s) => s.players);
  const matchesMap = useStore((s) => s.matches);
  const recordMatch = useStore((s) => s.recordMatch);
  const pushToast = useStore((s) => s.pushToast);
  const collections = useStore((s) => s.collections);
  const recordDraw = useStore((s) => s.recordDraw);

  const playerList = useMemo(
    () =>
      Object.values(players).sort((a, b) => a.name.localeCompare(b.name)),
    [players],
  );
  const matches = useMemo(() => matchArray(matchesMap), [matchesMap]);

  const [p1Id, setP1Id] = useState("");
  const [p2Id, setP2Id] = useState("");
  const [parts, setParts] = useState<Set<number>>(new Set(ALL_PARTS));
  const [p1Ban, setP1Ban] = useState("");
  const [p2Ban, setP2Ban] = useState("");
  const [sound, setSound] = useState(true);

  const [finalTeams, setFinalTeams] = useState<{
    p1: string[];
    p2: string[];
  } | null>(null);
  const [kills, setKills] = useState<Record<string, number>>({});
  const [showKills, setShowKills] = useState(false);
  const [firstEncounter, setFirstEncounter] = useState(false);
  const [victory, setVictory] = useState<{ name: string; accent: string } | null>(
    null,
  );

  const pool = useMemo(
    () => CHARACTERS.filter((c) => parts.has(c.part)),
    [parts],
  );
  const poolIds = useMemo(() => pool.map((c) => c.id), [pool]);

  const [rarityCallout, setRarityCallout] = useState<RarityTier | null>(null);

  // When the reel fully resolves, headline the rarest fighter drawn — but only
  // for the truly special Overpowered pull, so the callout stays a big moment.
  const handleResolved = useCallback(() => {
    setFinalTeams((current) => {
      if (current) {
        const best = [...current.p1, ...current.p2]
          .map((id) => rarityOf(getCharacter(id)))
          .reduce((acc, t) => (t.rank > acc.rank ? t : acc));
        if (best.value === 1) {
          setRarityCallout(best);
          window.setTimeout(() => setRarityCallout(null), 2300);
        }
      }
      return current;
    });
  }, []);

  const machine = useSlotMachine(poolIds, sound, handleResolved);
  const { phase, slots, start: startMachine, reset: resetMachine } = machine;

  // Effective selections: fall back to the first two distinct players until the
  // user makes an explicit pick (derived — no auto-pick effect needed).
  const effP1 = p1Id || playerList[0]?.id || "";
  const effP2 = p2Id || playerList.find((p) => p.id !== effP1)?.id || "";

  function resetBoard() {
    resetMachine();
    setFinalTeams(null);
    setKills({});
    setShowKills(false);
    setRarityCallout(null);
  }

  function changeP1(id: string) {
    setP1Id(id);
    if (phase !== "spinning") resetBoard();
  }
  function changeP2(id: string) {
    setP2Id(id);
    if (phase !== "spinning") resetBoard();
  }

  const enoughPlayers = playerList.length >= 2;
  const samePick = Boolean(effP1) && effP1 === effP2;
  const validMatchup = Boolean(effP1 && effP2 && effP1 !== effP2);
  const poolOk = poolIds.length >= 6;
  const canSpin = enoughPlayers && validMatchup && poolOk && phase !== "spinning";

  const rivalry = validMatchup ? h2hRecord(effP1, effP2, matches) : null;
  const showRivalryBadge = validMatchup && isRivalry(effP1, effP2, matches);

  const killLead = killLeader(kills);

  // Weighted draw + Resonance bookkeeping, shared by Spin and Re-spin. Each
  // side is drawn against ITS player's luck, and the pull is logged to their
  // collection (which advances their per-rarity luck).
  function drawAndAdvance() {
    const p1Luck = collectionFor(collections, effP1).luck;
    const p2Luck = collectionFor(collections, effP2).luck;
    const result = weightedDrawTeams(pool, p1Luck, p2Luck, p1Ban, p2Ban);
    const teams = { p1: result.p1, p2: result.p2 };
    recordDraw([
      { playerId: effP1, characterIds: result.p1 },
      { playerId: effP2, characterIds: result.p2 },
    ]);
    if (result.p1Guaranteed || result.p2Guaranteed) {
      const who =
        result.p1Guaranteed && result.p2Guaranteed
          ? "Both sides"
          : playerName(players, result.p1Guaranteed ? effP1 : effP2);
      pushToast(
        "info",
        `Resonance discharged — ${who} answered with a Very Strong+ fighter.`,
      );
    }
    return teams;
  }

  function handleSpin() {
    if (!canSpin) return;
    const teams = drawAndAdvance();
    setFinalTeams(teams);
    setKills({});
    setShowKills(false);
    if (!hasPlayed(effP1, effP2, matches)) {
      setFirstEncounter(true);
      window.setTimeout(() => setFirstEncounter(false), 2300);
    }
    startMachine(teams);
  }

  function handleReSpin() {
    if (phase === "spinning" || !validMatchup) return;
    const teams = drawAndAdvance();
    setFinalTeams(teams);
    setKills({});
    setShowKills(false);
    startMachine(teams);
  }

  function declareWinner(winnerId: string) {
    if (!finalTeams || phase !== "locked") return;
    const cleanKills =
      showKills && Object.values(kills).some((v) => v > 0)
        ? Object.fromEntries(
            [...finalTeams.p1, ...finalTeams.p2]
              .map((id) => [id, kills[id] ?? 0] as const)
              .filter(([, v]) => v > 0),
          )
        : null;

    recordMatch({
      p1Id: effP1,
      p2Id: effP2,
      p1Team: finalTeams.p1,
      p2Team: finalTeams.p2,
      winnerId,
      kills: cleanKills,
    });

    const accent = winnerId === effP1 ? CYAN : PINK;
    setVictory({ name: playerName(players, winnerId), accent });
    window.setTimeout(() => setVictory(null), 1600);
    pushToast("success", `Match recorded — ${playerName(players, winnerId)} wins!`);

    resetBoard();
  }

  const p1Rows = [0, 1, 2].map((row) => {
    const i = row * 2;
    return {
      display: slots.display[i],
      locked: slots.locked[i],
      flash: slots.flash[i],
      reeling: phase === "spinning" && !slots.locked[i],
      trophy: phase === "locked" && killLead?.characterId === slots.display[i],
    };
  });
  const p2Rows = [0, 1, 2].map((row) => {
    const i = row * 2 + 1;
    return {
      display: slots.display[i],
      locked: slots.locked[i],
      flash: slots.flash[i],
      reeling: phase === "spinning" && !slots.locked[i],
      trophy: phase === "locked" && killLead?.characterId === slots.display[i],
    };
  });

  if (!enoughPlayers) {
    return (
      <Panel>
        <EmptyHint
          icon={<Users size={28} />}
          title="Add players to begin"
        >
          The randomizer needs at least two registered players. Head to the{" "}
          <span className="text-gold">Players</span> tab to add some fighters,
          then come back to spin.
        </EmptyHint>
      </Panel>
    );
  }

  return (
    <div className="grid gap-5">
      {/* selectors */}
      <Panel className="!p-4">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PlayerSelect
            label="Player 1 · Cyan"
            accent={CYAN}
            value={effP1}
            onChange={changeP1}
            players={playerList}
            align="left"
          />
          <div className="hidden self-center font-display text-2xl italic text-gold sm:block">
            VS
          </div>
          <PlayerSelect
            label="Player 2 · Pink"
            accent={PINK}
            value={effP2}
            onChange={changeP2}
            players={playerList}
            align="right"
          />
        </div>

        {samePick && (
          <p className="mt-2 text-center text-sm text-rose">
            Pick two different players.
          </p>
        )}

        {showRivalryBadge && rivalry && (
          <div className="mt-3 flex items-center justify-center">
            <div className="flex items-center gap-3 border border-gold/60 bg-gold/10 px-4 py-1.5">
              <Flame size={16} className="text-gold" />
              <span className="font-display text-sm uppercase tracking-[0.2em] text-gold">
                Rivalry
              </span>
              <span className="font-display text-lg" style={{ color: CYAN }}>
                {rivalry.aWins}
              </span>
              <span className="text-zinc-500">–</span>
              <span className="font-display text-lg" style={{ color: PINK }}>
                {rivalry.bWins}
              </span>
              <span className="text-xs text-zinc-400">
                ({rivalry.total} bouts)
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* pool filters + bans */}
      <Panel className="!p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.18em] text-zinc-300">
                <Zap size={14} className="text-gold" /> Randomizer Pool
              </p>
              <span
                className={cn(
                  "text-xs font-black uppercase",
                  poolOk ? "text-acid" : "text-rose",
                )}
              >
                {poolIds.length} fighters
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PARTS.map((part) => {
                const on = parts.has(part);
                const theme = PART_THEME[part];
                return (
                  <button
                    key={part}
                    onClick={() =>
                      setParts((prev) => {
                        const next = new Set(prev);
                        if (next.has(part)) {
                          if (next.size > 1) next.delete(part);
                        } else next.add(part);
                        return next;
                      })
                    }
                    className={cn(
                      "border px-2.5 py-1.5 text-xs font-black uppercase transition",
                      on
                        ? "text-black"
                        : "border-white/10 bg-black/40 text-zinc-500",
                    )}
                    style={
                      on
                        ? {
                            backgroundColor: theme.accent,
                            borderColor: theme.accent,
                          }
                        : undefined
                    }
                    title={theme.subtitle}
                  >
                    P{part}
                  </button>
                );
              })}
            </div>
            {!poolOk && (
              <p className="mt-2 text-xs text-rose">
                Enable enough Parts — at least 6 fighters are needed for a full
                board.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
            <BanSelect
              label="P1 Ban"
              accent={CYAN}
              value={p1Ban}
              onChange={setP1Ban}
              pool={pool}
            />
            <BanSelect
              label="P2 Ban"
              accent={PINK}
              value={p2Ban}
              onChange={setP2Ban}
              pool={pool}
            />
          </div>
        </div>
      </Panel>

      {/* ── the VS stage ──────────────────────────────────────────────── */}
      <div className="relative">
        <div className="asbr-stage relative overflow-hidden border border-gold/25 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          {/* title watermark, faint behind the pillars */}
          <div className="pointer-events-none absolute inset-x-0 top-1.5 z-0 px-4 text-center">
            <span className="font-display text-[9px] uppercase tracking-[0.4em] text-amber-100/15 sm:text-xs sm:tracking-[0.5em]">
              JoJo&apos;s Bizarre Adventure · All-Star Battle R
            </span>
          </div>

          {/* the six fighter pillars flanking the VS splatter */}
          <div className="relative z-10 overflow-x-auto px-2.5 pb-3 pt-7 sm:px-4">
            <div className="mx-auto flex min-w-[640px] max-w-5xl items-stretch gap-1.5 sm:gap-2">
              {/* Player 1 — shown 3rd → 1st so the 1st pick flanks the VS */}
              {[2, 1, 0].map((row) => {
                const r = p1Rows[row];
                return (
                  <BoardPanel
                    key={`l${row}`}
                    character={getCharacter(r.display ?? "")}
                    accent={CYAN}
                    tint="#eafdff"
                    ordinal={ORDINALS[row]}
                    reeling={r.reeling}
                    locked={r.locked}
                    flashNonce={r.flash}
                    trophy={r.trophy}
                  />
                );
              })}

              <VsSplatter active={phase !== "idle"} />

              {/* Player 2 — 1st → 3rd outward from the VS */}
              {[0, 1, 2].map((row) => {
                const r = p2Rows[row];
                return (
                  <BoardPanel
                    key={`r${row}`}
                    character={getCharacter(r.display ?? "")}
                    accent={PINK}
                    tint="#ffe9f1"
                    ordinal={ORDINALS[row]}
                    reeling={r.reeling}
                    locked={r.locked}
                    flashNonce={r.flash}
                    trophy={r.trophy}
                  />
                );
              })}
            </div>
          </div>

          {/* glossy gold command bar, holding the primary Spin action */}
          <div className="asbr-cmdbar relative z-10 flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
            <ResonanceMeter
              sides={[
                {
                  name: playerName(players, effP1),
                  luck: collectionFor(collections, effP1).luck,
                  accent: CYAN,
                },
                {
                  name: playerName(players, effP2),
                  luck: collectionFor(collections, effP2).luck,
                  accent: PINK,
                },
              ]}
            />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden text-[11px] font-black uppercase tracking-[0.14em] text-[#3a2406] sm:inline">
                {phase === "spinning"
                  ? "Rolling…"
                  : phase === "locked"
                    ? "Declare the victor ↓"
                    : canSpin
                      ? "Ready"
                      : "Pick fighters"}
              </span>
              <button
                onClick={handleSpin}
                disabled={!canSpin}
                className={cn(
                  "clip-slash group relative flex items-center gap-2 overflow-hidden px-5 py-2 font-display text-lg uppercase italic tracking-wide transition sm:px-7 sm:text-2xl",
                  canSpin
                    ? "bg-[#190f04] text-gold hover:scale-[1.04]"
                    : "cursor-not-allowed bg-black/30 text-zinc-600",
                )}
                style={
                  canSpin ? { boxShadow: "0 0 22px rgba(0,0,0,0.55)" } : undefined
                }
              >
                {canSpin && (
                  <span className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/25 [animation:sheen_2.6s_ease-in-out_infinite]" />
                )}
                <Swords size={20} />
                {phase === "spinning" ? "Spinning…" : "Spin"}
              </button>
              <div
                className="hidden h-9 w-11 place-items-center bg-[#190f04] text-gold sm:grid"
                style={{
                  clipPath: "polygon(0 0, 68% 0, 100% 50%, 68% 100%, 0 100%)",
                }}
              >
                <ChevronRight size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* overpowered pull callout */}
        {rarityCallout && <RarityCallout rarity={rarityCallout} />}
        {/* first-encounter overlay */}
        {firstEncounter && <FirstEncounterOverlay />}
        {/* victory flourish */}
        {victory && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
            <div
              className="animate-overlay-in border-4 bg-black/85 px-8 py-5 text-center"
              style={{
                borderColor: victory.accent,
                boxShadow: `0 0 50px ${victory.accent}`,
              }}
            >
              <p className="font-display text-sm uppercase tracking-[0.3em] text-zinc-300">
                Winner
              </p>
              <p
                className="font-display text-4xl uppercase italic sm:text-5xl"
                style={{ color: victory.accent }}
              >
                {victory.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* declare winner */}
      {phase === "locked" && finalTeams && (
        <Panel
          title="Declare the Victor"
          icon={<Sparkles size={18} className="text-gold" />}
          className="animate-overlay-in"
          right={
            <button
              onClick={() => setSound((s) => !s)}
              className="grid h-9 w-9 place-items-center border border-white/10 bg-white/5 text-zinc-300 hover:border-gold"
              title={sound ? "Mute" : "Unmute"}
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WinnerButton
              accent={CYAN}
              name={playerName(players, effP1)}
              onClick={() => declareWinner(effP1)}
            />
            <WinnerButton
              accent={PINK}
              name={playerName(players, effP2)}
              onClick={() => declareWinner(effP2)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowKills((s) => !s)}
              className="flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase tracking-wide text-zinc-200 hover:border-gold"
            >
              <Flame size={15} className="text-gold" />
              {showKills ? "Hide kill log" : "Record kills per character"}
            </button>
            <ConfirmButton
              onConfirm={handleReSpin}
              confirmLabel="Re-roll?"
              className="ml-auto"
              title="Re-randomize without recording a match"
            >
              Re-spin
            </ConfirmButton>
          </div>

          {showKills && (
            <KillsEditor
              p1Team={finalTeams.p1}
              p2Team={finalTeams.p2}
              p1Accent={CYAN}
              p2Accent={PINK}
              kills={kills}
              setKills={setKills}
              leaderId={killLead?.characterId}
            />
          )}
        </Panel>
      )}

      {phase === "idle" && (
        <p className="text-center text-sm text-zinc-500">
          {firstEncounterHint(validMatchup, effP1, effP2, matches)}
        </p>
      )}
    </div>
  );
}

function firstEncounterHint(
  valid: boolean,
  p1: string,
  p2: string,
  matches: ReturnType<typeof matchArray>,
) {
  if (!valid) return "Choose two fighters above, then slam Spin.";
  if (!hasPlayed(p1, p2, matches))
    return "These two have never clashed… a first encounter awaits.";
  return "Slam Spin to roll six fates.";
}

// ── sub-parts ────────────────────────────────────────────────────────────────

type ResonanceSide = { name: string; luck: RarityLuck; accent: string };

function ResonanceMeter({ sides }: { sides: ResonanceSide[] }) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 sm:gap-3"
      title={
        "Resonance — per-rarity bad-luck protection. Each side's meter charges " +
        "when they pull weak fighters and discharges when they hit a good tier. " +
        `At full charge their next spin guarantees a Very Strong+ fighter.`
      }
    >
      <span className="hidden font-display text-[10px] uppercase tracking-[0.18em] text-[#3a2406] lg:inline">
        Resonance
      </span>
      <div className="flex items-center gap-2 sm:gap-2.5">
        {sides.map((s, i) => (
          <SideResonance key={i} side={s} />
        ))}
      </div>
    </div>
  );
}

function SideResonance({ side }: { side: ResonanceSide }) {
  // The Very-Strong accumulator is what drives the soft guarantee, so it makes
  // the most legible "charge" headline for the command bar.
  const charge = Math.max(0, side.luck?.[3] ?? 0);
  const pct = Math.min(100, Math.round((charge / LUCK_GUARANTEE) * 100));
  const ready = guaranteeReady(side.luck);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className="grid h-4 w-4 shrink-0 place-items-center text-[8px] font-black text-abyss"
        style={{ background: side.accent }}
      >
        {side.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="relative h-2.5 w-12 overflow-hidden rounded-full bg-black/35 sm:w-20">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            ready && "animate-pulse",
          )}
          style={{
            width: `${pct}%`,
            background: ready
              ? "linear-gradient(90deg, #ffd66b, #ff3fa0)"
              : side.accent,
            boxShadow: ready ? "0 0 9px #ffd66b" : undefined,
          }}
        />
        {ready && (
          <div className="absolute inset-0 [animation:sheen_1.8s_ease-in-out_infinite]">
            <span className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/50" />
          </div>
        )}
      </div>
      <span className="hidden text-[10px] font-black tabular-nums text-[#3a2406] sm:inline">
        {pct}%
      </span>
    </div>
  );
}

function BanSelect({
  label,
  accent,
  value,
  onChange,
  pool,
}: {
  label: string;
  accent: string;
  value: string;
  onChange: (id: string) => void;
  pool: typeof CHARACTERS;
}) {
  return (
    <label className="grid gap-1">
      <span
        className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em]"
        style={{ color: accent }}
      >
        <Ban size={12} /> {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-white/15 bg-black/60 px-2 py-2 text-sm text-white outline-none"
        style={{ borderColor: value ? accent : undefined }}
      >
        <option value="">No ban</option>
        {pool.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function WinnerButton({
  accent,
  name,
  onClick,
}: {
  accent: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="clip-slash flex items-center justify-center gap-2 border-2 bg-black/50 px-5 py-5 font-display text-2xl uppercase italic text-white transition hover:scale-[1.02] sm:text-3xl"
      style={{ borderColor: accent, boxShadow: `0 0 24px ${accent}55` }}
    >
      <span style={{ color: accent }}>{name}</span>
      <span className="text-zinc-400">wins</span>
    </button>
  );
}

function FirstEncounterOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-gold"
          style={{
            left: `${(i * 41) % 100}%`,
            bottom: "10%",
            animation: `sparkFloat ${1.4 + (i % 5) * 0.25}s ease-out ${
              (i % 7) * 0.12
            }s infinite`,
            boxShadow: "0 0 10px #ffd66b",
          }}
        />
      ))}
      <div className="animate-overlay-in relative text-center">
        <p className="font-display text-sm uppercase tracking-[0.4em] text-gold">
          Destiny
        </p>
        <p className="text-outline-gold font-display text-5xl uppercase italic text-gold sm:text-7xl">
          First Encounter
        </p>
        <p className="mt-1 font-display text-lg uppercase tracking-[0.2em] text-zinc-200">
          These two have never met
        </p>
      </div>
    </div>
  );
}

function RarityCallout({ rarity }: { rarity: RarityTier }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      {/* radiant rainbow rays behind the word */}
      <div
        className="animate-starburst absolute h-[140%] w-[140%] opacity-70"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.5) 0deg 3deg, transparent 3deg 13deg)",
          WebkitMaskImage: "radial-gradient(circle, black 4%, transparent 58%)",
          maskImage: "radial-gradient(circle, black 4%, transparent 58%)",
          filter: "hue-rotate(0deg)",
        }}
      />

      {/* sparks flying up */}
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${(i * 37) % 100}%`,
            bottom: "8%",
            background: i % 2 ? rarity.color2 : rarity.color,
            animation: `sparkFloat ${1.3 + (i % 5) * 0.22}s ease-out ${
              (i % 7) * 0.1
            }s infinite`,
            boxShadow: `0 0 10px ${i % 2 ? rarity.color2 : rarity.color}`,
          }}
        />
      ))}

      <div className="animate-overlay-in relative text-center">
        <p
          className="font-display text-sm uppercase tracking-[0.5em]"
          style={{ color: rarity.color2 }}
        >
          Top Tier Pull
        </p>
        <p
          className="anim-op-aura font-display text-5xl uppercase italic sm:text-8xl"
          style={{
            background:
              "linear-gradient(90deg, #ff3fd0, #ffe14d, #35e8ff, #b06bff, #ff3fd0)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextStroke: "1.5px rgba(0,0,0,0.5)",
            filter: "drop-shadow(0 0 18px rgba(255,225,77,0.7))",
          }}
        >
          {rarity.label}
        </p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
