"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared storage adapter — the app's equivalent of `window.storage` (shared).
//
// All players + matches live under two keys ("players", "matches") so the whole
// group sees one synced dataset.
//
//   • Supabase configured  → a single shared `shared_state` table with realtime,
//     so every device/user reads + writes the same data live.
//   • No Supabase          → localStorage, with the cross-tab `storage` event
//     standing in for realtime so multiple tabs stay in sync.
//
// Every operation is wrapped so the store can surface a clean error toast.
// ─────────────────────────────────────────────────────────────────────────────

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Collection, Match, Player } from "@/lib/types";

export type PlayersMap = Record<string, Player>;
export type MatchesMap = Record<string, Match>;
export type CollectionsMap = Record<string, Collection>; // keyed by playerId
export type StorageKey = "players" | "matches" | "collections";
export type SharedData = {
  players: PlayersMap;
  matches: MatchesMap;
  collections: CollectionsMap;
};

const KEYS: StorageKey[] = ["players", "matches", "collections"];

export type StorageMode = "supabase" | "local" | "memory";

const TABLE = "shared_state";
const LOCAL_PREFIX = "asbr-tracker:";

export const storageMode: StorageMode =
  isSupabaseConfigured && supabase
    ? "supabase"
    : typeof window !== "undefined"
      ? "local"
      : "memory";

function empty(): SharedData {
  return { players: {}, matches: {}, collections: {} };
}

// ── Supabase backend ─────────────────────────────────────────────────────────

async function loadSupabase(): Promise<SharedData> {
  const { data, error } = await supabase!
    .from(TABLE)
    .select("key,value")
    .in("key", KEYS);
  if (error) throw error;

  const out = empty();
  for (const row of data ?? []) {
    if (row.key === "players") out.players = (row.value ?? {}) as PlayersMap;
    if (row.key === "matches") out.matches = (row.value ?? {}) as MatchesMap;
    if (row.key === "collections")
      out.collections = (row.value ?? {}) as CollectionsMap;
  }
  return out;
}

async function saveSupabase(key: StorageKey, value: unknown): Promise<void> {
  const { error } = await supabase!
    .from(TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ── localStorage backend ─────────────────────────────────────────────────────

function loadLocal(): SharedData {
  const out = empty();
  const players = localStorage.getItem(LOCAL_PREFIX + "players");
  const matches = localStorage.getItem(LOCAL_PREFIX + "matches");
  const collections = localStorage.getItem(LOCAL_PREFIX + "collections");
  if (players) out.players = JSON.parse(players);
  if (matches) out.matches = JSON.parse(matches);
  if (collections) out.collections = JSON.parse(collections);
  return out;
}

function saveLocal(key: StorageKey, value: unknown): void {
  localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function loadAll(): Promise<SharedData> {
  if (storageMode === "supabase") return loadSupabase();
  if (storageMode === "local") return loadLocal();
  return empty();
}

export async function saveKey(key: StorageKey, value: unknown): Promise<void> {
  if (storageMode === "supabase") return saveSupabase(key, value);
  if (storageMode === "local") return saveLocal(key, value);
}

/** Subscribe to remote/cross-tab writes. Returns an unsubscribe fn. */
export function subscribe(
  onChange: (key: StorageKey, value: unknown) => void,
): () => void {
  if (storageMode === "supabase") {
    const channel = supabase!
      .channel("shared_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          const row = payload.new as { key?: StorageKey; value?: unknown };
          if (row?.key) onChange(row.key, row.value ?? {});
        },
      )
      .subscribe();
    return () => {
      void supabase!.removeChannel(channel);
    };
  }

  if (storageMode === "local") {
    const handler = (event: StorageEvent) => {
      if (!event.key?.startsWith(LOCAL_PREFIX) || event.newValue == null) return;
      const key = event.key.slice(LOCAL_PREFIX.length) as StorageKey;
      try {
        onChange(key, JSON.parse(event.newValue));
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return () => {};
}
