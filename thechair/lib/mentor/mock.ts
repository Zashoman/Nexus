import type { MentorQuestion, MentorRead, Regime } from '../types';

const BANK: Record<Regime, MentorQuestion[]> = {
  calm: [
    {
      n: 1,
      text: 'The tape is quiet. What are you doing with that quiet today?',
      highlight_terms: ['quiet'],
    },
    {
      n: 2,
      text: 'Name one thesis you are holding too loosely. What would tightening it look like?',
      highlight_terms: ['too loosely'],
    },
  ],
  elevated: [
    {
      n: 1,
      text: 'VXN is at 24.3, third day up. What does that number make you feel, before you rationalize it?',
      highlight_terms: ['24.3', 'third day up'],
    },
    {
      n: 2,
      text: 'Dealer gamma flipped negative. Which names on your list are you touching first when it gets worse?',
      highlight_terms: ['Dealer gamma flipped negative'],
    },
    {
      n: 3,
      text: 'You wrote "waiting for confirmation" four times in the last ten sessions. What would confirmation look like today, specifically?',
      highlight_terms: ['waiting for confirmation'],
    },
    {
      n: 4,
      text: 'Which position on your sheet has the thinnest thesis right now? Say it out loud.',
      highlight_terms: ['thinnest thesis'],
    },
  ],
  stressed: [
    {
      n: 1,
      text: 'QQQ skew is flattening while the index falls. What does that combination usually mean to you, and are you seeing it?',
      highlight_terms: ['skew is flattening', 'index falls'],
    },
    {
      n: 2,
      text: 'Three names on your list are in >20% drawdowns. Read each thesis. Which one are you quietly no longer believing?',
      highlight_terms: ['>20% drawdowns', 'quietly no longer believing'],
    },
    {
      n: 3,
      text: 'You said "not yet" yesterday. What changes between "not yet" and "now" — and is any of it on the tape today?',
      highlight_terms: ['not yet', 'now'],
    },
    {
      n: 4,
      text: 'Implied correlation is 0.61. Your book assumes dispersion. What happens if that is wrong for two more weeks?',
      highlight_terms: ['0.61'],
    },
    {
      n: 5,
      text: 'Name the one thing you are watching that, if it moves, changes your posture by end of week.',
      highlight_terms: ['changes your posture'],
    },
  ],
  dislocation: [
    {
      n: 1,
      text: 'Things are moving without reason. Which of your names is down >15% on nothing? Pull up the thesis. Does it still work?',
      highlight_terms: ['>15%', 'on nothing'],
    },
    {
      n: 2,
      text: 'Dealer gamma is −$1.2B. This is the environment you have been waiting for. Are you executing the plan you wrote for this moment, or are you watching?',
      highlight_terms: ['−$1.2B', 'waiting for'],
    },
    {
      n: 3,
      text: 'Which trigger on your sheet hit today, and why have you not acted on it?',
      highlight_terms: ['hit today'],
    },
    {
      n: 4,
      text: 'Write the next 24 hours as if you have already acted. What did you do at the open?',
      highlight_terms: ['at the open'],
    },
    {
      n: 5,
      text: 'Your last five sessions in stressed regimes ended with "waiting." What is different today?',
      highlight_terms: ['"waiting"'],
    },
    {
      n: 6,
      text: 'Name the number — the level on QQQ or a specific name — where you stop asking questions and act.',
      highlight_terms: ['stop asking questions and act'],
    },
    {
      n: 7,
      text: 'What would Stan say if he were reading your last three entries back to you?',
      highlight_terms: ['three entries'],
    },
  ],
};

export function getMockQuestions(regime: Regime): MentorQuestion[] {
  return BANK[regime];
}

export function getMockRead(regime: Regime, answers: string[]): MentorRead {
  const wordCount = answers.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return {
    text:
      regime === 'dislocation'
        ? 'Heard you. Two patterns: the phrase "waiting" showed up again, and you named a level without committing to act on it. Watch for: whether tomorrow you move closer to that number or move it.'
        : regime === 'stressed'
          ? 'Clear read today. You are identifying stress honestly but hedging the action. Watch for: the word "confirmation" tomorrow — if it comes back, we have a pattern.'
          : regime === 'elevated'
            ? 'Posture is alert. The thinnest thesis admission was the real work of this session. Watch for: whether you revise it this week or quietly leave it.'
            : `Quiet session. ${wordCount} words. That is fine. Calm is when the list gets cleaned, not when trades get made.`,
    flagged_patterns: regime === 'stressed' || regime === 'dislocation' ? ['waiting'] : [],
    watch_for: regime === 'calm' ? 'thesis revisions this week' : 'action vs watching',
  };
}
