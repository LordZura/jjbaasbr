"use client";

import { applySpinResult, weightedSpin } from "@/lib/fate";
import { defaultCharacters, parseRosterJson } from "@/lib/roster";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { BalanceSettings, Character, MiniAccount, PlayerProfile, RosterSet } from "@/lib/types";
import { uid } from "@/lib/utils";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthMode = "local" | "supabase";

type AppStore = {
  accounts: MiniAccount[];
  activeAccountId?: string;
  authMode: AuthMode;
  cloudStatus: "idle" | "syncing" | "synced" | "error";
  cloudMessage?: string;
  lastResult?: Character;
  createLocalAccount: (name: string, email?: string) => void;
  createSupabaseAccount: (name: string, email: string, password: string) => Promise<void>;
  signInWithSupabase: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  loadCloudAccount: () => Promise<void>;
  setActiveAccount: (accountId: string) => void;
  createPlayer: (name: string) => void;
  setActivePlayer: (playerId: string) => void;
  spin: () => Character | undefined;
  updateSettings: (settings: Partial<BalanceSettings>) => void;
  updateRosterJson: (rawJson: string) => void;
  resetDemo: () => void;
};

export const defaultSettings: BalanceSettings = {
  recentWindow: 10,
  duplicateReduction: 0.08,
  repeatDecay: 0.78,
  pityStrength: 0.018,
  luckDrift: 1.15,
  rareTierBoostCap: 1.22,
  revealIntensity: 1,
  soundEnabled: true
};

export function createPlayerProfile(name: string): PlayerProfile {
  return {
    id: uid("player"),
    name,
    spins: 0,
    history: [],
    perCharacterCounts: {},
    tierCounts: {},
    luck: 0,
    pity: 0,
    lastActiveAt: new Date().toISOString()
  };
}

function createRosterSet(name = "ASBR Default Roster"): RosterSet {
  return {
    id: uid("roster"),
    name,
    characters: defaultCharacters,
    updatedAt: new Date().toISOString()
  };
}

function createMiniAccount(name: string, email?: string, id = uid("account")): MiniAccount {
  const roster = createRosterSet();
  const player = createPlayerProfile("Player 1");

  return {
    id,
    name,
    email,
    players: [player],
    activePlayerId: player.id,
    rosterSets: [roster],
    activeRosterSetId: roster.id,
    settings: defaultSettings,
    createdAt: new Date().toISOString()
  };
}

function activeAccount(state: Pick<AppStore, "accounts" | "activeAccountId">) {
  return state.accounts.find((account) => account.id === state.activeAccountId);
}

function replaceAccount(accounts: MiniAccount[], next: MiniAccount) {
  return accounts.map((account) => (account.id === next.id ? next : account));
}

export function getActiveRoster(account?: MiniAccount) {
  return (
    account?.rosterSets.find((set) => set.id === account.activeRosterSetId)?.characters ?? defaultCharacters
  );
}

