// In-memory store for Phase 1. Replaced by SQLite reads/writes in Phase 2+.

import type {
  Session,
  WatchlistItem,
  MentorQuestion,
  Regime,
  Alert,
  DrawdownLevel,
} from './types';
import { DEFAULT_DRAWDOWN_LEVELS } from './types';
import { getMockRead } from './mentor/mock';
import { getMockSnapshot } from './market/mock';

interface DraftSession {
  session_number: number;
  regime: Regime;
  regime_score: number;
  questions: MentorQuestion[];
  created_at: string;
}

class MockStore {
  private sessions: Session[] = [];
  private drafts = new Map<number, DraftSession>();
  private alerts: Alert[] = [];
  private nextAlertId = 1;
  private nextSessionNumber = 1;
  private nextWatchlistId = 100;
  private drawdownLevels: number[] = [...DEFAULT_DRAWDOWN_LEVELS];
  private watchlist: WatchlistItem[] = buildSeedWatchlist();

  constructor() {
    // Apply enrichment + emit alerts for any current level breaches in mock data.
    this.refreshDerived({ emitAlerts: true });
  }

  // ---- Drawdown / level computation -------------------------------------

  private refreshDerived(opts: { emitAlerts: boolean }): void {
    for (const w of this.watchlist) {
      // since-entry
      w.drawdown_from_entry =
        typeof w.price === 'number' && typeof w.entry_price === 'number' && w.entry_price > 0
          ? ((w.price - w.entry_price) / w.entry_price) * 100
          : undefined;

      // high-water mark may need to ratchet up
      if (typeof w.price === 'number' && typeof w.high_water_mark === 'number') {
        if (w.price > w.high_water_mark) {
          w.high_water_mark = w.price;
          w.high_water_mark_at = new Date().toISOString();
        }
      }

      // from-high
      w.drawdown_from_high =
        typeof w.price === 'number' &&
        typeof w.high_water_mark === 'number' &&
        w.high_water_mark > 0
          ? ((w.price - w.high_water_mark) / w.high_water_mark) * 100
          : undefined;

      // trigger_hit (user-defined trigger_price)
      w.trigger_hit =
        typeof w.price === 'number' && typeof w.trigger_price === 'number'
          ? w.price <= w.trigger_price
          : false;

      // levels_triggered: which of {25,30,35,40} is the drawdown >= ?
      const dd = w.drawdown_from_high;
      const previously = ((): DrawdownLevel[] => {
        // We persist a parallel `__levels` so we can tell what's NEW this refresh.
        return ((w as unknown as { __levels?: DrawdownLevel[] }).__levels ?? []).slice();
      })();

      const nowActive: DrawdownLevel[] =
        typeof dd === 'number'
          ? this.drawdownLevels.filter((lvl) => dd <= -lvl)
          : [];

      w.levels_triggered = nowActive;
      w.deepest_level = nowActive.length ? nowActive[nowActive.length - 1] : undefined;

      if (opts.emitAlerts) {
        const previouslySet = new Set(previously);
        for (const lvl of nowActive) {
          if (!previouslySet.has(lvl)) {
            this.alerts.push({
              id: this.nextAlertId++,
              watchlist_id: w.id,
              ticker: w.ticker,
              kind: 'drawdown_level',
              level: lvl,
              price: w.price ?? 0,
              drawdown_from_high: dd,
              captured_at: new Date().toISOString(),
              acknowledged_at: null,
            });
          }
        }
      }
      (w as unknown as { __levels?: DrawdownLevel[] }).__levels = nowActive.slice();
    }
  }

  // ---- Sessions ---------------------------------------------------------

  listSessions(): Session[] {
    return [...this.sessions].sort((a, b) => b.session_number - a.session_number);
  }

  getSession(n: number): Session | undefined {
    return this.sessions.find((s) => s.session_number === n);
  }

