"use client";

import { collectionStats, getFateState } from "@/lib/fate";
import { getActivePlayer, getActiveRoster, isSupabaseConfigured, useAppStore } from "@/lib/store";
import type { Character, MiniAccount, PlayerProfile, SortMode, Tier } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { tierColors, tierRank, initials } from "@/lib/roster";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  Crown,
  Database,
  Gauge,
  History,
  LogOut,
  Medal,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "spin" | "collection" | "stats" | "roster" | "admin";

const tierOrder: Tier[] = ["Overpowered", "Very Strong", "Strong", "Normal", "Bad", "Very Bad"];

export default function Home() {
  const store = useAppStore();
  const account = store.accounts.find((item) => item.id === store.activeAccountId);
  const player = getActivePlayer(account);
  const roster = getActiveRoster(account);
  const [tab, setTab] = useState<Tab>("spin");
  const [sort, setSort] = useState<SortMode>("name");
  const [isSpinning, setIsSpinning] = useState(false);
  const [preview, setPreview] = useState<Character | undefined>(roster[0]);

  useEffect(() => {
    if (!preview && roster.length) setPreview(roster[0]);
  }, [preview, roster]);

  const sortedRoster = useMemo(() => sortCharacters(roster, player, sort), [roster, player, sort]);
  const fate = getFateState(player);
  const result = store.lastResult ?? preview;

  function playTone(kind: "click" | "spin" | "reveal") {
    if (!account?.settings.soundEnabled || typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = kind === "reveal" ? "sawtooth" : "square";
    osc.frequency.value = kind === "spin" ? 180 : kind === "reveal" ? 92 : 420;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "reveal" ? 0.12 : 0.04, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "reveal" ? 0.42 : 0.12));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  function handleSpin() {
    if (!account || !player || isSpinning || roster.length === 0) return;
    playTone("spin");
    setIsSpinning(true);
    let ticks = 0;
    const maxTicks = 26 + Math.floor(account.settings.revealIntensity * 10);
    const interval = window.setInterval(() => {
      ticks += 1;
      setPreview(roster[Math.floor(Math.random() * roster.length)]);
      if (ticks >= maxTicks) {
        window.clearInterval(interval);
        const selected = store.spin();
        setPreview(selected);
        playTone("reveal");
        setIsSpinning(false);
      }
    }, 48);
  }

  if (!account) {
    return <AccountGate />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-10">
      <div className="absolute inset-0 -z-10 bg-[url('/assets/fate-burst.png')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(255,214,107,0.14),transparent_30rem),linear-gradient(120deg,rgba(9,10,18,0.74),rgba(9,10,18,0.92))]" />
      <ParticleField />

      <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="clip-slash mb-2 inline-flex bg-gold px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-abyss">
              All-Star Battle R
            </p>
            <h1 className="font-display text-4xl uppercase leading-none text-outline sm:text-6xl lg:text-7xl">
              Fate Wheel
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[30rem]">
            <AccountPanel account={account} />
            <PlayerPanel account={account} />
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          <TabButton active={tab === "spin"} icon={<Shuffle size={18} />} label="Spin" onClick={() => setTab("spin")} />
          <TabButton active={tab === "collection"} icon={<Trophy size={18} />} label="Collection" onClick={() => setTab("collection")} />
          <TabButton active={tab === "stats"} icon={<BarChart3 size={18} />} label="Stats" onClick={() => setTab("stats")} />
          <TabButton active={tab === "roster"} icon={<Users size={18} />} label="Roster" onClick={() => setTab("roster")} />
          <TabButton active={tab === "admin"} icon={<Settings size={18} />} label="Admin" onClick={() => setTab("admin")} />
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8">
        <AnimatePresence mode="wait">
          {tab === "spin" && (
            <motion.div
              key="spin"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="grid gap-5"
            >
              <RevealStage
                character={result}
                fateTone={fate.tone}
                isSpinning={isSpinning}
                intensity={account.settings.revealIntensity}
              />
              <SpinControls
                isSpinning={isSpinning}
                fate={fate}
                player={player}
                soundEnabled={account.settings.soundEnabled}
                onSpin={handleSpin}
                onMute={() => store.updateSettings({ soundEnabled: !account.settings.soundEnabled })}
              />
            </motion.div>
          )}

          {tab === "collection" && (
            <motion.div key="collection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CollectionView roster={sortedRoster} player={player} />
            </motion.div>
          )}

          {tab === "stats" && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StatsView account={account} roster={roster} player={player} />
            </motion.div>
          )}

          {tab === "roster" && (
            <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RosterView roster={sortedRoster} player={player} sort={sort} setSort={setSort} />
            </motion.div>
          )}

          {tab === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AdminView account={account} roster={roster} />
            </motion.div>
          )}
        </AnimatePresence>

        <aside className="grid content-start gap-5">
          <FateConsole account={account} player={player} roster={roster} />
          <RecentPulls player={player} />
        </aside>
      </section>
    </main>
  );
}

