# ASBR Match Randomizer & Tracker

A **JoJo's Bizarre Adventure: All-Star Battle R** team randomizer and
competitive match tracker, styled after the game's character-select screen.

Spin two 3-fighter teams (cyan side vs pink side), declare the winner, log kills,
and watch shared stats build up — leaderboards, head-to-heads, rivalries and a
character meta.

## Features

- **Match** — pick two players, slot-machine a fresh 3v3 board (6 unique
  fighters, staggered lock-in), declare a winner, optionally record per-character
  kills. Includes Part filters, per-side character bans, a "First Encounter"
  flourish for brand-new matchups, a kill trophy, and re-spin.
- **Players** — add fighters, see each one's W/L/win-rate and signature
  character, and open a profile with full match history + per-character stats.
- **Stats** — win-rate leaderboard (min 3 matches), most-picked / most-winning
  characters, a head-to-head matrix, rivalry badges (5+ bouts) and a recent feed.

## Shared data

All data lives under two keys — `players` and `matches` — and the whole group
sees one synced dataset. Stats are **always re-derived from raw matches**, never
stored.

- **With Supabase** (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`):
  a shared `shared_state` table with realtime, so every device updates live.
  Apply `supabase/migrations/002_shared_state.sql`.
- **Without Supabase**: falls back to `localStorage`, kept in sync across tabs.

## Character images

The roster lives in [`data/characters.asbr.json`](data/characters.asbr.json) as
`{ id, name, part, imageUrl }`. Empty or broken `imageUrl`s fall back to a
stylized, part-colored name-plate, so the board always looks intentional. To use
real portraits, just fill in the `imageUrl` values (see the note at the top of
[`lib/roster.ts`](lib/roster.ts)).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint
```