  startSession(regime: Regime, score: number, questions: MentorQuestion[]): DraftSession {
    const draft: DraftSession = {
      session_number: this.nextSessionNumber++,
      regime,
      regime_score: score,
      questions,
      created_at: new Date().toISOString(),
    };
    this.drafts.set(draft.session_number, draft);
    return draft;
  }

  completeSession(sessionNumber: number, answers: string[]): Session {
    const draft = this.drafts.get(sessionNumber);
    if (!draft) throw new Error(`No draft session #${sessionNumber}`);
    const wordCount = answers.reduce(
      (n, a) => n + (a.trim() ? a.trim().split(/\s+/).length : 0),
      0
    );
    const session: Session = {
      id: sessionNumber,
      session_number: sessionNumber,
      created_at: draft.created_at,
      regime: draft.regime,
      regime_score: draft.regime_score,
      market_snapshot: getMockSnapshot(),
      questions: draft.questions,
      answers,
      mentor_read: getMockRead(draft.regime, answers),
      word_count: wordCount,
      tags: deriveTags(answers),
      completed_at: new Date().toISOString(),
      backed_up_at: null,
    };
    this.sessions.push(session);
    this.drafts.delete(sessionNumber);
    return session;
  }

  // ---- Watchlist --------------------------------------------------------

  listWatchlist(): WatchlistItem[] {
    this.refreshDerived({ emitAlerts: false });
    return this.watchlist.filter((w) => w.active);
  }

  addWatchlist(
    item: Omit<
      WatchlistItem,
      | 'id'
      | 'added_at'
      | 'archived_at'
      | 'active'
      | 'entry_price'
      | 'entry_at'
      | 'high_water_mark'
      | 'high_water_mark_at'
      | 'drawdown_from_entry'
      | 'drawdown_from_high'
      | 'levels_triggered'
      | 'deepest_level'
    > & {
      entry_price?: number | null;
      entry_at?: string | null;
      high_water_mark?: number | null;
      high_water_mark_at?: string | null;
    }
  ): WatchlistItem {
    const now = new Date().toISOString();
    const entryPrice =
      item.entry_price !== undefined && item.entry_price !== null
        ? item.entry_price
        : (item.price ?? null);
    const high =
      item.high_water_mark !== undefined && item.high_water_mark !== null
        ? item.high_water_mark
        : (item.price ?? entryPrice ?? null);
    const next: WatchlistItem = {
      id: this.nextWatchlistId++,
      ticker: item.ticker,
      thesis: item.thesis,
      trigger_price: item.trigger_price,
      invalidator: item.invalidator,
      price: item.price,
      change_1d: item.change_1d,
      iv_rank: item.iv_rank,
      drawdown_52w: item.drawdown_52w,
      trigger_hit: item.trigger_hit,
      entry_price: entryPrice,
      entry_at: entryPrice !== null ? (item.entry_at ?? now) : null,
      high_water_mark: high,
      high_water_mark_at: high !== null ? (item.high_water_mark_at ?? now) : null,
      levels_triggered: [],
      added_at: now,
      archived_at: null,
      active: true,
    };
    this.watchlist.push(next);
    this.refreshDerived({ emitAlerts: true });
    return next;
  }

  bulkAdd(
    items: Array<{
      ticker: string;
      thesis?: string;
      trigger_price?: number | null;
      invalidator?: string | null;
      entry_price?: number | null;
      high_water_mark?: number | null;
      price?: number | null;
    }>
  ): { added: number; skipped: string[] } {
    const existing = new Set(
      this.watchlist.filter((w) => w.active).map((w) => w.ticker.toUpperCase())
    );
    const skipped: string[] = [];
    let added = 0;
    for (const it of items) {
      const ticker = it.ticker.trim().toUpperCase();
      if (!ticker) continue;
      if (existing.has(ticker)) {
        skipped.push(ticker);
        continue;
      }
      this.addWatchlist({
        ticker,
        thesis: it.thesis ?? '(thesis not yet written)',
        trigger_price: it.trigger_price ?? null,
        invalidator: it.invalidator ?? null,
        entry_price: it.entry_price ?? it.price ?? null,
        high_water_mark: it.high_water_mark ?? null,
        price: it.price ?? undefined,
      });
      existing.add(ticker);
      added++;
    }
    return { added, skipped };
  }

