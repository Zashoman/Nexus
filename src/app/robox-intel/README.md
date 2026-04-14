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

## Automated sources (Phase 1)

The following six fetchers are wired up and run every 4 hours:

- **PR Newswire** — technology press releases, keyword-filtered
- **Business Wire** — business press releases, keyword-filtered
- **Google News** — RSS search results for 6 robotics-data queries
- **arXiv cs.RO** — academic papers mentioning manipulation/VLA/egocentric
- **Crunchbase News** — startup funding coverage, keyword-filtered
- **The Robot Report** — industry news, no keyword filter (low volume)

Remaining sources from the spec (GlobeNewsWire, Accesswire, IEEE Spectrum,
Import AI, Hugging Face, GitHub, Reddit, NSF, SAM.gov, conferences) are
defined in the sources table with `status = 'not_connected'` and can be
wired up in Phase 2 by adding fetchers to `lib/robox-intel/fetchers.ts`.

Manual sources (Twitter/X list, LinkedIn feed, podcasts, LinkedIn jobs,
conferences) are captured via the floating **Quick Add** button on the
Signals tab.

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

## Phase 3 (not yet implemented)

- LLM-powered summaries and suggested actions (Anthropic SDK is already a
  dependency)
- Zero-coverage detection for PR wire signals
- Cross-signal company linking (click company → all signals)
- Daily email digest
- Slack notifications for Tier 1 signals
