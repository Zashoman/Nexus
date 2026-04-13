# Nexus Bug Testing Report
**Date:** 2026-04-13
**Scope:** Full application audit across 53 API routes, 30+ components, 9 pages

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 1 | 3 | 11 | 4 |
| Error Handling | 4 | 8 | 55 | 15 |
| State Management | 0 | 0 | 4 | 13 |
| Database Patterns | 1 | 3 | 10 | 6 |
| **Totals** | **6** | **14** | **80** | **38** |

### Fixes Applied This Session
- Race conditions in Intel DetailPanel and Drones DroneDetailPanel (MEDIUM)
- Finnhub API key moved from client bundle to server proxy (HIGH)
- Security headers middleware added (MEDIUM)
- Playwright test suite: 16 test files, ~160 test cases

---

## CRITICAL Issues (6)

### 1. No authentication on 30+ state-changing API routes
**Impact:** Anyone who discovers the URLs can read/write all data and burn Anthropic API credits.
**Affected:** All `/api/intel/*`, `/api/youtube/*`, `/api/telegram/*`, `/api/dashboard/*`, `/api/journal/*`, `/api/migrate/*` endpoints.
**Only protected:** `/api/re/*` write endpoints (proper bearer token auth).
**Fix:** Add auth middleware or shared bearer token check to all state-changing routes. Priority: AI-calling endpoints (summarize, deep-analysis, red-team, synthesis, hormuz, journal/analyze).

### 2. Unvalidated request body spread into database (5 routes)
**Impact:** Attacker can overwrite arbitrary database columns.
**Files:**
- `api/intel/beliefs/route.ts` PUT: `const { id, ...updates } = body` -> `.update(updates)`
- `api/intel/sources/route.ts` PUT: same pattern
- `api/re/weekly/route.ts` POST: `{ ...body, created_by }` -> `.upsert()`
- `api/re/monthly/route.ts` POST and PUT: same pattern
**Fix:** Whitelist allowed fields in each handler instead of spreading body.

### 3. No rate limiting on Claude API endpoints (8 endpoints)
**Impact:** A bot could trigger hundreds of concurrent API calls, running up costs.
**Affected:** summarize, deep-analysis, weekly-synthesis, monthly-synthesis, red-team, hormuz POST, youtube/summarize, journal/analyze.
**Fix:** Add per-IP rate limiting or simple in-memory throttle.

### 4. exec_sql RPC function exists (migration endpoint)
**Impact:** If the `exec_sql` RPC is accessible via anon key, it's a SQL injection vector.
**File:** `api/migrate/route.ts` - no authentication, calls `db.rpc('exec_sql')`.
**Fix:** Delete the migration endpoint and the RPC function from Supabase.

---

## HIGH Issues (14)

### Security
1. **Finnhub API key in client bundle** -> FIXED: moved to server proxy `/api/intel/stock-quotes`
2. **No CSRF protection on any endpoint** -> Mitigated by Bearer token auth where present; other routes need auth first
3. **SSRF risk in deep-analysis** -> `fetchFullArticle()` fetches arbitrary URLs from DB. Add URL validation (block internal IPs).

### Error Handling
4. **No top-level try/catch on 15+ API handlers** -> Unhandled exceptions return raw 500s with no JSON body. Add try/catch wrapper.
5. **Empty catch blocks in 8 files** -> `catch {}` swallows errors silently in stocks, geo, rates, commodities, credit-index, credit-bdc, hormuz, telegram/feed. Add `console.error` at minimum.
6. **intel/rate handler crash** -> `updateFilterProfile()` not wrapped in try/catch; crashes whole request.
7. **intel/velocity partial update** -> Loop updates beliefs without error checking; if one fails, rest are skipped.
8. **dashboard/demand-destruction crash** -> `Promise.all` with external APIs has no try/catch.
9. **dashboard/hormuz AI scoring silent failure** -> Anthropic call fails silently, returns fake scores based on defaults.
10. **dashboard/private-credit crash** -> Same `Promise.all` no-try-catch pattern.

### Database
11. **Rating delete-then-insert race** -> `intel/rate/route.ts` deletes all ratings then re-inserts; error between = lost data. Use upsert.
12. **N+1 queries in ingestion** -> youtube/refresh, telegram/feed, intel/fetch each do 2 queries per item. Batch with `.in()`.
13. **All API routes bypass RLS** -> Every route uses service role key. RLS is effectively unused.