  updateWatchlist(
    id: number,
    patch: Partial<
      Pick<
        WatchlistItem,
        | 'thesis'
        | 'trigger_price'
        | 'invalidator'
        | 'entry_price'
        | 'high_water_mark'
      >
    >
  ): WatchlistItem | null {
    const idx = this.watchlist.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    const current = this.watchlist[idx];
    const now = new Date().toISOString();
    this.watchlist[idx] = {
      ...current,
      thesis: patch.thesis ?? current.thesis,
      trigger_price:
        patch.trigger_price !== undefined ? patch.trigger_price : current.trigger_price,
      invalidator:
        patch.invalidator !== undefined ? patch.invalidator : current.invalidator,
      entry_price:
        patch.entry_price !== undefined ? patch.entry_price : current.entry_price,
      entry_at:
        patch.entry_price !== undefined && patch.entry_price !== null
          ? (current.entry_at ?? now)
          : current.entry_at,
      high_water_mark:
        patch.high_water_mark !== undefined
          ? patch.high_water_mark
          : current.high_water_mark,
      high_water_mark_at:
        patch.high_water_mark !== undefined && patch.high_water_mark !== null
          ? now
          : current.high_water_mark_at,
    };
    this.refreshDerived({ emitAlerts: true });
    return this.watchlist[idx];
  }

  archiveWatchlist(id: number): boolean {
    const idx = this.watchlist.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    this.watchlist[idx] = {
      ...this.watchlist[idx],
      active: false,
      archived_at: new Date().toISOString(),
    };
    return true;
  }

  // ---- Alerts -----------------------------------------------------------