function AccountGate() {
  const store = useAppStore();
  const [mode, setMode] = useState<"create" | "login">("create");
  const [accountName, setAccountName] = useState("Fate Account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "login") {
      await store.signInWithSupabase(email, password);
      return;
    }
    if (isSupabaseConfigured && email && password) {
      await store.createSupabaseAccount(accountName, email, password);
      return;
    }
    store.createLocalAccount(accountName, email || undefined);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[url('/assets/fate-burst.png')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(255,214,107,0.15),transparent_30rem),rgba(9,10,18,0.86)]" />
      <ParticleField />
      <section className="noise-mask w-full max-w-5xl border border-white/15 bg-ink/88 p-5 shadow-impact backdrop-blur md:grid md:grid-cols-[1fr_25rem] md:p-8">
        <div className="relative z-10 flex min-h-[30rem] flex-col justify-between gap-8 pr-0 md:pr-8">
          <div>
            <p className="clip-slash mb-4 inline-flex bg-cyan px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-abyss">
              Public companion build
            </p>
            <h1 className="font-display text-5xl uppercase leading-none text-outline sm:text-7xl">
              JJBA ASBR Fate Wheel
            </h1>
          </div>
          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <ImpactStat label="Roster JSON" value="Editable" />
            <ImpactStat label="Fate Balance" value="Hidden" />
            <ImpactStat label="Cloud Sync" value={isSupabaseConfigured ? "Ready" : "Local"} />
          </div>
        </div>

        <form onSubmit={submit} className="relative z-10 mt-6 grid content-start gap-4 border-l-0 border-white/10 md:mt-0 md:border-l md:pl-6">
          <div className="flex rounded-sm border border-white/10 bg-black/30 p-1">
            <button
              className={cn("flex-1 px-3 py-2 text-sm font-black uppercase", mode === "create" && "bg-gold text-abyss")}
              type="button"
              onClick={() => setMode("create")}
            >
              Create
            </button>
            <button
              className={cn("flex-1 px-3 py-2 text-sm font-black uppercase", mode === "login" && "bg-cyan text-abyss")}
              type="button"
              onClick={() => setMode("login")}
            >
              Login
            </button>
          </div>

          {mode === "create" && (
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Account Name
              <input className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-gold" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
            </label>
          )}
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Email
            <input className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-cyan" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={isSupabaseConfigured ? "you@example.com" : "optional in local mode"} />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Password
            <input className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-rose" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSupabaseConfigured ? "Supabase auth" : "needed for cloud mode"} />
          </label>

          <button className="clip-slash flex items-center justify-center gap-2 bg-rose px-5 py-4 font-display text-xl uppercase text-white shadow-impact" type="submit">
            <Swords size={22} />
            Enter
          </button>

          <button className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase text-zinc-200" type="button" onClick={store.resetDemo}>
            <Sparkles size={16} />
            Demo Account
          </button>

          {store.cloudMessage && <p className="text-sm text-zinc-300">{store.cloudMessage}</p>}
        </form>
      </section>
    </main>
  );
}

