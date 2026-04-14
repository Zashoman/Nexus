# RoboX Intel

Market intelligence platform for a robotics training data startup. Monitors
22+ sources across the robotics/physical AI ecosystem and presents a
prioritized daily feed with suggested actions.

## Setup

### 1. Run the schema migration

Apply `supabase/robox-intel-schema.sql` to the Supabase project:

```bash
psql $DATABASE_URL -f supabase/robox-intel-schema.sql
```

Or paste it into the Supabase SQL editor.

### 2. Seed initial data

Once the tables exist, seed companies, sources, media contacts, and pitch
angles with a single POST:

```bash
curl -X POST https://<your-domain>/api/robox-intel/seed
```

The seed endpoint is idempotent — safe to re-run.

### 3. Run the ingestion pipeline

Manually trigger the full ingestion pipeline:

```bash
curl -X POST https://<your-domain>/api/robox-intel/ingest
```

Or fetch from a single source by passing `?sources=arxiv,prnewswire`.

Scheduled ingestion runs every 4 hours (configured in `vercel.json`).

### 4. Open the dashboard

Navigate to `/robox-intel` in the browser.

## Architecture

```
src/
  app/
    robox-intel/              — Dashboard UI (React SPA)
    api/robox-intel/          — REST API
      signals/                — CRUD for signals + briefing + stats
      companies/              — Tracked companies
      sources/                — Source management + manual fetch
      media/                  — Media contacts + pitch angles
      ingest/                 — Trigger full pipeline (GET for cron, POST)
      seed/                   — Idempotent seed for initial data
  components/robox-intel/     — React components for each tab
  lib/robox-intel/            — Ingestion pipeline
    fetchers.ts               — One module per source (6 automated in v1)
    pipeline.ts               — Orchestrator: fetch → dedup → score → store
    dedup.ts                  — SHA-256 hash of normalized URL + title
    scoring.ts                — Rule-based relevance scoring
    templates.ts              — Summary + suggested action templates
  types/robox-intel.ts        — Shared TypeScript types + UI constants
supabase/
  robox-intel-schema.sql      — Database schema for all 5 tables
```

## Automated sources

Fourteen fetchers run every 4 hours via `/api/robox-intel/ingest`:

PR wires (keyword-filtered for robotics keywords):
- **PR Newswire**, **Business Wire**, **GlobeNewsWire**, **Accesswire**

News:
- **Google News** — RSS for 6 robotics-training-data search queries
- **The Robot Report** — industry news, no filter
- **IEEE Spectrum Robotics** — filtered for training/data/learning
- **Import AI Newsletter** — filtered for robotics/embodied terms

Research:
- **arXiv cs.RO** — papers mentioning manipulation/VLA/egocentric

Funding:
- **Crunchbase News** — startup funding, keyword-filtered

Datasets:
- **Hugging Face** — robotics datasets + download volume
- **GitHub Trending** — repos across 5 topic filters (stars >50, recent)

Social:
- **Reddit** — r/robotics, r/MachineLearning, r/reinforcementlearning

Grants:
- **NSF Award Search** — federal grants > $500K, last 30 days

Still to wire (Phase 2 remainder):
- SAM.gov (DARPA), Google Scholar alerts, conference trackers

Manual sources (Twitter/X list, LinkedIn feed, podcasts, LinkedIn jobs,
conferences) are captured via the floating **Quick Add** button on the
Signals tab.

## LLM enhancement (Phase 3)

When `ANTHROPIC_API_KEY` is set, high-relevance signals get a richer
LLM-generated summary and suggested action via Claude Haiku. Falls back
to templates silently if the API call fails or the key isn't set.

## Zero-coverage detection

`/api/robox-intel/zero-coverage` runs hourly via cron. For press release
signals aged 4-72 hours, it searches Google News for any media pickup.
If none found, the signal is tagged `zero-coverage`, boosted to high
relevance, and gets a prefixed action line:
*"ZERO MEDIA COVERAGE — your outreach lands in an empty inbox."*

## Daily digest

`/api/robox-intel/digest` runs daily at 8 AM UTC. Builds HTML + plain
text of all high-priority new signals from the last 24h.

Configure sending by setting:
- `DIGEST_WEBHOOK_URL` — POST endpoint receiving `{to, subject, html, text}`
- `DIGEST_WEBHOOK_TOKEN` — optional Bearer token
- `DIGEST_RECIPIENT` — email address

Without these, `GET /api/robox-intel/digest` just returns the payload.
To preview without sending: `POST /api/robox-intel/digest?preview=true`.

## Analytics

`GET /api/robox-intel/analytics` returns 30-day stats: signals per day,
breakdowns by type/relevance/source/status, funnel (ingested → reviewed
→ actionable → acted), and time-to-action histogram.

