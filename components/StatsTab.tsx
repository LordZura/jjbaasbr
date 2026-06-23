"use client";

import { CharacterChip } from "@/components/character";
import { EmptyHint, Panel, pct } from "@/components/ui";
import { playerName, useStore } from "@/lib/store";
import {
  h2hRecord,
  headToHeadMatrix,
  killLeader,
  leaderboard,
  mostPicked,
  mostWinning,
  recentMatches,
} from "@/lib/stats";
import type { Match, Player } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import {
  BarChart3,
  Crown,
  Flame,
  Medal,
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useMemo } from "react";

const CYAN = "#35e8ff";
const PINK = "#ff3f7c";

export function StatsTab() {
  const players = useStore((s) => s.players);
  const matchesMap = useStore((s) => s.matches);

  const matches = useMemo(() => Object.values(matchesMap), [matchesMap]);
  const playerList = useMemo(() => Object.values(players), [players]);

  const board = useMemo(
    () => leaderboard(playerList, matches, 3),
    [playerList, matches],
  );
  const picks = useMemo(() => mostPicked(matches).slice(0, 8), [matches]);
  const wins = useMemo(
    () => mostWinning(matches).filter((r) => r.wins > 0).slice(0, 8),
    [matches],
  );
  const matrix = useMemo(
    () => headToHeadMatrix(playerList, matches),
    [playerList, matches],
  );
  const rivalries = useMemo(
    () => matrix.filter((m) => m.total >= 5),
    [matrix],
  );
  const recent = useMemo(() => recentMatches(matches, 10), [matches]);

  if (matches.length === 0) {
    return (
      <Panel>
        <EmptyHint icon={<BarChart3 size={28} />} title="No data yet">
          Record some matches on the <span className="text-gold">Match</span>{" "}
          tab and the leaderboard, head-to-heads and character meta will appear
          here.
        </EmptyHint>
      </Panel>
    );
  }

  return (
    <div className="grid gap-5">
      {/* leaderboard */}
      <Panel
        title="Leaderboard"
        icon={<Trophy size={18} className="text-gold" />}
        right={
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">
            min 3 matches
          </span>
        }
      >
        {board.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No one has played 3+ matches yet.
          </p>
        ) : (
          <div className="grid gap-2">
            {board.map((row, i) => (
              <div
                key={row.player.id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-3 border bg-black/30 px-3 py-2.5",
                  i === 0 ? "border-gold/60 bg-gold/5" : "border-white/10",
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center font-display text-xl text-zinc-400">
                  {i === 0 ? (
                    <Crown size={20} className="text-gold" />
                  ) : (
                    `#${i + 1}`
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg uppercase italic">
                    {row.player.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.record.wins}W · {row.record.losses}L ·{" "}
                    {row.record.matches} played
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-gold">
                    {pct(row.record.winRate)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    win rate
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* rivalries */}
      {rivalries.length > 0 && (
        <Panel
          title="Rivalries"
          icon={<Flame size={18} className="text-gold" />}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {rivalries.map((r) => (
              <div
                key={`${r.aId}-${r.bId}`}
                className="flex items-center justify-between gap-3 border border-gold/40 bg-gold/5 px-4 py-3"
              >
                <span
                  className="truncate font-display text-lg uppercase italic"
                  style={{ color: CYAN }}
                >
                  {playerName(players, r.aId)}
                </span>
                <div className="flex shrink-0 items-center gap-2 font-display text-xl">
                  <span style={{ color: CYAN }}>{r.aWins}</span>
                  <Flame size={14} className="text-gold" />
                  <span style={{ color: PINK }}>{r.bWins}</span>
                </div>
                <span
                  className="truncate text-right font-display text-lg uppercase italic"
                  style={{ color: PINK }}
                >
                  {playerName(players, r.bId)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* character meta */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Most Picked"
          icon={<Medal size={18} className="text-cyan" />}
        >
          <RankedCharList
            rows={picks.map((p) => ({
              id: p.characterId,
              value: `${p.count}×`,
            }))}
          />
        </Panel>
        <Panel
          title="Most Winning"
          icon={<TrendingUp size={18} className="text-acid" />}
        >
          <RankedCharList
            rows={wins.map((w) => ({
              id: w.characterId,
              value: `${w.wins}W · ${pct(w.winRate)}`,
            }))}
          />
        </Panel>
      </div>

      {/* head to head matrix */}
      {playerList.length >= 2 && matrix.length > 0 && (
        <Panel
          title="Head-to-Head"
          icon={<Swords size={18} className="text-rose" />}
          right={
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              row wins vs column
            </span>
          }
        >
          <H2HMatrix players={playerList} matches={matches} />
        </Panel>
      )}

      {/* recent feed */}
      <Panel
        title="Recent Matches"
        icon={<BarChart3 size={18} className="text-gold" />}
      >
        <div className="grid gap-2">
          {recent.map((m) => (
            <RecentMatchRow key={m.id} match={m} players={players} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RankedCharList({
  rows,
}: {
  rows: { id: string; value: string }[];
}) {
  if (rows.length === 0)
    return <p className="text-sm text-zinc-500">Nothing yet.</p>;
  return (
    <div className="grid gap-1.5">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="flex items-center gap-3 border border-white/10 bg-black/30 px-3 py-1.5"
        >
          <span className="w-5 text-center font-display text-lg text-zinc-500">
            {i + 1}
          </span>
          <CharacterChip
            id={row.id}
            right={
              <span className="ml-auto shrink-0 font-display text-base text-gold">
                {row.value}
              </span>
            }
          />
        </div>
      ))}
    </div>
  );
}

function H2HMatrix({
  players,
  matches,
}: {
  players: Player[];
  matches: Match[];
}) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-ink p-2" />
            {sorted.map((p) => (
              <th
                key={p.id}
                className="min-w-[3rem] p-2 text-center align-bottom"
              >
                <span className="font-display text-xs uppercase text-zinc-400">
                  {p.name.slice(0, 6)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((rowP) => (
            <tr key={rowP.id}>
              <th className="sticky left-0 z-10 bg-ink p-2 text-left">
                <span className="font-display text-xs uppercase text-zinc-300">
                  {rowP.name.slice(0, 10)}
                </span>
              </th>
              {sorted.map((colP) => {
                if (rowP.id === colP.id)
                  return (
                    <td
                      key={colP.id}
                      className="border border-white/5 bg-white/[0.02] p-2 text-center text-zinc-700"
                    >
                      —
                    </td>
                  );
                const rec = h2hRecord(rowP.id, colP.id, matches);
                if (rec.total === 0)
                  return (
                    <td
                      key={colP.id}
                      className="border border-white/5 p-2 text-center text-zinc-700"
                    >
                      ·
                    </td>
                  );
                const dominant = rec.aWins > rec.bWins;
                return (
                  <td
                    key={colP.id}
                    className={cn(
                      "border border-white/5 p-2 text-center font-display",
                      dominant ? "text-acid" : rec.aWins < rec.bWins ? "text-rose" : "text-zinc-300",
                    )}
                    title={`${rowP.name} ${rec.aWins} – ${rec.bWins} ${colP.name}`}
                  >
                    {rec.aWins}-{rec.bWins}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentMatchRow({
  match,
  players,
}: {
  match: Match;
  players: Record<string, Player>;
}) {
  const trophyId = killLeader(match.kills)?.characterId;
  const p1Won = match.winnerId === match.p1Id;

  return (
    <div className="grid items-center gap-2 border border-white/10 bg-black/30 p-2.5 lg:grid-cols-[1fr_auto_1fr]">
      {/* p1 side */}
      <div className={cn("grid gap-1.5", !p1Won && "opacity-60")}>
        <div className="flex items-center gap-2">
          {p1Won && <Crown size={13} className="text-gold" />}
          <span
            className="truncate font-display text-base uppercase italic"
            style={{ color: CYAN }}
          >
            {playerName(players, match.p1Id)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {match.p1Team.map((id) => (
            <div key={id} className="min-w-0 max-w-[9rem] flex-1">
              <CharacterChip
                id={id}
                accent={CYAN}
                size="sm"
                trophy={trophyId === id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* center */}
      <div className="flex flex-col items-center justify-center px-2">
        <span className="font-display text-lg italic text-gold">VS</span>
        <span className="text-[10px] text-zinc-500">{timeAgo(match.date)}</span>
      </div>

      {/* p2 side */}
      <div className={cn("grid gap-1.5", p1Won && "opacity-60")}>
        <div className="flex items-center justify-end gap-2">
          <span
            className="truncate font-display text-base uppercase italic"
            style={{ color: PINK }}
          >
            {playerName(players, match.p2Id)}
          </span>
          {!p1Won && <Crown size={13} className="text-gold" />}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {match.p2Team.map((id) => (
            <div key={id} className="min-w-0 max-w-[9rem] flex-1">
              <CharacterChip
                id={id}
                accent={PINK}
                size="sm"
                trophy={trophyId === id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
