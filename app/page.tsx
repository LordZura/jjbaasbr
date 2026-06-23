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

      {/* corner sync indicator */}
      <div className="fixed right-3 top-3 z-50">
        <SyncBadge />
      </div>

      <header className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <p className="clip-slash inline-flex w-fit bg-gold px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-abyss">
            All-Star Battle R
          </p>
          <h1 className="text-outline font-display text-4xl uppercase italic leading-none sm:text-6xl lg:text-7xl">
            Match Randomizer
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Spin 3-on-3 teams · track every clash · {playerCount} fighters ·{" "}
            {matchCount} matches logged
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

      <section className="mx-auto mt-5 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
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
        "clip-slash flex shrink-0 items-center gap-2 border px-5 py-2.5 font-display text-base uppercase tracking-wide transition",
        active
          ? "border-gold bg-gold text-abyss"
          : "border-white/10 bg-black/40 text-zinc-300 hover:border-cyan hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