function AccountPanel({ account }: { account: MiniAccount }) {
  const store = useAppStore();
  return (
    <div className="border border-white/10 bg-black/35 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Account</p>
          <p className="truncate font-black text-white">{account.name}</p>
        </div>
        <button className="grid h-10 w-10 place-items-center border border-white/10 bg-white/5 text-zinc-200 hover:border-rose hover:text-rose" title="Sign out" onClick={() => void store.signOut()}>
          <LogOut size={18} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <Database size={13} />
          {store.authMode === "supabase" ? "Supabase" : "Local"}
        </span>
        <span>{store.cloudStatus === "synced" ? "Synced" : store.cloudStatus}</span>
      </div>
    </div>
  );
}

function PlayerPanel({ account }: { account: MiniAccount }) {
  const store = useAppStore();
  const [name, setName] = useState("");
  return (
    <div className="border border-white/10 bg-black/35 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <select
          className="min-w-0 flex-1 border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none"
          value={account.activePlayerId}
          onChange={(event) => store.setActivePlayer(event.target.value)}
        >
          {account.players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none -ml-8 text-zinc-500" size={16} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          store.createPlayer(name);
          setName("");
        }}
      >
        <input className="min-w-0 flex-1 border border-white/10 bg-black/45 px-3 py-2 text-sm outline-none focus:border-gold" value={name} onChange={(event) => setName(event.target.value)} placeholder="New player" />
        <button className="grid h-10 w-10 place-items-center bg-gold text-abyss" title="Create player">
          <Plus size={18} />
        </button>
      </form>
    </div>
  );
}

