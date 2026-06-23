"use client";

import { CharacterChip } from "@/components/character";
import { pct } from "@/components/ui";
import { LUCK_CAP } from "@/lib/draw";
import { CHARACTERS, RARITY, getCharacter } from "@/lib/roster";
import { collectionFor, playerName, useStore } from "@/lib/store";
import {
  characterRecordsForPlayer,
  collectionStats,
  killLeader,
  playerRecord,
} from "@/lib/stats";
import type { CollectionStats, Match, Player, RarityLuck } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Crown, Dice5, Sparkles, Swords, TrendingUp, X } from "lucide-react";
import { useMemo } from "react";

export function PlayerProfile({
  player,
  onClose,
}: {
  player: Player;
  onClose: () => void;
}) {
  const players = useStore((s) => s.players);
  const matchesMap = useStore((s) => s.matches);
  const collections = useStore((s) => s.collections);
  const matches = useMemo(() => Object.values(matchesMap), [matchesMap]);

  const collection = collectionFor(collections, player.id);
  const cstats = useMemo(
    () => collectionStats(collection, CHARACTERS),
    [collection],
  );

  const record = playerRecord(player.id, matches);
  const charRecords = characterRecordsForPlayer(player.id, matches);
  const best = charRecords.find((r) => r.matches >= 2) ?? null;

  const history = useMemo(
    () =>
      matches
        .filter((m) => m.p1Id === player.id || m.p2Id === player.id)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [matches, player.id],
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="animate-overlay-in flex max-h-[90vh] w-full max-w-4xl flex-col border border-white/15 bg-ink shadow-impact"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br from-cyan to-rose font-display text-xl text-abyss">
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-2xl uppercase italic leading-none sm:text-3xl">
                {player.name}
              </h2>
              <p className="text-xs text-zinc-500">
                Joined {timeAgo(player.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto p-4 sm:p-5">
          {/* top stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Matches" value={record.matches} />
            <MiniStat label="Wins" value={record.wins} accent="#b6ff4f" />
            <MiniStat label="Losses" value={record.losses} accent="#ff3f7c" />
            <MiniStat
              label="Win Rate"
              value={record.matches ? pct(record.winRate) : "—"}
              accent="#ffd66b"
            />
          </div>

          {/* best character banner */}
          {best && (
            <div className="nameplate clip-card flex items-center gap-3 px-4 py-3">
              <Crown size={20} className="shrink-0 text-[#2a1605]" />
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a3a0f]">
                  Best Character
                </p>
                <p className="truncate font-display text-xl uppercase italic text-[#2a1605]">
                  {getCharacter(best.characterId)?.name ?? best.characterId} ·{" "}
                  {pct(best.winRate)} over {best.matches}
                </p>
              </div>
            </div>
          )}

          {/* gacha collection */}
          <CollectionSection stats={cstats} />

          {/* character stats table */}
          <div>
            <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-zinc-200">
              Character Stats
            </h3>
            {charRecords.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches recorded yet.</p>
            ) : (
              <div className="overflow-hidden border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-black/50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-2 font-black">Character</th>
                      <th className="px-2 py-2 text-center font-black">M</th>
                      <th className="px-2 py-2 text-center font-black">W</th>
                      <th className="px-2 py-2 text-center font-black">L</th>
                      <th className="px-3 py-2 text-right font-black">Win %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charRecords.map((r) => {
                      const isBest = best?.characterId === r.characterId;
                      return (
                        <tr
                          key={r.characterId}
                          className={cn(
                            "border-t border-white/5",
                            isBest && "bg-gold/10",
                          )}
                        >
                          <td className="px-3 py-2">
                            <CharacterChip id={r.characterId} size="sm" />
                          </td>
                          <td className="px-2 py-2 text-center text-zinc-300">
                            {r.matches}
                          </td>
                          <td className="px-2 py-2 text-center text-acid">
                            {r.wins}
                          </td>
                          <td className="px-2 py-2 text-center text-rose">
                            {r.losses}
                          </td>
                          <td className="px-3 py-2 text-right font-display text-base text-gold">
                            {pct(r.winRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* match history */}
          <div>
            <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-zinc-200">
              Match History
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches yet.</p>
            ) : (
              <div className="grid gap-2">
                {history.map((m) => (
                  <HistoryRow
                    key={m.id}
                    match={m}
                    playerId={player.id}
                    opponentName={playerName(
                      players,
                      m.p1Id === player.id ? m.p2Id : m.p1Id,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="border border-white/10 bg-black/40 px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p
        className="font-display text-2xl uppercase"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryRow({
  match,
  playerId,
  opponentName,
}: {
  match: Match;
  playerId: string;
  opponentName: string;
}) {
  const isP1 = match.p1Id === playerId;
  const myTeam = isP1 ? match.p1Team : match.p2Team;
  const oppTeam = isP1 ? match.p2Team : match.p1Team;
  const won = match.winnerId === playerId;
  const trophyId = killLeader(match.kills)?.characterId;

  return (
    <div
      className={cn(
        "grid items-center gap-2 border-l-4 bg-black/30 p-2 sm:grid-cols-[auto_1fr_auto_1fr]",
        won ? "border-acid" : "border-rose",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "px-2 py-0.5 font-display text-sm uppercase",
            won ? "bg-acid/20 text-acid" : "bg-rose/20 text-rose",
          )}
        >
          {won ? "Win" : "Loss"}
        </span>
        <span className="text-[11px] text-zinc-500">{timeAgo(match.date)}</span>
      </div>

      <TeamRow team={myTeam} trophyId={trophyId} accent="#35e8ff" />

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Swords size={13} />
        <span className="truncate font-bold text-zinc-300">{opponentName}</span>
      </div>

      <TeamRow team={oppTeam} trophyId={trophyId} accent="#ff3f7c" />
    </div>
  );
}

function TeamRow({
  team,
  trophyId,
  accent,
}: {
  team: string[];
  trophyId?: string;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {team.map((id) => (
        <div key={id} className="min-w-0 max-w-[10rem] flex-1">
          <CharacterChip id={id} accent={accent} size="sm" trophy={trophyId === id} />
        </div>
      ))}
    </div>
  );
}

// ── Collection ───────────────────────────────────────────────────────────────

function rate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number): string {
  const v = value.toFixed(2);
  return value > 0 ? `+${v}` : v;
}

// Tiers shown best-first, matching the algorithm's boostable rarities.
const LUCK_TIERS = [1, 3, 5];

function CollectionSection({ stats }: { stats: CollectionStats }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 font-display text-lg uppercase tracking-wide text-zinc-200">
        <Dice5 size={18} className="text-gold" />
        Collection
        <span className="ml-1 text-sm font-bold normal-case tracking-normal text-zinc-500">
          {stats.totalPulls} pull{stats.totalPulls === 1 ? "" : "s"}
        </span>
      </h3>

      {stats.totalPulls === 0 ? (
        <p className="border border-dashed border-white/15 bg-black/30 px-4 py-6 text-center text-sm text-zinc-500">
          No pulls yet — spin a match with this player to start their collection.
        </p>
      ) : (
        <div className="grid gap-3">
          {/* estimated (algorithm) vs actual (history) — kept separate */}
          <div className="grid gap-3 sm:grid-cols-2">
            <EstimatedCard stats={stats} />
            <ActualCard stats={stats} />
          </div>

          {/* rarity breakdown */}
          <RarityBreakdown counts={stats.rarityCounts} />

          {/* pulled characters */}
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Pulled Characters
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {stats.entries.map((e) => (
                <CharacterChip
                  key={e.characterId}
                  id={e.characterId}
                  accent={RARITY[e.rarity]?.color}
                  size="sm"
                  right={
                    <span
                      className="px-1.5 font-display text-base tabular-nums"
                      style={{ color: RARITY[e.rarity]?.color ?? "#fff" }}
                    >
                      ×{e.count}
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EstimatedCard({ stats }: { stats: CollectionStats }) {
  return (
    <div className="border border-cyan/25 bg-cyan/[0.04] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan">
        <Sparkles size={13} /> Estimated · Algorithm
      </p>
      <LuckBars luck={stats.luck} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatCell label="Est. OP Rate" value={rate(stats.estimatedOpRate)} />
        <StatCell
          label="Est. Luck Index"
          value={signed(stats.estimatedPerformance)}
        />
      </div>
    </div>
  );
}

function ActualCard({ stats }: { stats: CollectionStats }) {
  // Honest verdict: did real pulls beat the algorithm's expectation?
  const luckier = stats.actualPerformance >= stats.estimatedPerformance;
  const delta = stats.actualPerformance - stats.estimatedPerformance;
  return (
    <div className="border border-gold/25 bg-gold/[0.04] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gold">
        <TrendingUp size={13} /> Actual · History
      </p>
      <div className="grid grid-cols-2 gap-2">
        <StatCell label="Actual OP Rate" value={rate(stats.actualOpRate)} />
        <StatCell
          label="Actual Luck Index"
          value={signed(stats.actualPerformance)}
          accent={luckier ? "#b6ff4f" : "#ff7a9c"}
        />
      </div>
      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] font-black uppercase tracking-wide",
          luckier ? "bg-acid/10 text-acid" : "bg-rose/10 text-rose",
        )}
      >
        <span>{luckier ? "Luckier than expected" : "Unluckier than expected"}</span>
        <span className="tabular-nums">{signed(delta)}</span>
      </div>
    </div>
  );
}

function LuckBars({ luck }: { luck: RarityLuck }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        Algorithm Luck · per rarity
      </p>
      {LUCK_TIERS.map((value) => {
        const tier = RARITY[value];
        const v = Math.max(0, luck?.[value] ?? 0);
        const pctW = Math.min(100, Math.round((v / LUCK_CAP) * 100));
        return (
          <div key={value} className="flex items-center gap-2">
            <span
              className="w-[5.5rem] shrink-0 text-[10px] font-black uppercase tracking-wide"
              style={{ color: tier.color }}
            >
              {tier.short}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-black/40">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pctW}%`, background: tier.color }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-[10px] font-black tabular-nums text-zinc-400">
              {Math.round(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RarityBreakdown({ counts }: { counts: Record<number, number> }) {
  const tiers = [1, 3, 5, 7, 9, 10].filter((v) => (counts[v] ?? 0) > 0);
  if (tiers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tiers.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1.5 border px-2 py-1 text-[11px] font-black uppercase tracking-wide"
          style={{ borderColor: `${RARITY[v].color}55`, color: RARITY[v].color }}
        >
          {RARITY[v].short}
          <span className="tabular-nums text-white">{counts[v]}</span>
        </span>
      ))}
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="border border-white/10 bg-black/30 px-2.5 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p
        className="font-display text-lg uppercase tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}
