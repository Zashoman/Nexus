import { NextResponse } from 'next/server';
import { getMockSnapshot } from '../../../../lib/market/mock';
import { getMockQuestions } from '../../../../lib/mentor/mock';
import { store } from '../../../../lib/mock-store';

export const dynamic = 'force-dynamic';

export async function POST() {
  // Phase 1: regime comes from mock snapshot; questions from static bank.
  // Phase 2 will swap this for an Anthropic call that takes (regime, context,
  // last-30-sessions, ghost distribution) and returns N questions.
  const snap = getMockSnapshot();
  const questions = getMockQuestions(snap.regime);
  const draft = store.startSession(snap.regime, snap.regime_score, questions);

  return NextResponse.json({
    session_number: draft.session_number,
    regime: draft.regime,
    regime_score: draft.regime_score,
    questions: draft.questions,
  });
}
