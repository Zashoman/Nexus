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

## Cross-signal company view

Click any company row in the Companies tab to jump to the Signals tab
filtered by that company. A pill at the top of the Signals list shows
the active filter and exposes a × to clear it.

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

## Still to do

- SAM.gov / DARPA grant fetcher (the NSF fetcher is a good template)
- Google Scholar citation alerts for key papers (DROID, Open X-Embodiment, etc.)
- Semi-automated conference tracker (speaker/exhibitor lists)
- Slack notifications for Tier 1 signals (wiring to existing Slack lib)
- Relevance scoring tuning after 2 weeks of real data