The dashboard exposes this via the bar-chart icon in the header — opens
an Analytics modal with funnel, daily trend, type/relevance breakdowns,
time-to-action histogram, and top 10 sources.

## Slack notifications (Tier 1)

When `ROBOX_SLACK_WEBHOOK_URL` is set, every newly-ingested signal with
`relevance = 'high'` is posted to Slack. Zero-coverage boosts that change
a signal's relevance from non-high to high also fire a notification.

Use a standard Slack incoming webhook URL. No OAuth needed.

## Cross-signal company view

Click any company row in the Companies tab to jump to the Signals tab
filtered by that company. A pill at the top of the Signals list shows
the active filter and exposes a × to clear it.

## Trending companies

The Companies tab shows a "Trending" strip at the top with the 8
companies that accumulated the most signals in the last 14 days,
sorted by high-relevance count. Clicking a card filters the full
Companies table view to that company's signals.

`GET /api/robox-intel/trending` returns the raw data (top 20).

## CSV export

The Signals tab has an "Export CSV" link that downloads the currently
filtered set. Directly:

```
GET /api/robox-intel/export?format=csv&status=acted,queued&type=funding
```

Supports filters: `status`, `type`, `relevance`, `dateFrom`, and
`format=json` when you need machine-readable output.

## Bulk signal updates

```
PATCH /api/robox-intel/signals/bulk
{ "ids": [12, 34, 56], "status": "dismissed" }
```

Applies the same status/relevance/tags update to many signals in one
call. Automatically sets `acted_at` when status becomes `acted`.

## Relevance scoring

Signals are scored `high` / `medium` / `low` based on rules in
`lib/robox-intel/scoring.ts`. Highlights:

- Funding > $5M in robotics → **high**
- Hiring for data roles → **high**
- PR mentioning data + robotics → **high**
- Research paper mentioning egocentric + robot → **high**
- Competitor announcement → **high**
- Grant > $1M → **high**
- Tracked hot_lead/prospect company → **high**
- Default → **low**

Tune the rules based on 2 weeks of real data.

## Signal notes & history

Each signal can hold free-form notes (the triage person's own notes:
"outreach sent 2025-04-14", "waiting on intro"). Notes save on blur or
via a "Save" button. Changes append to `robox_signal_history`, shown
in a collapsible "+ HISTORY" panel on the expanded signal.

## Snooze

Snooze a signal for 1h / 4h / 1d / 3d / 1w. The `snoozed_until` column
is cleared automatically by the hourly `/api/robox-intel/maintenance`
job once the time has passed.

## Auto-archive

New signals untouched for `auto_archive_days` (default 30) get
auto-dismissed, so the "new" queue stays a live triage list. Threshold
configurable in Settings.

## Velocity alerts

When a tracked company gets ≥ `velocity_threshold` signals (default 3)
within `velocity_window_hours` (default 24), Slack gets a velocity
ping. De-duped: one alert per company per day.

## Keyboard shortcuts

On an expanded signal card:
- `n` / `r` / `q` / `a` — set status to new / reviewing / queued / acted
- `d` — dismiss (or reopen if already dismissed)
- `o` — open source link
- `Escape` — collapse

Global on the Signals tab:
- `/` — focus search

## Settings page (`/robox-intel/settings`)

Configures: auto-archive threshold, LLM toggle, velocity thresholds,
digest recipients. Also shows status of expected env vars (Resend,
Slack, Anthropic, SAM.gov).

## Digest preview (`/robox-intel/digest`)

See exactly what tomorrow's 8 AM digest looks like. HTML iframe +
plain-text toggle. One-click send to an override recipient list
for testing.

## Source config

The Sources tab shows a "Config" button on sources that accept
config JSON. Click to paste:
- **Google Scholar**: a list of Scholar alert RSS URLs (one per
  paper-of-interest you created an alert for).
- **Conferences**: a list of `{ name, url, selector? }` entries
  pointing at conference speaker pages.

The fetchers read `robox_sources.config` JSONB on every run.

## Still to do

- Relevance scoring tuning after 2 weeks of real data
- Per-source-type custom scoring rules (UI)

## Env vars reference

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | LLM summaries for high-relevance signals |
| `RESEND_API_KEY` | Daily digest sender (preferred) |
| `RESEND_FROM` | From address, default `digest@resend.dev` |
| `ROBOX_SLACK_WEBHOOK_URL` | Tier 1 + velocity alerts |
| `SAM_API_KEY` | SAM.gov grant fetcher |
| `DIGEST_WEBHOOK_URL` | Legacy digest sender |
| `DIGEST_RECIPIENT` | Legacy digest recipient |

Prefer Settings-page config when available; env vars only.
