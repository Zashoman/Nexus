# IPO Tracker

Daily IPO scanner that classifies filings by sector using Claude Haiku and fans matching IPOs out to configurable Telegram channels.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase, Anthropic SDK, Finnhub, SEC EDGAR, Telegram Bot API. Deployed to Vercel, runs on a daily cron.

## How it works

1. Cron hits `/api/cron/scan` Mon–Fri at 21:00 UTC.
2. Fetches the Finnhub IPO calendar (next 14 days) + SEC EDGAR S-1/F-1 Atom feeds.
3. Dedups against the `ipos` table (ticker as primary key).
4. For each new IPO, Claude Haiku assigns 1–3 canonical sectors + `is_spac` flag.
5. Walks every active channel. For each, checks sectors, min raise, geography, stage, excludes. All must pass.
6. For each matching channel, inserts an `alerts` row (UNIQUE on ticker+channel dedups retries), sends the Telegram message, stores the message_id. On Telegram failure the alert row is deleted so the next run retries.

## Setup

### 1. Supabase

- Create a project at supabase.com.
- SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
- Project Settings → API: copy `URL`, `anon` key, and `service_role` key.

### 2. Telegram bot

- DM `@BotFather` on Telegram → `/newbot` → follow prompts. Save the token.
- Create each Telegram channel you want to publish to.
- In each channel: Add Members → add your bot → promote to admin (needs "Post Messages" permission).

### 3. Find each channel's chat ID

- Post any message in the channel (e.g. "hello").
- Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
- Look for `"chat": { "id": -1001234567890, "type": "channel", ... }`. That negative ID is your chat_id.
- Update each channel row in this app (via the UI at `/channels` or directly in the Supabase `channels` table). Four seeded channels ship with `telegram_chat_id = 'REPLACE_ME'` — either overwrite or delete them.

### 4. Finnhub

- Sign up at finnhub.io (free tier is fine). Dashboard → copy API key.

### 5. Anthropic

- console.anthropic.com → API keys → create key.

### 6. Deploy to Vercel

- `vercel` → link project.
- Add every variable from `.env.example` in Project Settings → Environment Variables.
  - `CRON_SECRET`: any random string (e.g. `openssl rand -hex 32`).
  - `SEC_USER_AGENT`: required by SEC, must include your email (e.g. `IPO Tracker (you@example.com)`).
- `vercel --prod`.
- Add your custom domain in Vercel → Domains.

### 7. Kick off the first scan manually

```bash
curl -X POST https://YOUR-DOMAIN/api/cron/scan \
  -H "Authorization: Bearer $CRON_SECRET"
```

The scheduled cron is `0 21 * * 1-5` (21:00 UTC weekdays).

## Local dev

```bash
cp .env.example .env.local
# fill in values
npm install
npm run dev
```

Trigger the scan locally:

```bash
curl -X POST http://localhost:3000/api/cron/scan -H "Authorization: Bearer $CRON_SECRET"
```

## Data model

- `channels` — one row per Telegram destination, each with its own filter config.
- `ipos` — one row per unique ticker (or stable S-1 pseudo-ticker for filings without a real ticker yet).
- `alerts` — fan-out record with UNIQUE(ipo_ticker, channel_id).
- `sources_log` — audit trail per scan per source.

## Routing rules

A channel receives an IPO if **all** of these pass:

- Not excluded (`excludes` ⊃ `spac` drops all SPACs; `bdc` drops BDCs).
- Stage is in `channel.stages`.
- Sectors overlap with `channel.sectors`, OR `channel.sectors` contains `*`.
- `deal_size_usd ≥ channel.min_raise_usd` (if min_raise > 0, IPOs with unknown deal size are skipped rather than blasted).
- IPO exchange maps to one of `channel.geographies` (empty = any).

## Canonical sectors

biotech, diagnostics, oncology, rare-disease, metabolic, medtech, defense, cuas, aerospace, space, dual-use, ai-infra, ai-software, semis, quantum, robotics, cybersecurity, fintech, saas, energy, mining, commodities, consumer, industrials, healthcare-services, real-estate, spac, bdc, other.
