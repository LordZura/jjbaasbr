"use client";

import { CharacterChip } from "@/components/character";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ConfirmButton, EmptyHint, Panel, pct } from "@/components/ui";
import { useStore } from "@/lib/store";
import { bestCharacter, playerRecord } from "@/lib/stats";
import type { Match, Player } from "@/lib/types";
import { Crown, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

export function PlayersTab() {
  const players = useStore((s) => s.players);
  const matchesMap = useStore((s) => s.matches);
  const addPlayer = useStore((s) => s.addPlayer);
  const deletePlayer = useStore((s) => s.deletePlayer);

  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const matches = useMemo(() => Object.values(matchesMap), [matchesMap]);
  const list = useMemo(
    () =>
      Object.values(players).sort((a, b) => {
        const ra = playerRecord(a.id, matches);
        const rb = playerRecord(b.id, matches);
        return rb.matches - ra.matches || a.name.localeCompare(b.name);
      }),
    [players, matches],
  );

  const openPlayer = openId ? players[openId] : null;

  function submit() {
    const created = addPlayer(name);
    if (created) setName("");
  }

  return (
    <div className="grid gap-5">
      <Panel
        title="Add Fighter"
        icon={<UserPlus size={18} className="text-gold" />}
      >
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Player name"
            className="min-w-0 flex-1 border border-white/15 bg-black/50 px-3 py-3 text-base text-white outline-none focus:border-gold"
            maxLength={24}
          />
          <button
            onClick={submit}
            className="clip-slash flex items-center gap-2 bg-gold px-5 py-3 font-display text-lg uppercase text-abyss hover:scale-[1.02]"
          >
            <Plus size={18} /> Add
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Players are shared with everyone on the tracker.
        </p>
      </Panel>

      {list.length === 0 ? (
        <Panel>
          <EmptyHint icon={<Users size={28} />} title="No players yet">
            Add at least two fighters to start spinning matchups.
          </EmptyHint>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              matches={matches}
              onOpen={() => setOpenId(player.id)}
              onDelete={() => deletePlayer(player.id)}
            />
          ))}
        </div>
      )}

      {openPlayer && (
        <PlayerProfile player={openPlayer} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function PlayerCard({
  player,
  matches,
  onOpen,
  onDelete,
}: {
  player: Player;
  matches: Match[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const record = playerRecord(player.id, matches);
  const best = bestCharacter(player.id, matches);
  const winRateColor =
    record.winRate >= 0.6
      ? "#b6ff4f"
      : record.winRate >= 0.4
        ? "#ffd66b"
        : "#ff3f7c";

  return (
    <article className="group relative flex flex-col border border-white/10 bg-black/40 p-4 transition hover:border-gold/50">
      <button
        onClick={onOpen}
        className="flex items-center gap-3 text-left"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br from-cyan to-rose font-display text-lg text-abyss">
          {player.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl uppercase italic leading-none group-hover:text-gold">
            {player.name}
          </h3>
          <p className="text-xs text-zinc-500">
            {record.matches} match{record.matches !== 1 ? "es" : ""}
          </p>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="border border-white/10 bg-white/[0.03] py-1.5">
          <p className="text-[10px] font-black uppercase text-zinc-500">Win</p>
          <p className="font-display text-xl text-acid">{record.wins}</p>
        </div>
        <div className="border border-white/10 bg-white/[0.03] py-1.5">
          <p className="text-[10px] font-black uppercase text-zinc-500">Loss</p>
          <p className="font-display text-xl text-rose">{record.losses}</p>
        </div>
        <div className="border border-white/10 bg-white/[0.03] py-1.5">
          <p className="text-[10px] font-black uppercase text-zinc-500">Rate</p>
          <p className="font-display text-xl" style={{ color: winRateColor }}>
            {record.matches ? pct(record.winRate) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
        <Crown size={14} className="shrink-0 text-gold" />
        {best ? (
          <CharacterChip
            id={best.characterId}
            size="sm"
            right={
              <span className="ml-auto shrink-0 font-display text-sm text-gold">
                {pct(best.winRate)}
              </span>
            }
          />
        ) : (
          <span className="text-xs text-zinc-500">
            No signature yet (needs 2+ games on a character)
          </span>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <ConfirmButton
          onConfirm={onDelete}
          confirmLabel="Delete?"
          title="Delete player"
        >
          <Trash2 size={13} /> Delete
        </ConfirmButton>
      </div>
    </article>
  );
}
