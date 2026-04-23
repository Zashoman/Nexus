# The Chair

Local-first trading discipline journal. 300-session journey. Daily AI-driven sessions calibrated to market regime. Watchlist + vol/breadth dashboard. Pattern analytics. All data in local SQLite. Nightly backup to Google Sheets.

Single user. Runs on your Mac. No auth — the app never leaves localhost.

## Phase 1 — what's in the box

This commit is the skeleton described in BUILDSPEC §11 Phase 1:

- Next.js 14 (App Router) + TypeScript + Tailwind.
- Five-tab shell with working client-side nav: Home, Journal, History, Patterns, Watchlist.
- SQLite schema (`lib/db/schema.sql`) + connection singleton + migration runner.
- All API routes stubbed with realistic mock data so the UI flow is exercisable end-to-end:
  - `POST /api/mentor/questions` → returns a regime-appropriate question set and opens a draft session.
  - `POST /api/journal` → completes the draft, returns the mentor's post-session read.
  - `GET /api/journal`, `GET /api/journal/[id]`, `GET /api/watchlist`, `POST/DELETE /api/watchlist`, `GET /api/market/snapshot`, `GET /api/market/regime`, `GET /api/patterns`, `POST /api/backup/run`.
- Draft stubs for every Phase 2-5 module (Anthropic client, Tradier / MenthorQ / CBOE / FRED clients, regime composite, Google Sheets sync, cron runner) so the directory layout matches the spec.

No real external calls are made in Phase 1. An in-memory mock store backs the end-to-end flow so you can see a session submit and appear on the History tab without setting up a DB or API keys.

## Setup

```bash
cd thechair
pnpm install
cp .env.example .env.local          # edit paths + keys (keys optional for Phase 1)
pnpm run init-db                    # create ~/.thechair/thechair.db
pnpm run dev                        # http://localhost:3000
```

Optional: seed a couple of demo rows so History / Patterns aren't empty.

```bash
pnpm run seed-dev
```

## Running as a background service (§9.4)

```bash
pnpm build
pm2 start pnpm --name "thechair" -- start
pm2 save
pm2 startup
```

Workers (Phase 3+ market polling, Phase 5 backup) run in a separate process:

```bash
pm2 start pnpm --name "thechair-workers" -- run workers
```

## Custom domain (§9)

Pick one of:

**Local-only** — edit `/etc/hosts`:
```
127.0.0.1 thechair.local
```
Browse to `http://thechair.local:3000`.

**Real domain, local resolution** — point a real domain in `/etc/hosts` to `127.0.0.1`, use `mkcert` for HTTPS:
```bash
brew install mkcert
mkcert -install
mkcert thechair.app
```
Then put Caddy or a Next.js custom server in front on port 443.

## Phase map

| Phase | Status | What lands |
|-------|--------|------------|
| 1 — Skeleton | **this commit** | scaffold, SQLite schema, stub routes, four-tab UI |
| 2 — Journal flow | pending | real Anthropic calls for Calm regime, then write to SQLite |
| 3 — Market data | pending | Tradier + CBOE + FRED + MenthorQ, regime composite live |
| 4 — Other regimes + patterns | pending | Elevated / Stressed / Dislocation prompts, phrase clustering |
| 5 — Backup + deploy | pending | Google Sheets sync, pm2, mkcert, custom domain |

## Layout

```
thechair/
├── app/                        Next.js App Router
│   ├── (home|journal|history|patterns|watchlist)/page.tsx
│   ├── api/
│   │   ├── journal/            GET list, POST submit, GET [id]
│   │   ├── watchlist/          GET/POST/PUT/DELETE, voice-add
│   │   ├── market/             snapshot, regime
│   │   ├── mentor/             questions, read
│   │   ├── patterns/           GET aggregate report
│   │   └── backup/run/         POST manual trigger
│   ├── components/             TabNav, Tile, RegimeBanner, MarketBoard, JournalSession, WatchlistEditor
│   ├── globals.css             Tailwind + dark trading-terminal palette
│   └── layout.tsx              shell + fonts
├── lib/
│   ├── db/                     schema.sql, index.ts, migrations/
│   ├── market/                 tradier, menthorq, cboe, fred, derived, regime, mock
│   ├── mentor/                 anthropic, prompts/*, questionBuilder, patternMatcher, mock
│   ├── backup/                 sheets
│   ├── mock-store.ts           in-memory Phase 1 backing store
│   └── types.ts
├── workers/                    market-poll, nightly-backup, runner
└── scripts/                    init-db, seed-dev, one-time-backup
```

## Non-obvious gotchas (§13 recap)

- `better-sqlite3` is synchronous. Do not `await` it. This is correct for a local single-user app.
- `node-cron` in `next start` works, but a separate process is cleaner — use `pnpm run workers` under pm2.
- Anthropic question generation is 3–10 s; show loading and do the post-session read async after save.
- CBOE JSON can break — wrap every call in try/catch with a fallback to yfinance for level data.
- Store UTC, display in `LOCAL_TZ`. Pass `{ timezone }` to every `cron.schedule`.
