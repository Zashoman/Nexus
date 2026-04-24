// In-memory store for Phase 1. Replaced by SQLite reads/writes in Phase 2+.
// Module-level singleton survives for the life of the dev server process,
// which is enough to exercise the UI flow end-to-end.

import type { Session, WatchlistItem, MentorQuestion, Regime } from './types';
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
  private watchlist: WatchlistItem[] = [
    {
      id: 1,
      ticker: 'AVGO',
      thesis: 'AI infra pull-forward + software accretion; custom silicon moat.',
      trigger_price: 165,
      invalidator: 'Custom silicon share loss or hyperscaler capex cut >15%.',
      entry_price: 200.0,
      entry_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      archived_at: null,
      active: true,
      price: 184.2,
      change_1d: -0.8,
      iv_rank: 42,
      drawdown_52w: -8.1,
      trigger_hit: false,
    },
    {
      id: 2,
      ticker: 'LRCX',
      thesis: 'WFE cycle troughing; memory capex recovery.',
      trigger_price: 720,
      invalidator: 'Memory capex pushed out another quarter in next guide.',
      entry_price: 880.0,
      entry_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      archived_at: null,
      active: true,
      price: 758.4,
      change_1d: -2.1,
      iv_rank: 66,
      drawdown_52w: -14.2,
      trigger_hit: false,
    },
    {
      id: 3,
      ticker: 'COIN',
      thesis: 'Vol-of-vol proxy; watch for stress-regime divergence.',
      trigger_price: 180,
      invalidator: 'BTC IV collapse to <50 sustained two weeks.',
      entry_price: 310.0,
      entry_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      archived_at: null,
      active: true,
      price: 212.1,
      change_1d: 3.4,
      iv_rank: 91,
      drawdown_52w: -22.7,
      trigger_hit: true,
    },
  ];
  private nextSessionNumber = 1;
  private nextWatchlistId = 4;

  constructor() {
    this.recomputeEntryDrawdowns();
  }

  private recomputeEntryDrawdowns(): void {
    for (const w of this.watchlist) {
      if (typeof w.price === 'number' && typeof w.entry_price === 'number' && w.entry_price > 0) {
        w.drawdown_from_entry = ((w.price - w.entry_price) / w.entry_price) * 100;
      } else {
        w.drawdown_from_entry = undefined;
      }
    }
  }

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
    if (!draft) {
      throw new Error(`No draft session #${sessionNumber}`);
    }
    const wordCount = answers.reduce(
      (n, a) => n + (a.trim() ? a.trim().split(/\s+/).length : 0),
      0
    );
    const read = getMockRead(draft.regime, answers);
    const session: Session = {
      id: sessionNumber,
      session_number: sessionNumber,
      created_at: draft.created_at,
      regime: draft.regime,
      regime_score: draft.regime_score,
      market_snapshot: getMockSnapshot(),
      questions: draft.questions,
      answers,
      mentor_read: read,
      word_count: wordCount,
      tags: deriveTags(answers),
      completed_at: new Date().toISOString(),
      backed_up_at: null,
    };
    this.sessions.push(session);
    this.drafts.delete(sessionNumber);
    return session;
  }

  listWatchlist(): WatchlistItem[] {
    this.recomputeEntryDrawdowns();
    return this.watchlist.filter((w) => w.active);
  }

  addWatchlist(
    item: Omit<
      WatchlistItem,
      'id' | 'added_at' | 'archived_at' | 'active' | 'entry_price' | 'entry_at' | 'drawdown_from_entry'
    > & { entry_price?: number | null; entry_at?: string | null }
  ): WatchlistItem {
    const now = new Date().toISOString();
    // If caller didn't provide entry_price, capture the current price as entry.
    const entryPrice =
      item.entry_price !== undefined && item.entry_price !== null
        ? item.entry_price
        : (item.price ?? null);
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
      added_at: now,
      archived_at: null,
      active: true,
    };
    this.watchlist.push(next);
    this.recomputeEntryDrawdowns();
    return next;
  }

  bulkAdd(
    items: Array<{
      ticker: string;
      thesis?: string;
      trigger_price?: number | null;
      invalidator?: string | null;
      entry_price?: number | null;
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
