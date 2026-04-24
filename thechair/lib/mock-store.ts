// In-memory store for Phase 1. Replaced by SQLite reads/writes in Phase 2+.

import type {
  Session,
  WatchlistItem,
  MentorQuestion,
  Regime,
  Alert,
  DrawdownLevel,
} from './types';
import { DRAWDOWN_LEVELS } from './types';
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
  private nextWatchlistId = 4;
  private watchlist: WatchlistItem[] = [
    {
      id: 1,
      ticker: 'AVGO',
      thesis: 'AI infra pull-forward + software accretion; custom silicon moat.',
      trigger_price: 165,
      invalidator: 'Custom silicon share loss or hyperscaler capex cut >15%.',
      entry_price: 200.0,
      entry_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      high_water_mark: 220.0,
      high_water_mark_at: new Date(Date.now() - 86400000 * 22).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      archived_at: null,
      active: true,
      price: 184.2,
      change_1d: -0.8,
      iv_rank: 42,
      drawdown_52w: -16.3,
    },
    {
      id: 2,
      ticker: 'LRCX',
      thesis: 'WFE cycle troughing; memory capex recovery.',
      trigger_price: 720,
      invalidator: 'Memory capex pushed out another quarter in next guide.',
      entry_price: 880.0,
      entry_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      high_water_mark: 1080.0,
      high_water_mark_at: new Date(Date.now() - 86400000 * 75).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      archived_at: null,
      active: true,
      price: 758.4,
      change_1d: -2.1,
      iv_rank: 66,
      drawdown_52w: -29.8,
    },
    {
      id: 3,
      ticker: 'COIN',
      thesis: 'Vol-of-vol proxy; watch for stress-regime divergence.',
      trigger_price: 180,
      invalidator: 'BTC IV collapse to <50 sustained two weeks.',
      entry_price: 310.0,
      entry_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      high_water_mark: 350.0,
      high_water_mark_at: new Date(Date.now() - 86400000 * 18).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      archived_at: null,
      active: true,
      price: 212.1,
      change_1d: 3.4,
      iv_rank: 91,
      drawdown_52w: -39.4,
    },
  ];

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
          ? DRAWDOWN_LEVELS.filter((lvl) => dd <= -lvl)
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

const g = globalThis as unknown as { __chairStore?: MockStore };
export const store = g.__chairStore ?? (g.__chairStore = new MockStore());
