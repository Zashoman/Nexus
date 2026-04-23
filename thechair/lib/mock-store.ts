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
    return this.watchlist.filter((w) => w.active);
  }

  addWatchlist(
    item: Omit<WatchlistItem, 'id' | 'added_at' | 'archived_at' | 'active'>
  ): WatchlistItem {
    const next: WatchlistItem = {
      ...item,
      id: this.nextWatchlistId++,
      added_at: new Date().toISOString(),
      archived_at: null,
      active: true,
    };
    this.watchlist.push(next);
    return next;
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

// Next.js dev hot-reload can reload this module. Stash on globalThis so in-memory
// state survives between reloads during development.
const g = globalThis as unknown as { __chairStore?: MockStore };
export const store = g.__chairStore ?? (g.__chairStore = new MockStore());
