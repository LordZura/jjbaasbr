"use client";

import { CharacterChip } from "@/components/character";
import { cn } from "@/lib/utils";
import { Minus, Plus, Skull } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

export function KillsEditor({
  p1Team,
  p2Team,
  p1Accent,
  p2Accent,
  kills,
  setKills,
  leaderId,
}: {
  p1Team: string[];
  p2Team: string[];
  p1Accent: string;
  p2Accent: string;
  kills: Record<string, number>;
  setKills: Dispatch<SetStateAction<Record<string, number>>>;
  leaderId?: string;
}) {
  const bump = (id: string, delta: number) =>
    setKills((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });

  const renderRow = (id: string, accent: string) => {
    const value = kills[id] ?? 0;
    const isLeader = leaderId === id && value > 0;
    return (
      <div
        key={id}
        className="flex items-center gap-2 border border-white/10 bg-black/40 px-2.5 py-2"
        style={isLeader ? { borderColor: "#ffd66b" } : undefined}
      >
        <CharacterChip id={id} accent={accent} size="sm" />
        {isLeader && <Skull size={14} className="shrink-0 text-gold" />}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => bump(id, -1)}
            className="grid h-7 w-7 place-items-center border border-white/15 bg-white/5 text-zinc-300 hover:border-rose hover:text-rose"
          >
            <Minus size={14} />
          </button>
          <span
            className={cn(
              "w-7 text-center font-display text-xl",
              value > 0 ? "text-white" : "text-zinc-600",
            )}
          >
            {value}
          </span>
          <button
            onClick={() => bump(id, 1)}
            className="grid h-7 w-7 place-items-center border border-white/15 bg-white/5 text-zinc-300 hover:border-acid hover:text-acid"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        <Skull size={13} className="text-gold" /> Kills per character — the
        skull marks the current trophy leader
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          {p1Team.map((id) => renderRow(id, p1Accent))}
        </div>
        <div className="grid gap-2">
          {p2Team.map((id) => renderRow(id, p2Accent))}
        </div>
      </div>
    </div>
  );
}