  listAlerts(opts: { unacknowledgedOnly?: boolean } = {}): Alert[] {
    const rows = opts.unacknowledgedOnly
      ? this.alerts.filter((a) => a.acknowledged_at === null)
      : this.alerts;
    return [...rows].sort(
      (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
    );
  }

  acknowledgeAlert(id: number): boolean {
    const idx = this.alerts.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.alerts[idx] = {
      ...this.alerts[idx],
      acknowledged_at: new Date().toISOString(),
    };
    return true;
  }

  // ---- Settings --------------------------------------------------------

  getDrawdownLevels(): number[] {
    return [...this.drawdownLevels];
  }

  setDrawdownLevels(levels: number[]): number[] {
    // Require all positive, distinct, sorted ascending (stored as magnitudes).
    const cleaned = [...new Set(levels.filter((n) => n > 0 && n < 100))].sort(
      (a, b) => a - b
    );
    if (cleaned.length === 0) throw new Error('must provide at least one level');
    this.drawdownLevels = cleaned;
    // Recompute — a tighter threshold may fire alerts on existing names.
    this.refreshDerived({ emitAlerts: true });
    return [...this.drawdownLevels];
  }

  acknowledgeAllAlerts(): number {
    const now = new Date().toISOString();
    let n = 0;
    for (const a of this.alerts) {
      if (a.acknowledged_at === null) {
        a.acknowledged_at = now;
        n++;
      }
    }
    return n;
  }
}

function deriveTags(answers: string[]): string[] {
  const text = answers.join(' ').toLowerCase();
  const tags: string[] = [];
  if (/\bwait(ing)?\b/.test(text)) tags.push('waiting');
  if (/confirm(ation)?/.test(text)) tags.push('waiting_for_confirmation');
  if (/not yet/.test(text)) tags.push('not_yet');
  if (/convic(tion|ted)/.test(text)) tags.push('conviction');
  if (/trim|cut|reduce/.test(text)) tags.push('reducing');
  if (/add|build|layer/.test(text)) tags.push('adding');
  return tags;
}

// ---- Seed -----------------------------------------------------------------
// The initial watchlist matches the investor's real tracker (screens shared
// 2026-04-24). Prices and daily % are from those screenshots. Entry prices
// and high-water marks are intentionally null — Phase 1 cannot invent them.
// The investor can fill highs / entries / theses inline on the /watchlist
// page; Phase 3 polling will also backfill 52-week highs automatically.

interface SeedRow {
  ticker: string;
  price: number;
  change_1d: number;
}

const SEED_ROWS: SeedRow[] = [
  // Screen 1
  { ticker: 'SNDK', price: 932.43, change_1d: -4.76 },
  { ticker: '005930', price: 217500, change_1d: -3.12 },   // Samsung Electronics (KRW)
  { ticker: 'TSM', price: 382.66, change_1d: -1.23 },
  { ticker: '3110', price: 27560, change_1d: 7.87 },       // JPY
  { ticker: '4063', price: 6787, change_1d: 1.85 },        // Shin-Etsu Chemical (JPY)
  { ticker: '4186', price: 9147, change_1d: 2.86 },        // Tokyo Ohka Kogyo (JPY)
  { ticker: 'BESI', price: 241.8, change_1d: 4.09 },
  { ticker: '042700', price: 293500, change_1d: 0.00 },    // Hanmi Semiconductor (KRW)
  { ticker: 'VRT', price: 321.75, change_1d: 5.44 },
  { ticker: 'NVT', price: 142.76, change_1d: 1.88 },
  { ticker: 'LRCX', price: 258.56, change_1d: -2.63 },
  { ticker: 'FORM', price: 148.37, change_1d: 1.50 },
  { ticker: '6855', price: 6460, change_1d: 1.73 },        // JPY
  { ticker: 'VICR', price: 260.13, change_1d: -1.84 },
  // Screen 2
  { ticker: 'ASML', price: 1417.80, change_1d: -1.79 },
  { ticker: 'BE', price: 237.57, change_1d: 3.40 },
  { ticker: 'CCJ', price: 123.85, change_1d: -2.07 },
  { ticker: 'GEV', price: 1149.53, change_1d: 1.95 },
  { ticker: 'ETN', price: 424.50, change_1d: 2.57 },
  { ticker: 'EQT', price: 58.93, change_1d: 0.36 },
  { ticker: 'SEI', price: 69.48, change_1d: 5.00 },
  { ticker: 'POWL', price: 252.18, change_1d: 3.88 },
  { ticker: 'IREN', price: 52.02, change_1d: 7.50 },
  { ticker: 'LITE', price: 846.89, change_1d: -3.06 },
  { ticker: 'COHR', price: 337.68, change_1d: -3.65 },
  { ticker: 'MRVL', price: 165.56, change_1d: 5.24 },
  { ticker: 'GLW', price: 169.50, change_1d: 0.44 },
  { ticker: '5803', price: 6009, change_1d: 1.97 },        // Fujikura (JPY)
  { ticker: '000660', price: 1203000, change_1d: -1.80 },  // SK Hynix (KRW)
  { ticker: 'MU', price: 481.72, change_1d: -1.18 },
];

function buildSeedWatchlist(): WatchlistItem[] {
  const addedAt = new Date().toISOString();
  return SEED_ROWS.map((r, i) => ({
    id: i + 1,
    ticker: r.ticker,
    thesis: '(thesis not yet written)',
    trigger_price: null,
    invalidator: null,
    entry_price: null,
    entry_at: null,
    high_water_mark: null,
    high_water_mark_at: null,
    added_at: addedAt,
    archived_at: null,
    active: true,
    price: r.price,
    change_1d: r.change_1d,
    iv_rank: undefined,
    drawdown_52w: undefined,
    levels_triggered: [],
  }));
}

const g = globalThis as unknown as { __chairStore?: MockStore };
export const store = g.__chairStore ?? (g.__chairStore = new MockStore());
