"use client";

import { emptyLuck, luckAfterDraw } from "@/lib/draw";
import { getCharacter } from "@/lib/roster";
import {
  loadAll,
  saveKey,
  storageMode,
  subscribe,
  type CollectionsMap,
  type MatchesMap,
  type PlayersMap,
  type StorageKey,
  type StorageMode,
} from "@/lib/storage";
import type { Collection, Match, Player, SyncStatus, Toast } from "@/lib/types";
import { uid } from "@/lib/utils";
import { create } from "zustand";

/** What one player pulled in a single spin. */
export type DrawEntry = { playerId: string; characterIds: string[] };

export type RecordMatchInput = {
  p1Id: string;
  p2Id: string;
  p1Team: string[];
  p2Team: string[];
  winnerId: string;
  kills: Record<string, number> | null;
};

type Store = {
  players: PlayersMap;
  matches: MatchesMap;
  /** Per-player gacha collections (pulls + algorithm luck). Shared per account. */
  collections: CollectionsMap;
  status: SyncStatus;
  ready: boolean;
  mode: StorageMode;
  toasts: Toast[];

  init: () => Promise<void>;
  /** Re-pull the whole shared dataset (used on reconnect / tab refocus). */
  reload: () => Promise<void>;
  addPlayer: (name: string) => Player | undefined;
  renamePlayer: (id: string, name: string) => void;
  deletePlayer: (id: string) => void;
  recordMatch: (input: RecordMatchInput) => void;
  /** Record one spin: append pulls and advance each player's per-rarity luck. */
  recordDraw: (entries: DrawEntry[]) => void;

  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: string) => void;
};

let initialized = false;

export function emptyCollection(playerId: string): Collection {
  return { playerId, pulls: {}, luck: emptyLuck() };
}

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useStore = create<Store>((set, get) => {
  // Optimistic write: state already updated; push the affected key to shared
  // storage and reflect save/synced/error in the corner indicator.
  const persist = async (key: StorageKey, value: unknown) => {
    set({ status: "saving" });
    try {
      await saveKey(key, value);
      set({ status: "synced" });
    } catch (error) {
      set({ status: "error" });
      get().pushToast(
        "error",
        errMsg(error, "Save failed — changes are local only."),
      );
    }
  };

  return {
    players: {},
    matches: {},
    collections: {},
    status: "loading",
    ready: false,
    // SSR-safe default: `storageMode` resolves to "local" on the client but
    // "memory" during SSR (no `window`), so reading it into the initial state
    // would cause a hydration mismatch. The real mode is set in `init()`, which
    // only runs in the browser.
    mode: "memory",
    toasts: [],

    init: async () => {
      if (initialized) return;
      initialized = true;

      set({ status: "loading", mode: storageMode });
      try {
        const data = await loadAll();
        set({
          players: data.players,
          matches: data.matches,
          collections: data.collections,
          status: "synced",
          ready: true,
        });
      } catch (error) {
        set({ status: "error", ready: true });
        get().pushToast("error", errMsg(error, "Couldn't load shared data."));
      }

      // Live updates: Supabase realtime, or the cross-tab `storage` event.
      // `reload` on (re)connect keeps every device converged after sleep/offline.
      try {
        subscribe(
          (key, value) => {
            if (key === "players") set({ players: (value as PlayersMap) ?? {} });
            if (key === "matches") set({ matches: (value as MatchesMap) ?? {} });
            if (key === "collections")
              set({ collections: (value as CollectionsMap) ?? {} });
            set({ status: "synced" });
          },
          () => void get().reload(),
        );
      } catch {
        /* live updates are best-effort */
      }

      // Resync whenever the user returns to the tab or the network comes back.
      if (typeof window !== "undefined") {
        const resync = () => {
          if (document.visibilityState === "visible") void get().reload();
        };
        window.addEventListener("focus", resync);
        window.addEventListener("online", resync);
        document.addEventListener("visibilitychange", resync);
      }
    },

    reload: async () => {
      try {
        const data = await loadAll();
        set({
          players: data.players,
          matches: data.matches,
          collections: data.collections,
          status: "synced",
        });
      } catch {
        /* a failed background refresh keeps the last-known-good state */
      }
    },

    addPlayer: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return undefined;
      const clash = Object.values(get().players).some(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (clash) {
        get().pushToast("error", `"${trimmed}" already exists.`);
        return undefined;
      }
      const player: Player = {
        id: uid("p"),
        name: trimmed,
        createdAt: new Date().toISOString(),
      };
      const next = { ...get().players, [player.id]: player };
      set({ players: next });
      void persist("players", next);
      return player;
    },

    renamePlayer: (id, name) => {
      const trimmed = name.trim();
      const current = get().players[id];
      if (!trimmed || !current) return;
      const next = { ...get().players, [id]: { ...current, name: trimmed } };
      set({ players: next });
      void persist("players", next);
    },

    deletePlayer: (id) => {
      const next = { ...get().players };
      delete next[id];
      set({ players: next });
      void persist("players", next);
      // Matches are intentionally preserved as historical record; the UI shows
      // a graceful fallback name for any removed player. The collection, being
      // account data, is dropped along with the player.
      const collections = { ...get().collections };
      if (collections[id]) {
        delete collections[id];
        set({ collections });
        void persist("collections", collections);
      }
    },

    recordMatch: (input) => {
      const match: Match = {
        id: uid("m"),
        date: new Date().toISOString(),
        ...input,
      };
      const next = { ...get().matches, [match.id]: match };
      set({ matches: next });
      void persist("matches", next);
    },

    recordDraw: (entries) => {
      const current = get().collections;
      const next: CollectionsMap = { ...current };
      for (const { playerId, characterIds } of entries) {
        if (!playerId || characterIds.length === 0) continue;
        const prev = current[playerId] ?? emptyCollection(playerId);
        const pulls = { ...prev.pulls };
        const drawn = [];
        for (const id of characterIds) {
          pulls[id] = (pulls[id] ?? 0) + 1;
          const c = getCharacter(id);
          if (c) drawn.push(c);
        }
        next[playerId] = {
          playerId,
          pulls,
          luck: luckAfterDraw(prev.luck ?? emptyLuck(), drawn),
        };
      }
      set({ collections: next });
      void persist("collections", next);
    },

    pushToast: (kind, message) => {
      const toast: Toast = { id: uid("t"), kind, message };
      set((s) => ({ toasts: [...s.toasts, toast] }));
      setTimeout(() => get().dismissToast(toast.id), 4500);
    },

    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

// Convenience selector used across the UI.
export function playerName(players: PlayersMap, id: string): string {
  return players[id]?.name ?? "Unknown";
}

/** A player's collection, or a fresh empty one if they've never pulled. */
export function collectionFor(
  collections: CollectionsMap,
  id: string,
): Collection {
  return collections[id] ?? emptyCollection(id);
}