### State Management
14. **Dashboard header/tab fetch race** -> Both write to same state variables with stale closure guards.

---

## MEDIUM Issues (selected highlights)

### Security
- Telegram webhook has no secret verification (spoofable)
- Cron auth bypassed in non-production environments
- Debug endpoint leaks API key configuration status
- Error messages leak DB schema and env var names
- Supabase session stored in localStorage (XSS-accessible)

### Error Handling (systemic patterns)
- 25+ handlers call `req.json()` without try/catch (malformed JSON crashes handler)
- 8 files use `process.env.ANTHROPIC_API_KEY!` non-null assertion (opaque errors if missing)
- 0 Anthropic API calls have AbortSignal/timeout (can hang until Vercel kills the function)
- Multiple `parseInt` on query params without NaN validation

### Database
- `intel_filter_profile` SELECT-then-INSERT race condition (use upsert)
- `intel_belief_evidence` can be double-inserted (add unique constraint)
- `re_monthly_data` uses INSERT not upsert (duplicate month fails)
- 24+ Supabase operations don't check `{ error }` return
- 5 uses of `.single()` where record might not exist (should be `.maybeSingle()`)
- 49 queries use `select('*')` when subset would suffice
- 12 queries have no `.limit()` (unbounded growth risk)

### State Management
- Intel DetailPanel auto-summarize race condition -> FIXED
- Drones DroneDetailPanel auto-summarize race condition -> FIXED
- StockTicker fetch has no AbortController on unmount
- YouTube refresh timeout can clear new result message
- FT page refetches all items on tab change instead of filtering client-side

---

## Playwright Test Suite

**16 test files written, ~160 test cases total.** Run with:

```bash
npx playwright install chromium
npx playwright test
```

| File | Section | Tests |
|------|---------|-------|
| 01-smoke.spec.ts | Smoke Testing | 17 |
| 02-forms.spec.ts | Form Validation | 5 |
| 03-auth.spec.ts | Auth & Session | 5 |
| 04-navigation.spec.ts | Navigation & Routing | 19 |
| 05-crud.spec.ts | CRUD Operations | 6 |
| 06-data-display.spec.ts | Data Display | 8 |
| 07-api-errors.spec.ts | API Error Handling | 7 |
| 08-responsive.spec.ts | Responsive Design | 9 |
| 09-cross-browser.spec.ts | Cross-browser | 9 |
| 10-performance.spec.ts | Performance | 10 |
| 11-security.spec.ts | Security | 7+ |
| 12-accessibility.spec.ts | Accessibility | 10+ |
| 13-state.spec.ts | State Management | 5+ |
| 14-modals.spec.ts | Modals & Overlays | 6+ |
| 15-files.spec.ts | File Operations | 3+ |
| 16-edge-cases.spec.ts | Edge Cases | 15+ |

---

## Fixes Applied This Session

| Fix | Severity | Status |
|-----|----------|--------|
| Intel DetailPanel race condition | MEDIUM | Deployed |
| Drones DroneDetailPanel race condition | MEDIUM | Deployed |
| Finnhub API key moved server-side | HIGH | Deployed |
| Security headers middleware | MEDIUM | Deployed |
| Server proxy for stock quotes | HIGH | Deployed |

---

## Recommended Fix Priority (Next Steps)

1. **Add auth to all API routes** (CRITICAL, ~2 hours) - Simple bearer token middleware
2. **Whitelist fields in PUT/POST handlers** (CRITICAL, ~1 hour) - 5 files
3. **Delete /api/migrate endpoint** (CRITICAL, 5 minutes)
4. **Add try/catch wrappers to all handlers** (HIGH, ~2 hours) - 15+ files
5. **Replace empty catch blocks with console.error** (HIGH, ~30 min) - 8 files
6. **Add AbortSignal to all Anthropic calls** (MEDIUM, ~1 hour) - 8 files
7. **Fix rating delete-then-insert to use upsert** (HIGH, ~30 min)
8. **Add Telegram webhook secret verification** (MEDIUM, ~30 min)
9. **Batch N+1 queries in ingestion loops** (HIGH, ~2 hours)
10. **Add req.json() try/catch utility** (MEDIUM, ~1 hour) - 25+ handlers