export function getActivePlayer(account?: MiniAccount) {
  return account?.players.find((player) => player.id === account.activePlayerId);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      authMode: "local",
      cloudStatus: "idle",

      createLocalAccount: (name, email) => {
        const account = createMiniAccount(name.trim() || "Local Account", email);
        set((state) => ({
          accounts: [...state.accounts, account],
          activeAccountId: account.id,
          authMode: "local",
          cloudStatus: "idle",
          cloudMessage: undefined
        }));
      },

      createSupabaseAccount: async (name, email, password) => {
        if (!supabase) {
          get().createLocalAccount(name, email);
          set({ cloudStatus: "error", cloudMessage: "Supabase env vars are not configured; using local mode." });
          return;
        }

        set({ cloudStatus: "syncing", cloudMessage: "Creating account..." });
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { account_name: name } }
        });
        if (error) {
          set({ cloudStatus: "error", cloudMessage: error.message });
          return;
        }

        const account = createMiniAccount(name.trim() || "Fate Account", email, data.user?.id ?? uid("account"));
        set((state) => ({
          accounts: [...state.accounts.filter((item) => item.id !== account.id), account],
          activeAccountId: account.id,
          authMode: "supabase"
        }));
        await get().syncToCloud();
      },

      signInWithSupabase: async (email, password) => {
        if (!supabase) {
          set({ cloudStatus: "error", cloudMessage: "Add Supabase env vars to enable device sync." });
          return;
        }

        set({ cloudStatus: "syncing", cloudMessage: "Signing in..." });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ cloudStatus: "error", cloudMessage: error.message });
          return;
        }
        await get().loadCloudAccount();
      },

      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        set({ activeAccountId: undefined, authMode: "local", cloudStatus: "idle", cloudMessage: undefined });
      },

      syncToCloud: async () => {
        if (!supabase) return;
        const account = activeAccount(get());
        if (!account) return;

        set({ cloudStatus: "syncing", cloudMessage: "Saving..." });
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          set({ cloudStatus: "error", cloudMessage: "Sign in to sync across devices." });
          return;
        }

        const payload = { ...account, id: user.id, email: user.email ?? account.email, syncedAt: new Date().toISOString() };
        const { error } = await supabase.from("account_states").upsert({
          user_id: user.id,
          account_name: payload.name,
          app_state: payload,
          updated_at: new Date().toISOString()
        });

        if (error) {
          set({ cloudStatus: "error", cloudMessage: error.message });
          return;
        }

        set((state) => ({
          accounts: replaceAccount(state.accounts, payload),
          activeAccountId: payload.id,
          cloudStatus: "synced",
          cloudMessage: "Synced",
          authMode: "supabase"
        }));
      },

      loadCloudAccount: async () => {
        if (!supabase) return;
        set({ cloudStatus: "syncing", cloudMessage: "Loading cloud save..." });
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          set({ cloudStatus: "error", cloudMessage: "No Supabase session found." });
          return;
        }

        const { data, error } = await supabase
          .from("account_states")
          .select("app_state")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          set({ cloudStatus: "error", cloudMessage: error.message });
          return;
        }

        const loaded = data?.app_state as MiniAccount | undefined;
        const account = loaded ?? createMiniAccount(user.user_metadata?.account_name ?? "Fate Account", user.email, user.id);
        const normalized = { ...account, id: user.id, email: user.email ?? account.email };
        set((state) => ({
          accounts: [...state.accounts.filter((item) => item.id !== normalized.id), normalized],
          activeAccountId: normalized.id,
          authMode: "supabase",
          cloudStatus: "synced",
          cloudMessage: loaded ? "Cloud save loaded" : "New cloud account ready"
        }));
        if (!loaded) await get().syncToCloud();
      },

      setActiveAccount: (accountId) => set({ activeAccountId: accountId }),

      createPlayer: (name) => {
        const account = activeAccount(get());
        if (!account) return;
        const player = createPlayerProfile(name.trim() || `Player ${account.players.length + 1}`);
        const next = {
          ...account,
          players: [...account.players, player],
          activePlayerId: player.id
        };
        set((state) => ({ accounts: replaceAccount(state.accounts, next) }));
        void get().syncToCloud();
      },

      setActivePlayer: (playerId) => {
        const account = activeAccount(get());
        if (!account) return;
        const next = { ...account, activePlayerId: playerId };
        set((state) => ({ accounts: replaceAccount(state.accounts, next) }));
      },

      spin: () => {
        const account = activeAccount(get());
        const player = getActivePlayer(account);
        const roster = getActiveRoster(account);
        if (!account || !player || roster.length === 0) return undefined;

        const result = weightedSpin(roster, player, account.settings);
        const nextPlayer = applySpinResult(player, result, account.settings);
        const next = {
          ...account,
          players: account.players.map((item) => (item.id === player.id ? nextPlayer : item))
        };

        set((state) => ({ accounts: replaceAccount(state.accounts, next), lastResult: result }));
        void get().syncToCloud();
        return result;
      },

      updateSettings: (settings) => {
        const account = activeAccount(get());
        if (!account) return;
        const next = { ...account, settings: { ...account.settings, ...settings } };
        set((state) => ({ accounts: replaceAccount(state.accounts, next) }));
        void get().syncToCloud();
      },

      updateRosterJson: (rawJson) => {
        const account = activeAccount(get());
        if (!account) return;
        const characters = parseRosterJson(rawJson).sort((a, b) => a.name.localeCompare(b.name));
        const nextSets = account.rosterSets.map((setItem) =>
          setItem.id === account.activeRosterSetId
            ? { ...setItem, characters, updatedAt: new Date().toISOString() }
            : setItem
        );
        const next = { ...account, rosterSets: nextSets };
        set((state) => ({ accounts: replaceAccount(state.accounts, next) }));
        void get().syncToCloud();
      },

      resetDemo: () => {
        const account = createMiniAccount("Demo Account");
        set({ accounts: [account], activeAccountId: account.id, authMode: "local", lastResult: undefined });
      }
    }),
    {
      name: "jjba-asbr-fate-wheel",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
        authMode: state.authMode,
        lastResult: state.lastResult
      })
    }
  )
);

export { isSupabaseConfigured };
