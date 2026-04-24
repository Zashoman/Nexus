# The Chair — Living Spec Addendum

This file captures decisions made after the original BUILDSPEC. It supersedes
or extends the original where the two conflict.

---

## Drawdown Alert System (added 2026-04-24)

### Goal

Surface watchlist names that have fallen to one of the investor's
pre-committed buy-zone levels off their high-water mark. The investor's rule
is: at **−30% off the high**, buy. The other three levels bracket that
decision — heads-up before, deeper opportunity after.

### Levels

Four discrete drawdown thresholds, defined as percent below the high-water
mark (negative numbers; the system stores the magnitudes):

| Level | Meaning |
|-------|---------|
| **−25%** | Heads-up. Name is approaching the buy zone. |
| **−30%** | **Buy line.** Pre-committed action level. |
| **−35%** | Deeper opportunity. Either confidence in the thesis grows or it's already broken. |
| **−40%** | Severe. Either a generational entry or a thesis death. The mentor must force the investor to pick. |

Constants live in `lib/types.ts`:
```ts
export const DRAWDOWN_LEVELS = [25, 30, 35, 40] as const;
```

Changing the levels is a one-line edit. The UI, alert generator, and mentor
prompts all read from this constant.

### High-Water Mark

Per-name `high_water_mark` and `high_water_mark_at` columns on `watchlist`.

- **On add:** initialised to the current price (or to the price provided in
  the bulk-import payload). For names imported from an existing tracker,
  the user can pre-supply the actual recent high.
- **On every market poll:** if `current_price > high_water_mark`,
  ratchet the mark up and update the timestamp. The mark only moves up.
- **For Phase 3 (real market data):** the polling worker may instead seed
  `high_water_mark` from the trailing 52-week high on first observation,
  then ratchet from there.

### Drawdown Computation

On every watchlist read:
```
drawdown_from_high = (current_price − high_water_mark) / high_water_mark × 100
```
Always negative or zero. Stored as a signed percent in
`WatchlistItem.drawdown_from_high`.

### Trigger Semantics

A level is **triggered** when `drawdown_from_high <= −level`. Once triggered,
it stays triggered for the rest of the drawdown — there is no untrigger as the
price churns sideways. A new alert is **only emitted on the transition** from
not-triggered to triggered.

If a name recovers above a level (e.g. drawdown is −20% again, was −32%) and
later re-breaches, that re-breach IS a new alert. Implementation tracks this
by comparing the previous `levels_triggered` set on each refresh.

The deepest currently-active level is exposed as
`WatchlistItem.deepest_level`. The full active set is `levels_triggered`.

### Alerts Table

Schema (`lib/db/schema.sql`):
```sql
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlist(id),
  kind TEXT NOT NULL,           -- 'drawdown_level' | 'trigger_hit' | 'invalidator_hit'
  level INTEGER,                -- 25 | 30 | 35 | 40 when kind = 'drawdown_level'
  price REAL NOT NULL,
  drawdown_from_high REAL,
  captured_at TEXT NOT NULL,
  acknowledged_at TEXT
);
```

One row per actionable event. `acknowledged_at` is set to "now" when the user
dismisses, either individually or via "dismiss all" on the alerts banner.

### Notification Channels

Phase 1 (current): visual surface only — alerts banner on Home and a
coloured row in the watchlist tracker. The tab is meant to be open during
market hours.

Phase 3+: the polling worker writes alerts to SQLite. The UI auto-refreshes
every 30 seconds via SWR and surfaces new ones.

Phase 5+ (optional): macOS native notification via `node-notifier` or a
launchd-managed `osascript` shell-out. Not yet wired. Email / SMS are out
of scope for v1 — this is a personal tool that runs on the user's Mac.

### UI Surfaces

**Home page:**
- `AlertsBanner` (top, only visible when there's at least one unacknowledged
  drawdown alert): coloured pill per ticker, tinted by level. Click → goes
  to /watchlist. "Dismiss all" acknowledges every open alert.
- `WatchlistStrip` table: new **From High** column (the buy-zone signal,
  coloured by level — elevated/stressed/dislocation), new **Level** column
  with a pill showing the deepest active level, and a subtle row tint when
  any level is active.

**Watchlist tab:** unchanged for now. Will gain a "configure high-water mark"
inline editor in a follow-up so the user can correct the mark per name.

### Mentor Integration

The question generator (`lib/mentor/mock.ts` for Phase 1, the Anthropic call
for Phase 2+) treats a level breach as the highest-priority signal:

- **First question of every session** is about the deepest in-buy-zone name
  when one exists. Format: *"X crossed −30% off the high (now −32.4%, last
  $212.10). Your rule says you buy at this level. What is the action — buy,
  wait, or change the rule? Pick one."*
- **In Dislocation regime** with multiple names triggered, the second
  question asks the investor to pick which gets the conviction trade —
  forcing prioritisation rather than spread-out hesitation.

The four regime system prompts (`lib/mentor/prompts/*.ts`) all carry an
explicit `DRAWDOWN-LEVEL TRIGGER — HARD RULE` section so the Phase 2
Anthropic-backed mentor inherits this priority without code changes.

### API

| Method | Path | Purpose |
|--------|------|---------|
| `GET /api/alerts` | `?unacknowledged=true` | List recent alerts (default: all) |
| `POST /api/alerts` | `{id, action: 'acknowledge'}` or `{all: true, action: 'acknowledge'}` | Mark one or all alerts as seen |
| `GET /api/watchlist` | — | Returns enriched items including `drawdown_from_high`, `deepest_level`, `levels_triggered` |

### Future Refinements (deferred)

- **Per-name level overrides.** Some names should have tighter or wider
  thresholds — a low-vol industrial isn't the same as a hyper-growth name.
  Add `levels_override` JSON column to `watchlist` and let the configured
  thresholds replace the global default per name.
- **Time-in-zone tracking.** A name that's been at −30% for 4 weeks is a
  different question than one that just crossed today. Track the
  `crossed_at` timestamp per active level so the mentor can cite duration.
- **Volume-of-distance.** Cross weighted by daily volume so a high-volume
  capitulation move into the level is treated differently from a slow drift.
