import { NextResponse } from 'next/server';
import { getMockSnapshot } from '../../../../lib/market/mock';
import { getMockQuestions } from '../../../../lib/mentor/mock';
import { store } from '../../../../lib/mock-store';

export const dynamic = 'force-dynamic';

export async function POST() {
  // Phase 1: regime comes from the mock snapshot; questions are generated
  // against the live watchlist so the session is anchored on the names the
  // user is actually tracking. Phase 2 swaps this for an Anthropic call that
  // takes the same inputs + recent session history + ghost tag distribution.
  const snap = getMockSnapshot();
  const watchlist = store.listWatchlist();
  const questions = getMockQuestions(snap.regime, watchlist);
  const draft = store.startSession(snap.regime, snap.regime_score, questions);

  return NextResponse.json({
    session_number: draft.session_number,
    regime: draft.regime,
    regime_score: draft.regime_score,
    questions: draft.questions,
  });
}
