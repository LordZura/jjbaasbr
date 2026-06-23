"use client";

import { MatchTab } from "@/components/MatchTab";
import { PlayersTab } from "@/components/PlayersTab";
import { StatsTab } from "@/components/StatsTab";
import { SyncBadge, Toasts } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BarChart3, Swords, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Tab = "match" | "players" | "stats";

export default function Home() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const playerCount = useStore((s) => Object.keys(s.players).length);
  const matchCount = useStore((s) => Object.keys(s.matches).length);
  const [tab, setTab] = useState<Tab>("match");

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <main className="relative min-h-screen pb-16">
      <Toasts />

      {/* manga halftone wash + faint diagonal action lines behind everything */}
      <div className="halftone pointer-events-none fixed inset-0 z-0 opacity-[0.05]" />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          background:
            "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 22px)",
        }}
      />

      {/* corner sync indicator */}
      <div className="fixed right-3 top-3 z-50">
        <SyncBadge />
      </div>

      <header className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="clip-gash inline-flex w-fit bg-gold px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-abyss">
              All-Star Battle R
            </p>
            <span className="menacing animate-gogo font-display text-lg leading-none sm:text-2xl">
              ゴゴゴ
            </span>
          </div>
          <h1 className="animate-title-glow text-manga font-display text-5xl uppercase italic leading-[0.85] sm:text-7xl lg:text-8xl">
            Match Randomizer
          </h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Spin 3-on-3 teams · track every clash ·{" "}
            <span className="text-cyan">{playerCount}</span> fighters ·{" "}
            <span className="text-rose">{matchCount}</span> matches logged
          </p>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
          <TabButton
            active={tab === "match"}
            icon={<Swords size={18} />}
            label="Match"
            onClick={() => setTab("match")}
          />
          <TabButton
            active={tab === "players"}
            icon={<Users size={18} />}
            label="Players"
            onClick={() => setTab("players")}
          />
          <TabButton
            active={tab === "stats"}
            icon={<BarChart3 size={18} />}
            label="Stats"
            onClick={() => setTab("stats")}
          />
        </nav>
      </header>

      <section className="relative z-10 mx-auto mt-5 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {!ready ? (
          <div className="grid place-items-center py-24 text-zinc-500">
            <p className="animate-pulse font-display text-2xl uppercase tracking-[0.3em]">
              Loading shared data…
            </p>
          </div>
        ) : (
          <>
            {tab === "match" && <MatchTab />}
            {tab === "players" && <PlayersTab />}
            {tab === "stats" && <StatsTab />}
          </>
        )}
      </section>
    </main>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "clip-gash relative flex shrink-0 items-center gap-2 overflow-hidden border-2 px-5 py-2.5 font-display text-base uppercase italic tracking-wide transition-transform hover:scale-[1.05]",
        active
          ? "border-gold bg-gold text-abyss shadow-[0_0_22px_rgba(255,214,107,0.55)]"
          : "border-white/10 bg-black/40 text-zinc-300 hover:border-cyan hover:text-white",
      )}
    >
      {active && (
        <span className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/30 [animation:sheen_2.4s_ease-in-out_infinite]" />
      )}
      {icon}
      {label}
    </button>
  );
}
