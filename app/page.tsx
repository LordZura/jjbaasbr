"use client";

import { collectionStats, getFateState } from "@/lib/fate";
import {
  getActivePlayer,
  getActiveRoster,
  isSupabaseConfigured,
  useAppStore,
} from "@/lib/store";
import type {
  Character,
  MiniAccount,
  PlayerProfile,
  SortMode,
  Tier,
} from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { tierColors, tierRank, initials } from "@/lib/roster";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Check,
  Copy,
  Crown,
  Database,
  Edit2,
  Gauge,
  History,
  LogOut,
  Medal,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "spin" | "collection" | "stats" | "roster" | "admin";

const tierOrder: Tier[] = [
  "Overpowered",
  "Very Strong",
  "Strong",
  "Normal",
  "Bad",
  "Very Bad",
];

export default function Home() {
  const store = useAppStore();
  const account = store.accounts.find(
    (item) => item.id === store.activeAccountId,
  );
  const player = getActivePlayer(account);
  const roster = getActiveRoster(account);
  const [tab, setTab] = useState<Tab>("spin");
  const [sort, setSort] = useState<SortMode>("name");
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinNonce, setSpinNonce] = useState(0);
  const [preview, setPreview] = useState<Character | undefined>(roster[0]);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(
    null,
  );

  useEffect(() => {
    if (!preview && roster.length) setPreview(roster[0]);
  }, [preview, roster]);

  const sortedRoster = useMemo(
    () => sortCharacters(roster, player, sort),
    [roster, player, sort],
  );
  const fate = getFateState(player);
  const result = store.lastResult ?? preview;

  function playTone(kind: "click" | "spin" | "reveal") {
    if (!account?.settings.soundEnabled || typeof window === "undefined")
      return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = kind === "reveal" ? "sawtooth" : "square";
    osc.frequency.value = kind === "spin" ? 180 : kind === "reveal" ? 92 : 420;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      kind === "reveal" ? 0.12 : 0.04,
      now + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (kind === "reveal" ? 0.42 : 0.12),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  function handleSpin() {
    if (!account || !player || isSpinning || roster.length === 0) return;
    setSpinNonce((n) => n + 1);
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

      {editingPlayer && (
        <PlayerEditModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={(updates) => {
            store.updatePlayer(editingPlayer.id, updates);
            setEditingPlayer(null);
          }}
          onDelete={() => {
            store.deletePlayer(editingPlayer.id);
            setEditingPlayer(null);
          }}
          onDuplicate={() => {
            store.duplicatePlayer(editingPlayer.id);
            setEditingPlayer(null);
          }}
          onReset={() => {
            store.resetPlayerStats(editingPlayer.id);
            setEditingPlayer(null);
          }}
        />
      )}

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
            <PlayerPanel account={account} onEditPlayer={setEditingPlayer} />
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          <TabButton
            active={tab === "spin"}
            icon={<Shuffle size={18} />}
            label="Spin"
            onClick={() => setTab("spin")}
          />
          <TabButton
            active={tab === "collection"}
            icon={<Trophy size={18} />}
            label="Collection"
            onClick={() => setTab("collection")}
          />
          <TabButton
            active={tab === "stats"}
            icon={<BarChart3 size={18} />}
            label="Stats"
            onClick={() => setTab("stats")}
          />
          <TabButton
            active={tab === "roster"}
            icon={<Users size={18} />}
            label="Roster"
            onClick={() => setTab("roster")}
          />
          <TabButton
            active={tab === "admin"}
            icon={<Settings size={18} />}
            label="Admin"
            onClick={() => setTab("admin")}
          />
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
              {/* spinKey forces full remount → animation replays every time */}
              <RevealStage
                key={spinNonce}
                spinNonce={spinNonce}
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
                onMute={() =>
                  store.updateSettings({
                    soundEnabled: !account.settings.soundEnabled,
                  })
                }
              />
            </motion.div>
          )}

          {tab === "collection" && (
            <motion.div
              key="collection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CollectionView roster={sortedRoster} player={player} />
            </motion.div>
          )}

          {tab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StatsView account={account} roster={roster} player={player} />
            </motion.div>
          )}

          {tab === "roster" && (
            <motion.div
              key="roster"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RosterView
                roster={sortedRoster}
                player={player}
                sort={sort}
                setSort={setSort}
              />
            </motion.div>
          )}

          {tab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
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

// ─── Account Gate ──────────────────────────────────────────────────────────────

function AccountGate() {
  const store = useAppStore();
  const [mode, setMode] = useState<"pick" | "create" | "login">("pick");
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Supabase email/pass fields
  const [email, setEmail] = useState("");

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!accountName.trim()) {
      setError("Enter an account name.");
      return;
    }
    if (isSupabaseConfigured && email) {
      void store.createSupabaseAccount(accountName, email, password);
      return;
    }
    store.createLocalAccount(accountName, password || undefined);
  }

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (isSupabaseConfigured && email) {
      void store.signInWithSupabase(email, password);
      return;
    }
    const ok = store.signInLocal(accountName, password || undefined);
    if (!ok) setError("Account not found or wrong password.");
  }

  const existingAccounts = store.accounts;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[url('/assets/fate-burst.png')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(255,214,107,0.15),transparent_30rem),rgba(9,10,18,0.86)]" />
      <ParticleField />
      <section className="noise-mask w-full max-w-4xl border border-white/15 bg-ink/88 p-5 shadow-impact backdrop-blur">
        <div className="mb-6">
          <p className="clip-slash mb-3 inline-flex bg-cyan px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-abyss">
            Public companion build
          </p>
          <h1 className="font-display text-4xl uppercase leading-none text-outline sm:text-6xl">
            JJBA ASBR Fate Wheel
          </h1>
        </div>

        {/* Existing accounts quick-pick */}
        {existingAccounts.length > 0 && mode === "pick" && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              Your Accounts
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {existingAccounts.map((acc) => (
                <button
                  key={acc.id}
                  className="flex items-center gap-3 border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-gold hover:bg-gold/5"
                  onClick={() => {
                    if (acc.password) {
                      setAccountName(acc.name);
                      setMode("login");
                    } else {
                      store.signInLocal(acc.name);
                    }
                  }}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center bg-gradient-to-br from-rose to-gold font-display text-lg text-abyss">
                    {acc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{acc.name}</p>
                    <p className="text-xs text-zinc-500">
                      {acc.players.length} player
                      {acc.players.length !== 1 ? "s" : ""} ·{" "}
                      {acc.password ? "🔒 password" : "open"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold uppercase text-zinc-200 hover:border-cyan"
                onClick={() => setMode("create")}
              >
                + New Account
              </button>
              <button
                className="flex-1 border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold uppercase text-zinc-200 hover:border-cyan"
                onClick={() => setMode("login")}
              >
                Log In
              </button>
            </div>
          </div>
        )}

        {(mode !== "pick" || existingAccounts.length === 0) && (
          <form
            onSubmit={mode === "login" ? handleLogin : handleCreate}
            className="grid gap-4 max-w-sm"
          >
            <div className="flex rounded-sm border border-white/10 bg-black/30 p-1">
              <button
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-black uppercase",
                  mode === "create" && "bg-gold text-abyss",
                )}
                type="button"
                onClick={() => {
                  setMode("create");
                  setError("");
                }}
              >
                Create
              </button>
              <button
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-black uppercase",
                  mode === "login" && "bg-cyan text-abyss",
                )}
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Log In
              </button>
            </div>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Account Name
              <input
                className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-gold"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Password{" "}
              <span className="normal-case font-normal text-zinc-600">
                (optional)
              </span>
              <input
                className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-rose"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for no password"
              />
            </label>

            {isSupabaseConfigured && (
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                Email{" "}
                <span className="normal-case font-normal text-zinc-600">
                  (for cloud sync)
                </span>
                <input
                  className="border border-white/10 bg-black/45 px-3 py-3 text-base text-white outline-none focus:border-cyan"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            )}

            {error && <p className="text-sm text-rose">{error}</p>}
            {store.cloudMessage && (
              <p className="text-sm text-zinc-300">{store.cloudMessage}</p>
            )}

            <button
              className="clip-slash flex items-center justify-center gap-2 bg-rose px-5 py-4 font-display text-xl uppercase text-white shadow-impact"
              type="submit"
            >
              <Swords size={22} />
              {mode === "login" ? "Log In" : "Create Account"}
            </button>

            {existingAccounts.length > 0 && (
              <button
                type="button"
                className="text-sm text-zinc-500 hover:text-zinc-300"
                onClick={() => setMode("pick")}
              >
                ← Back to accounts
              </button>
            )}

            <button
              className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase text-zinc-200"
              type="button"
              onClick={store.resetDemo}
            >
              <Sparkles size={16} />
              Demo Account
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

// ─── Player Edit Modal ──────────────────────────────────────────────────────────

function PlayerEditModal({
  player,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onReset,
}: {
  player: PlayerProfile;
  onClose: () => void;
  onSave: (updates: Partial<PlayerProfile>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [spins, setSpins] = useState(String(player.spins));
  const [luck, setLuck] = useState(String(player.luck));
  const [pity, setPity] = useState(String(player.pity));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function exportData() {
    const blob = new Blob([JSON.stringify(player, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${player.name.replace(/\s+/g, "_")}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg border border-white/15 bg-ink shadow-impact"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="font-display text-2xl uppercase">Edit Player</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            Player Name
            <input
              className="border border-white/10 bg-black/45 px-3 py-2 text-base text-white outline-none focus:border-gold"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              Spins
              <input
                type="number"
                className="border border-white/10 bg-black/45 px-3 py-2 text-base text-white outline-none focus:border-cyan"
                value={spins}
                onChange={(e) => setSpins(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              Luck
              <input
                type="number"
                className="border border-white/10 bg-black/45 px-3 py-2 text-base text-white outline-none focus:border-acid"
                value={luck}
                onChange={(e) => setLuck(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              Pity
              <input
                type="number"
                className="border border-white/10 bg-black/45 px-3 py-2 text-base text-white outline-none focus:border-rose"
                value={pity}
                onChange={(e) => setPity(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              onClick={onDuplicate}
              className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200 hover:border-cyan"
            >
              <Copy size={13} /> Duplicate
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200 hover:border-gold"
            >
              <Upload size={13} /> Export
            </button>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:border-gold"
              >
                <RotateCcw size={13} /> Reset Stats
              </button>
            ) : (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 border border-gold bg-gold/10 px-3 py-2 text-xs font-bold uppercase text-gold"
              >
                <RotateCcw size={13} /> Confirm Reset
              </button>
            )}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-400 hover:border-rose hover:text-rose"
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 border border-rose bg-rose/10 px-3 py-2 text-xs font-bold uppercase text-rose"
              >
                <Trash2 size={13} /> Confirm Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="flex-1 border border-white/10 bg-white/5 py-3 text-sm font-black uppercase text-zinc-300 hover:border-zinc-400"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim() || player.name,
                spins: Math.max(0, parseInt(spins) || 0),
                luck: parseFloat(luck) || 0,
                pity: Math.max(0, parseFloat(pity) || 0),
              })
            }
            className="clip-slash flex flex-1 items-center justify-center gap-2 bg-gold py-3 font-black uppercase text-abyss"
          >
            <Save size={16} /> Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Account Panel ──────────────────────────────────────────────────────────────

function AccountPanel({ account }: { account: MiniAccount }) {
  const store = useAppStore();
  return (
    <div className="border border-white/10 bg-black/35 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Account
          </p>
          <p className="truncate font-black text-white">{account.name}</p>
        </div>
        <button
          className="grid h-10 w-10 place-items-center border border-white/10 bg-white/5 text-zinc-200 hover:border-rose hover:text-rose"
          title="Sign out"
          onClick={() => void store.signOut()}
        >
          <LogOut size={18} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <Database size={13} />
          {store.authMode === "supabase" ? "Supabase" : "Local"}
        </span>
        <span>
          {store.cloudStatus === "synced" ? "Synced" : store.cloudStatus}
        </span>
      </div>
    </div>
  );
}

// ─── Player Panel ───────────────────────────────────────────────────────────────

function PlayerPanel({
  account,
  onEditPlayer,
}: {
  account: MiniAccount;
  onEditPlayer: (p: PlayerProfile) => void;
}) {
  const store = useAppStore();
  const [name, setName] = useState("");
  const activePlayer = account.players.find(
    (p) => p.id === account.activePlayerId,
  );

  return (
    <div className="border border-white/10 bg-black/35 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <select
          className="min-w-0 flex-1 border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none"
          value={account.activePlayerId}
          onChange={(e) => store.setActivePlayer(e.target.value)}
        >
          {account.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {activePlayer && (
          <button
            className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/5 text-zinc-300 hover:border-cyan hover:text-cyan"
            title="Edit player"
            onClick={() => onEditPlayer(activePlayer)}
          >
            <Edit2 size={15} />
          </button>
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            store.createPlayer(name);
            setName("");
          }
        }}
      >
        <input
          className="min-w-0 flex-1 border border-white/10 bg-black/45 px-3 py-2 text-sm outline-none focus:border-gold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New player name"
        />
        <button
          className="grid h-9 w-9 place-items-center bg-gold text-abyss"
          title="Create player"
        >
          <Plus size={18} />
        </button>
      </form>
    </div>
  );
}

// ─── Reveal Stage ───────────────────────────────────────────────────────────────

function RevealStage({
  spinNonce,
  character,
  fateTone,
  isSpinning,
  intensity,
}: {
  spinNonce: number;
  character?: Character;
  fateTone: string;
  isSpinning: boolean;
  intensity: number;
}) {
  const tier = character?.tier ?? "Normal";
  const shake = isSpinning
    ? 0
    : tier === "Overpowered"
      ? 8 * intensity
      : tier === "Very Strong"
        ? 4 * intensity
        : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: shake ? [0, -shake, shake, -shake / 2, 0] : 0,
      }}
      transition={{ duration: 0.35 }}
      className="relative min-h-[32rem] overflow-hidden border border-white/15 bg-ink/82 shadow-impact"
    >
      <div className="absolute inset-0 bg-[url('/assets/fate-burst.png')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,214,107,0.12),transparent_18rem),linear-gradient(90deg,rgba(9,10,18,0.55),rgba(9,10,18,0.9))]" />
      <div className="absolute inset-0 bg-scanlines bg-[length:100%_4px] opacity-40" />

      <div className="relative grid min-h-[32rem] content-between gap-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-zinc-400">
              Character Select
            </p>
            <h2 className="font-display text-4xl uppercase leading-none text-white text-outline sm:text-6xl">
              {isSpinning
                ? "Rolling Fate"
                : (character?.name ?? "Awaiting Spin")}
            </h2>
          </div>
          <div
            className={cn(
              "clip-slash bg-gradient-to-r px-5 py-2 text-sm font-black uppercase shadow-neon",
              tierColors[tier],
            )}
          >
            {tier}
          </div>
        </div>

        <div className="grid items-end gap-5 lg:grid-cols-[18rem_1fr]">
          <motion.div
            key={`${spinNonce}-${character?.id ?? "empty"}`}
            initial={{ opacity: 0, scale: 0.88, rotate: -2 }}
            animate={{
              opacity: 1,
              scale: isSpinning ? 0.98 : 1,
              rotate: isSpinning ? [1, -1, 1] : 0,
            }}
            transition={{ duration: isSpinning ? 0.08 : 0.35 }}
            className="relative aspect-[4/5] max-w-[18rem] overflow-hidden border border-white/15 bg-black/40 p-4 shadow-neon"
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-70",
                tierColors[tier],
              )}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.55),transparent_8rem),linear-gradient(145deg,transparent_52%,rgba(0,0,0,0.45)_52%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <p className="font-display text-8xl leading-none text-black/35">
                {initials(character?.name ?? "??")}
              </p>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-black/55">
                  {character?.part ?? "Part ?"}
                </p>
                <p className="font-display text-3xl uppercase leading-none text-abyss">
                  {character?.name ?? "Spin"}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ImpactStat
                label="Base Weight"
                value={character ? String(character.weight) : "-"}
              />
              <ImpactStat label="Part" value={character?.part ?? "-"} />
              <ImpactStat
                label="Fate Signal"
                value={<span className={fateTone}>Active</span>}
              />
            </div>
            <p className="max-w-2xl border-l-4 border-gold bg-black/35 px-4 py-3 text-sm leading-6 text-zinc-200">
              {character?.notes ??
                "Choose a player, slam the wheel, and let the saved history push fate around the edges."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Spin Controls ──────────────────────────────────────────────────────────────

function SpinControls({
  isSpinning,
  fate,
  player,
  soundEnabled,
  onSpin,
  onMute,
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
        <p className="text-xs font-black uppercase tracking-[0.26em] text-zinc-500">
          Current Fate
        </p>
        <p className={cn("font-display text-3xl uppercase", fate.tone)}>
          {fate.label}
        </p>
        <p className="text-sm text-zinc-400">
          {fate.fortune} · {player?.spins ?? 0} spins
        </p>
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

// ─── Fate Console ───────────────────────────────────────────────────────────────

function FateConsole({
  account,
  player,
  roster,
}: {
  account: MiniAccount;
  player?: PlayerProfile;
  roster: Character[];
}) {
  const stats = collectionStats(roster, player);
  return (
    <section className="border border-white/10 bg-ink/80 p-4 shadow-neon">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase">Fate Console</h2>
        <Shield className="text-gold" />
      </div>
      <div className="grid gap-3">
        <ProgressRow
          label="Collection"
          value={stats.completion}
          suffix={`${stats.collected.length}/${roster.length}`}
        />
        <ProgressRow
          label="Pity"
          value={((player?.pity ?? 0) / 18) * 100}
          suffix="Hidden"
        />
        <ProgressRow
          label="Luck Drift"
          value={Math.max(0, (((player?.luck ?? 0) + 18) / 42) * 100)}
          suffix="Fate"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <ImpactStat label="Players" value={account.players.length} />
        <ImpactStat label="Roster" value={roster.length} />
      </div>
    </section>
  );
}

// ─── Recent Pulls ───────────────────────────────────────────────────────────────

function RecentPulls({ player }: { player?: PlayerProfile }) {
  const recent = player?.history.slice(-8).reverse() ?? [];
  return (
    <section className="border border-white/10 bg-black/45 p-4">
      <div className="mb-4 flex items-center gap-2">
        <History size={18} className="text-cyan" />
        <h2 className="font-display text-xl uppercase">Recent Pulls</h2>
      </div>
      <div className="grid gap-2">
        {recent.length ? (
          recent.map((pull) => (
            <div
              key={`${pull.timestamp}-${pull.characterId}`}
              className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <span className="truncate font-bold">{pull.characterName}</span>
              <span className="text-xs text-zinc-500">
                {timeAgo(pull.timestamp)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No pulls yet.</p>
        )}
      </div>
    </section>
  );
}

// ─── Collection View ────────────────────────────────────────────────────────────

function CollectionView({
  roster,
  player,
}: {
  roster: Character[];
  player?: PlayerProfile;
}) {
  const stats = collectionStats(roster, player);
  return (
    <section className="grid gap-5">
      <div className="border border-white/10 bg-ink/80 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-zinc-500">
              Collection
            </p>
            <h2 className="font-display text-4xl uppercase">
              {stats.collected.length} / {roster.length}
            </h2>
          </div>
          <p className="font-display text-4xl text-gold">
            {stats.completion.toFixed(1)}%
          </p>
        </div>
        <div className="mt-4 h-3 overflow-hidden bg-black/60">
          <div
            className="h-full bg-gradient-to-r from-rose via-gold to-cyan"
            style={{ width: `${stats.completion}%` }}
          />
        </div>
      </div>
      <CharacterGrid roster={roster} player={player} />
    </section>
  );
}

// ─── Stats View ─────────────────────────────────────────────────────────────────

function StatsView({
  account,
  roster,
  player,
}: {
  account: MiniAccount;
  roster: Character[];
  player?: PlayerProfile;
}) {
  const topCharacter = roster
    .map((c) => ({
      character: c,
      count: player?.perCharacterCounts[c.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)[0];
  const leastCharacter = roster
    .map((c) => ({
      character: c,
      count: player?.perCharacterCounts[c.id] ?? 0,
    }))
    .sort(
      (a, b) =>
        a.count - b.count || a.character.name.localeCompare(b.character.name),
    )[0];
  const stats = collectionStats(roster, player);
  const comparison = account.players
    .map((item) => {
      const collected = roster.filter(
        (c) => (item.perCharacterCounts[c.id] ?? 0) > 0,
      ).length;
      return {
        player: item,
        collected,
        completion: roster.length ? collected / roster.length : 0,
        op: item.tierCounts.Overpowered ?? 0,
      };
    })
    .sort((a, b) => b.completion - a.completion);

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ImpactStat
          label="Total Spins"
          value={player?.spins ?? 0}
          icon={<Gauge size={18} />}
        />
        <ImpactStat
          label="OP Pulls"
          value={player?.tierCounts.Overpowered ?? 0}
          icon={<Crown size={18} />}
        />
        <ImpactStat
          label="Unique"
          value={stats.collected.length}
          icon={<Medal size={18} />}
        />
        <ImpactStat
          label="Last Active"
          value={timeAgo(player?.lastActiveAt)}
          icon={<User size={18} />}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-white/10 bg-black/45 p-5">
          <h2 className="mb-4 font-display text-2xl uppercase">Tier Pulls</h2>
          <div className="grid gap-2">
            {tierOrder.map((tier) => (
              <ProgressRow
                key={tier}
                label={tier}
                value={Math.min(
                  100,
                  ((player?.tierCounts[tier] ?? 0) /
                    Math.max(1, player?.spins ?? 1)) *
                    100,
                )}
                suffix={String(player?.tierCounts[tier] ?? 0)}
              />
            ))}
          </div>
        </section>
        <section className="border border-white/10 bg-black/45 p-5">
          <h2 className="mb-4 font-display text-2xl uppercase">
            Player Compare
          </h2>
          <div className="grid gap-2">
            {comparison.map((item) => (
              <div
                key={item.player.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <span className="font-bold">{item.player.name}</span>
                <span className="text-gold">
                  {Math.round(item.completion * 100)}%
                </span>
                <span className="text-cyan">{item.op} OP</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImpactStat
          label="Most Received"
          value={
            topCharacter?.count
              ? `${topCharacter.character.name} (${topCharacter.count})`
              : "-"
          }
        />
        <ImpactStat
          label="Least Received"
          value={
            leastCharacter
              ? `${leastCharacter.character.name} (${leastCharacter.count})`
              : "-"
          }
        />
      </div>
    </section>
  );
}

// ─── Roster View ────────────────────────────────────────────────────────────────

function RosterView({
  roster,
  player,
  sort,
  setSort,
}: {
  roster: Character[];
  player?: PlayerProfile;
  sort: SortMode;
  setSort: (s: SortMode) => void;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/45 p-4">
        <h2 className="font-display text-3xl uppercase">Roster</h2>
        <select
          className="border border-white/10 bg-black/60 px-3 py-2 text-sm font-bold text-white"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
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

// ─── Admin View ─────────────────────────────────────────────────────────────────

function AdminView({
  account,
  roster,
}: {
  account: MiniAccount;
  roster: Character[];
}) {
  const store = useAppStore();
  const [json, setJson] = useState(() => JSON.stringify(roster, null, 2));
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Keep textarea in sync when the roster changes from outside this editor,
  // but do not overwrite active edits.
  useEffect(() => {
    if (!isDirty) {
      setJson(JSON.stringify(roster, null, 2));
    }
  }, [roster, isDirty]);

  function saveRoster() {
    setSaveState("idle");
    setErrorMsg("");

    try {
      store.updateRosterJson(json);
      setIsDirty(false);
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveState("error");
      setErrorMsg(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  function resetJson() {
    setJson(JSON.stringify(roster, null, 2));
    setIsDirty(false);
    setSaveState("idle");
    setErrorMsg("");
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="border border-white/10 bg-black/55 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl uppercase">Character JSON</h2>
            <div className="flex gap-2">
              <button
                onClick={resetJson}
                className="flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase text-zinc-300 hover:border-zinc-400"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={saveRoster}
                className={cn(
                  "clip-slash flex items-center gap-2 px-5 py-2 font-black uppercase transition",
                  saveState === "success"
                    ? "bg-acid text-abyss"
                    : saveState === "error"
                      ? "bg-rose text-white"
                      : "bg-gold text-abyss",
                )}
              >
                {saveState === "success" ? (
                  <>
                    <Check size={16} /> Saved!
                  </>
                ) : saveState === "error" ? (
                  <>
                    <X size={16} /> Error
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            className="h-[34rem] w-full resize-y border border-white/10 bg-abyss/90 p-3 font-mono text-xs leading-5 text-zinc-100 outline-none focus:border-cyan"
            spellCheck={false}
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setIsDirty(true);
              setSaveState("idle");
            }}
          />
          {saveState === "success" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-acid">
              <Check size={14} /> Roster updated successfully. The wheel is now
              using the new data.
            </p>
          )}
          {saveState === "error" && (
            <p className="mt-3 text-sm text-rose">{errorMsg}</p>
          )}
          <p className="mt-2 text-xs text-zinc-600">
            Fields: id, name, part, weight (1-10), tier, notes. After saving,
            the roster updates immediately.
          </p>
        </div>
        <div className="grid content-start gap-4">
          <SettingSlider
            label="Duplicate Reduction"
            value={account.settings.duplicateReduction}
            min={0}
            max={0.18}
            step={0.01}
            onChange={(v) => store.updateSettings({ duplicateReduction: v })}
          />
          <SettingSlider
            label="Repeat Decay"
            value={account.settings.repeatDecay}
            min={0.55}
            max={1}
            step={0.01}
            onChange={(v) => store.updateSettings({ repeatDecay: v })}
          />
          <SettingSlider
            label="Pity Strength"
            value={account.settings.pityStrength}
            min={0}
            max={0.05}
            step={0.002}
            onChange={(v) => store.updateSettings({ pityStrength: v })}
          />
          <SettingSlider
            label="Reveal Intensity"
            value={account.settings.revealIntensity}
            min={0.4}
            max={1.8}
            step={0.1}
            onChange={(v) => store.updateSettings({ revealIntensity: v })}
          />
          <SettingSlider
            label="Recent Window"
            value={account.settings.recentWindow}
            min={4}
            max={16}
            step={1}
            onChange={(v) => store.updateSettings({ recentWindow: v })}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Character Grid ─────────────────────────────────────────────────────────────

function CharacterGrid({
  roster,
  player,
}: {
  roster: Character[];
  player?: PlayerProfile;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {roster.map((character) => {
        const count = player?.perCharacterCounts[character.id] ?? 0;
        return (
          <article
            key={character.id}
            className={cn(
              "relative min-h-44 overflow-hidden border bg-black/50 p-3",
              count ? "border-gold/55" : "border-white/10 opacity-85",
            )}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                tierColors[character.tier],
              )}
            />
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br font-display text-xl text-abyss",
                    tierColors[character.tier],
                  )}
                >
                  {initials(character.name)}
                </div>
                <span className="text-right text-xs font-black uppercase text-zinc-500">
                  W{character.weight}
                </span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  {character.part}
                </p>
                <h3 className="font-display text-xl uppercase leading-none text-white">
                  {character.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {character.notes}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "bg-gradient-to-r bg-clip-text font-black uppercase text-transparent",
                    tierColors[character.tier],
                  )}
                >
                  {character.tier}
                </span>
                <span className="text-zinc-400">
                  {count ? `${count}x` : "Missing"}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ─── Setting Slider ─────────────────────────────────────────────────────────────

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-2 border border-white/10 bg-black/45 p-4">
      <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
        <span className="text-gold">
          {Number(value).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────────────────

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "clip-slash flex shrink-0 items-center gap-2 border border-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition",
        active
          ? "bg-gold text-abyss shadow-neon"
          : "bg-black/40 text-zinc-300 hover:border-cyan hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Impact Stat ────────────────────────────────────────────────────────────────

function ImpactStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="truncate font-display text-2xl uppercase text-white">
        {value}
      </p>
    </div>
  );
}

// ─── Progress Row ────────────────────────────────────────────────────────────────

function ProgressRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
        <span>{label}</span>
        <span>{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden bg-black/65">
        <div
          className="h-full bg-gradient-to-r from-rose via-gold to-cyan"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

// ─── Particle Field ──────────────────────────────────────────────────────────────

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-10 bg-gold/30"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 19) % 100}%` }}
          animate={{ x: [0, 90, -20], opacity: [0.08, 0.42, 0.08] }}
          transition={{
            duration: 5 + (i % 6),
            repeat: Infinity,
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

// ─── Sort Characters ─────────────────────────────────────────────────────────────

function sortCharacters(
  roster: Character[],
  player: PlayerProfile | undefined,
  sort: SortMode,
) {
  const recentIndex = new Map<string, number>();
  player?.history.forEach((entry, i) => recentIndex.set(entry.characterId, i));

  return [...roster].sort((a, b) => {
    if (sort === "part")
      return a.part.localeCompare(b.part) || a.name.localeCompare(b.name);
    if (sort === "tier")
      return (
        tierRank[b.tier] - tierRank[a.tier] || a.name.localeCompare(b.name)
      );
    if (sort === "weight")
      return a.weight - b.weight || a.name.localeCompare(b.name);
    if (sort === "recent")
      return (
        (recentIndex.get(b.id) ?? -1) - (recentIndex.get(a.id) ?? -1) ||
        a.name.localeCompare(b.name)
      );
    if (sort === "least")
      return (
        (player?.perCharacterCounts[a.id] ?? 0) -
          (player?.perCharacterCounts[b.id] ?? 0) ||
        a.name.localeCompare(b.name)
      );
    return a.name.localeCompare(b.name);
  });
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