function RevealStage({
  character,
  fateTone,
  isSpinning,
  intensity
}: {
  character?: Character;
  fateTone: string;
  isSpinning: boolean;
  intensity: number;
}) {
  const tier = character?.tier ?? "Normal";
  const shake = isSpinning ? 0 : tier === "Overpowered" ? 8 * intensity : tier === "Very Strong" ? 4 * intensity : 0;

  return (
    <motion.div
      animate={{ x: shake ? [0, -shake, shake, -shake / 2, 0] : 0 }}
      transition={{ duration: 0.28 }}
      className="relative min-h-[32rem] overflow-hidden border border-white/15 bg-ink/82 shadow-impact"
    >
      <div className="absolute inset-0 bg-[url('/assets/fate-burst.png')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,214,107,0.12),transparent_18rem),linear-gradient(90deg,rgba(9,10,18,0.55),rgba(9,10,18,0.9))]" />
      <div className="absolute inset-0 bg-scanlines bg-[length:100%_4px] opacity-40" />

      <div className="relative grid min-h-[32rem] content-between gap-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-zinc-400">Character Select</p>
            <h2 className="font-display text-4xl uppercase leading-none text-white text-outline sm:text-6xl">
              {isSpinning ? "Rolling Fate" : character?.name ?? "Awaiting Spin"}
            </h2>
          </div>
          <div className={cn("clip-slash bg-gradient-to-r px-5 py-2 text-sm font-black uppercase shadow-neon", tierColors[tier])}>
            {tier}
          </div>
        </div>

        <div className="grid items-end gap-5 lg:grid-cols-[18rem_1fr]">
          <motion.div
            key={character?.id}
            initial={{ opacity: 0, scale: 0.88, rotate: -2 }}
            animate={{ opacity: 1, scale: isSpinning ? 0.98 : 1, rotate: isSpinning ? [1, -1, 1] : 0 }}
            transition={{ duration: isSpinning ? 0.08 : 0.35 }}
            className="relative aspect-[4/5] max-w-[18rem] overflow-hidden border border-white/15 bg-black/40 p-4 shadow-neon"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", tierColors[tier])} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.55),transparent_8rem),linear-gradient(145deg,transparent_52%,rgba(0,0,0,0.45)_52%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <p className="font-display text-8xl leading-none text-black/35">{initials(character?.name ?? "??")}</p>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-black/55">{character?.part ?? "Part ?"}</p>
                <p className="font-display text-3xl uppercase leading-none text-abyss">{character?.name ?? "Spin"}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ImpactStat label="Base Weight" value={character ? String(character.weight) : "-"} />
              <ImpactStat label="Part" value={character?.part ?? "-"} />
              <ImpactStat label="Fate Signal" value={<span className={fateTone}>Active</span>} />
            </div>
            <p className="max-w-2xl border-l-4 border-gold bg-black/35 px-4 py-3 text-sm leading-6 text-zinc-200">
              {character?.notes ?? "Choose a player, slam the wheel, and let the saved history push fate around the edges."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SpinControls({
  isSpinning,
  fate,
  player,
  soundEnabled,
  onSpin,
  onMute
}: {
  isSpinning: boolean;
  fate: ReturnType<typeof getFateState>;
  player?: PlayerProfile;
  soundEnabled: boolean;
  onSpin: () => void;
  onMute: () => void;
}) {
  return (
    <div className="grid gap-3 border border-white/10 bg-black/45 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.26em] text-zinc-500">Current Fate</p>
        <p className={cn("font-display text-3xl uppercase", fate.tone)}>{fate.label}</p>
        <p className="text-sm text-zinc-400">{fate.fortune} · {player?.spins ?? 0} spins</p>
      </div>
      <button
        onClick={onMute}
        className="grid h-14 w-14 place-items-center border border-white/10 bg-white/5 text-zinc-100 hover:border-cyan"
        title={soundEnabled ? "Mute" : "Unmute"}
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </button>
      <button
        onClick={onSpin}
        disabled={isSpinning}
        className="clip-slash flex min-h-14 items-center justify-center gap-3 bg-rose px-8 font-display text-2xl uppercase text-white shadow-impact transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
      >
        {isSpinning ? <RefreshCw className="animate-spin" /> : <Shuffle />}
        {isSpinning ? "Spinning" : "Spin"}
      </button>
    </div>
  );
}

function FateConsole({ account, player, roster }: { account: MiniAccount; player?: PlayerProfile; roster: Character[] }) {
  const stats = collectionStats(roster, player);
  return (
    <section className="border border-white/10 bg-ink/80 p-4 shadow-neon">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase">Fate Console</h2>
        <Shield className="text-gold" />
      </div>
      <div className="grid gap-3">
        <ProgressRow label="Collection" value={stats.completion} suffix={`${stats.collected.length}/${roster.length}`} />
        <ProgressRow label="Pity" value={((player?.pity ?? 0) / 18) * 100} suffix="Hidden" />
        <ProgressRow label="Luck Drift" value={Math.max(0, ((player?.luck ?? 0) + 18) / 42 * 100)} suffix="Fate" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <ImpactStat label="Players" value={account.players.length} />
        <ImpactStat label="Roster" value={roster.length} />
      </div>
    </section>
  );
}

function RecentPulls({ player }: { player?: PlayerProfile }) {
  const recent = player?.history.slice(-8).reverse() ?? [];
  return (
    <section className="border border-white/10 bg-black/45 p-4">
      <div className="mb-4 flex items-center gap-2">
        <History size={18} className="text-cyan" />
        <h2 className="font-display text-xl uppercase">Recent Pulls</h2>
      </div>
      <div className="grid gap-2">
        {recent.length ? recent.map((pull) => (
          <div key={`${pull.timestamp}-${pull.characterId}`} className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
            <span className="truncate font-bold">{pull.characterName}</span>
            <span className="text-xs text-zinc-500">{timeAgo(pull.timestamp)}</span>
          </div>
        )) : <p className="text-sm text-zinc-500">No pulls yet.</p>}
      </div>
    </section>
  );
}

function CollectionView({ roster, player }: { roster: Character[]; player?: PlayerProfile }) {
  const stats = collectionStats(roster, player);
  return (
    <section className="grid gap-5">
      <div className="border border-white/10 bg-ink/80 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-zinc-500">Collection</p>
            <h2 className="font-display text-4xl uppercase">{stats.collected.length} / {roster.length}</h2>
          </div>
          <p className="font-display text-4xl text-gold">{stats.completion.toFixed(1)}%</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden bg-black/60">
          <div className="h-full bg-gradient-to-r from-rose via-gold to-cyan" style={{ width: `${stats.completion}%` }} />
        </div>
      </div>
      <CharacterGrid roster={roster} player={player} />
    </section>
  );
}

function StatsView({ account, roster, player }: { account: MiniAccount; roster: Character[]; player?: PlayerProfile }) {
  const topCharacter = roster
    .map((character) => ({ character, count: player?.perCharacterCounts[character.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)[0];
  const leastCharacter = roster
    .map((character) => ({ character, count: player?.perCharacterCounts[character.id] ?? 0 }))
    .sort((a, b) => a.count - b.count || a.character.name.localeCompare(b.character.name))[0];
  const stats = collectionStats(roster, player);
  const comparison = account.players
    .map((item) => {
      const collected = roster.filter((character) => (item.perCharacterCounts[character.id] ?? 0) > 0).length;
      return {
        player: item,
        collected,
        completion: roster.length ? collected / roster.length : 0,
        op: item.tierCounts.Overpowered ?? 0,
        fate: item.luck + item.pity
      };
    })
    .sort((a, b) => b.completion - a.completion);

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ImpactStat label="Total Spins" value={player?.spins ?? 0} icon={<Gauge size={18} />} />
        <ImpactStat label="OP Pulls" value={player?.tierCounts.Overpowered ?? 0} icon={<Crown size={18} />} />
        <ImpactStat label="Unique" value={stats.collected.length} icon={<Medal size={18} />} />
        <ImpactStat label="Last Active" value={timeAgo(player?.lastActiveAt)} icon={<User size={18} />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-white/10 bg-black/45 p-5">
          <h2 className="mb-4 font-display text-2xl uppercase">Tier Pulls</h2>
          <div className="grid gap-2">
            {tierOrder.map((tier) => (
              <ProgressRow key={tier} label={tier} value={Math.min(100, ((player?.tierCounts[tier] ?? 0) / Math.max(1, player?.spins ?? 1)) * 100)} suffix={String(player?.tierCounts[tier] ?? 0)} />
            ))}
          </div>
        </section>
        <section className="border border-white/10 bg-black/45 p-5">
          <h2 className="mb-4 font-display text-2xl uppercase">Player Compare</h2>
          <div className="grid gap-2">
            {comparison.map((item) => (
              <div key={item.player.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="font-bold">{item.player.name}</span>
                <span className="text-gold">{Math.round(item.completion * 100)}%</span>
                <span className="text-cyan">{item.op} OP</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImpactStat label="Most Received" value={topCharacter?.count ? `${topCharacter.character.name} (${topCharacter.count})` : "-"} />
        <ImpactStat label="Least Received" value={leastCharacter ? `${leastCharacter.character.name} (${leastCharacter.count})` : "-"} />
      </div>
    </section>
  );
}

function RosterView({
  roster,
  player,
  sort,
  setSort
}: {
  roster: Character[];
  player?: PlayerProfile;
  sort: SortMode;
  setSort: (sort: SortMode) => void;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/45 p-4">
        <h2 className="font-display text-3xl uppercase">Roster</h2>
        <select className="border border-white/10 bg-black/60 px-3 py-2 text-sm font-bold text-white" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
          <option value="name">Name</option>
          <option value="part">Part</option>
          <option value="tier">Tier</option>
          <option value="weight">Weight</option>
          <option value="recent">Recently Received</option>
          <option value="least">Least Received</option>
        </select>
      </div>
      <CharacterGrid roster={roster} player={player} />
    </section>
  );
}

function AdminView({ account, roster }: { account: MiniAccount; roster: Character[] }) {
  const store = useAppStore();
  const [json, setJson] = useState(() => JSON.stringify(roster, null, 2));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setJson(JSON.stringify(roster, null, 2));
  }, [roster]);

  function saveRoster() {
    try {
      store.updateRosterJson(json);
      setMessage("Roster saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="border border-white/10 bg-black/55 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl uppercase">Character JSON</h2>
            <button onClick={saveRoster} className="clip-slash flex items-center gap-2 bg-gold px-5 py-2 font-black uppercase text-abyss">
              <Save size={16} />
              Save
            </button>
          </div>
          <textarea
            className="h-[34rem] w-full resize-y border border-white/10 bg-abyss/90 p-3 font-mono text-xs leading-5 text-zinc-100 outline-none focus:border-cyan"
            spellCheck={false}
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
          {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}
        </div>
        <div className="grid content-start gap-4">
          <SettingSlider label="Duplicate Reduction" value={account.settings.duplicateReduction} min={0} max={0.18} step={0.01} onChange={(value) => store.updateSettings({ duplicateReduction: value })} />
          <SettingSlider label="Repeat Decay" value={account.settings.repeatDecay} min={0.55} max={1} step={0.01} onChange={(value) => store.updateSettings({ repeatDecay: value })} />
          <SettingSlider label="Pity Strength" value={account.settings.pityStrength} min={0} max={0.05} step={0.002} onChange={(value) => store.updateSettings({ pityStrength: value })} />
          <SettingSlider label="Reveal Intensity" value={account.settings.revealIntensity} min={0.4} max={1.8} step={0.1} onChange={(value) => store.updateSettings({ revealIntensity: value })} />
          <SettingSlider label="Recent Window" value={account.settings.recentWindow} min={4} max={16} step={1} onChange={(value) => store.updateSettings({ recentWindow: value })} />
        </div>
      </div>
    </section>
  );
}

function CharacterGrid({ roster, player }: { roster: Character[]; player?: PlayerProfile }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {roster.map((character) => {
        const count = player?.perCharacterCounts[character.id] ?? 0;
        return (
          <article key={character.id} className={cn("relative min-h-44 overflow-hidden border bg-black/50 p-3", count ? "border-gold/55" : "border-white/10 opacity-85")}>
            <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tierColors[character.tier])} />
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className={cn("grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br font-display text-xl text-abyss", tierColors[character.tier])}>
                  {initials(character.name)}
                </div>
                <span className="text-right text-xs font-black uppercase text-zinc-500">W{character.weight}</span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{character.part}</p>
                <h3 className="font-display text-xl uppercase leading-none text-white">{character.name}</h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{character.notes}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("bg-gradient-to-r bg-clip-text font-black uppercase text-transparent", tierColors[character.tier])}>{character.tier}</span>
                <span className="text-zinc-400">{count ? `${count}x` : "Missing"}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 border border-white/10 bg-black/45 p-4">
      <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
        <span className="text-gold">{Number(value).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "clip-slash flex shrink-0 items-center gap-2 border border-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition",
        active ? "bg-gold text-abyss shadow-neon" : "bg-black/40 text-zinc-300 hover:border-cyan hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ImpactStat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="truncate font-display text-2xl uppercase text-white">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
        <span>{label}</span>
        <span>{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden bg-black/65">
        <div className="h-full bg-gradient-to-r from-rose via-gold to-cyan" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1 w-10 bg-gold/30"
          style={{ left: `${(index * 37) % 100}%`, top: `${(index * 19) % 100}%` }}
          animate={{ x: [0, 90, -20], opacity: [0.08, 0.42, 0.08] }}
          transition={{ duration: 5 + (index % 6), repeat: Infinity, delay: index * 0.12 }}
        />
      ))}
    </div>
  );
}

function sortCharacters(roster: Character[], player: PlayerProfile | undefined, sort: SortMode) {
  const recentIndex = new Map<string, number>();
  player?.history.forEach((entry, index) => recentIndex.set(entry.characterId, index));

  return [...roster].sort((a, b) => {
    if (sort === "part") return a.part.localeCompare(b.part) || a.name.localeCompare(b.name);
    if (sort === "tier") return tierRank[b.tier] - tierRank[a.tier] || a.name.localeCompare(b.name);
    if (sort === "weight") return a.weight - b.weight || a.name.localeCompare(b.name);
    if (sort === "recent") return (recentIndex.get(b.id) ?? -1) - (recentIndex.get(a.id) ?? -1) || a.name.localeCompare(b.name);
    if (sort === "least") return (player?.perCharacterCounts[a.id] ?? 0) - (player?.perCharacterCounts[b.id] ?? 0) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
