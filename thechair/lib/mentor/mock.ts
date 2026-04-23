import type {
  MentorQuestion,
  MentorRead,
  Regime,
  WatchlistItem,
} from '../types';

// ---------- Name picker ----------
// Pull out the watchlist entries that deserve questions today. A good session
// puts the investor face-to-face with the names moving or drifting from plan,
// not with metrics that already live on the Home tab.

interface SalientNames {
  biggestDrawdown: WatchlistItem | null;
  triggerHit: WatchlistItem | null;
  biggestMoveDown: WatchlistItem | null;
  biggestMoveUp: WatchlistItem | null;
  nearTrigger: WatchlistItem | null;  // within 5% of trigger, not yet hit
  oldestOnList: WatchlistItem | null; // on the list longest — has the thesis gone stale?
  highIV: WatchlistItem | null;       // IV rank >= 80
}

function pickSalient(watchlist: WatchlistItem[]): SalientNames {
  const active = watchlist.filter((w) => w.active);
  if (active.length === 0) {
    return {
      biggestDrawdown: null,
      triggerHit: null,
      biggestMoveDown: null,
      biggestMoveUp: null,
      nearTrigger: null,
      oldestOnList: null,
      highIV: null,
    };
  }
  const byDrawdown = [...active].sort(
    (a, b) => (a.drawdown_52w ?? 0) - (b.drawdown_52w ?? 0)
  );
  const byMove = [...active].sort(
    (a, b) => (a.change_1d ?? 0) - (b.change_1d ?? 0)
  );
  const byAge = [...active].sort(
    (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
  );
  const triggerHit = active.find((w) => w.trigger_hit) ?? null;
  const nearTrigger = active
    .filter((w) => {
      if (w.trigger_hit) return false;
      if (typeof w.price !== 'number' || typeof w.trigger_price !== 'number') return false;
      return Math.abs((w.price - w.trigger_price) / w.trigger_price) <= 0.05;
    })
    .sort((a, b) => {
      const da = Math.abs((a.price! - a.trigger_price!) / a.trigger_price!);
      const db = Math.abs((b.price! - b.trigger_price!) / b.trigger_price!);
      return da - db;
    })[0] ?? null;
  const highIV = active.find((w) => (w.iv_rank ?? 0) >= 80) ?? null;
  return {
    biggestDrawdown: byDrawdown[0] ?? null,
    triggerHit,
    biggestMoveDown: byMove[0] && (byMove[0].change_1d ?? 0) < 0 ? byMove[0] : null,
    biggestMoveUp:
      byMove[byMove.length - 1] && (byMove[byMove.length - 1].change_1d ?? 0) > 0
        ? byMove[byMove.length - 1]
        : null,
    nearTrigger,
    oldestOnList: byAge[0] ?? null,
    highIV,
  };
}

function daysOn(item: WatchlistItem): number {
  return Math.floor((Date.now() - new Date(item.added_at).getTime()) / 86400000);
}

function fmtPrice(p?: number): string {
  return typeof p === 'number' ? `$${p.toFixed(2)}` : '—';
}
function fmtPct(p?: number): string {
  if (typeof p !== 'number') return '';
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
}

// ---------- Question generation ----------
// The subject of a session is the watchlist. The regime dials up tone and
// question count, but the lens stays on "what is the plan for these names?"

export function getMockQuestions(
  regime: Regime,
  watchlist: WatchlistItem[] = []
): MentorQuestion[] {
  const s = pickSalient(watchlist);
  const qs: MentorQuestion[] = [];
  let n = 1;
  const push = (text: string, highlight_terms: string[] = []) => {
    qs.push({ n: n++, text, highlight_terms });
  };

  // Questions are selected per-regime. Each regime gets 2-8 questions, almost
  // all focused on names + plan. One metric-flavored prompt is allowed in
  // Stressed/Dislocation as grounding, not as the spine.

  if (regime === 'calm') {
    // 2 questions — keep it quiet. Focus on list hygiene and the plan.
    if (s.oldestOnList) {
      push(
        `${s.oldestOnList.ticker} has been on the list ${daysOn(s.oldestOnList)} days. What are you waiting for, exactly — name it in one sentence.`,
        [s.oldestOnList.ticker, 'waiting for', 'one sentence']
      );
    } else {
      push('The list is quiet. What would have to be true for you to add a name today?', ['have to be true']);
    }
    if (s.nearTrigger) {
      push(
        `${s.nearTrigger.ticker} is at ${fmtPrice(s.nearTrigger.price)}, inside 5% of your trigger. If it gets there tomorrow, what do you actually do?`,
        [s.nearTrigger.ticker, '5%', 'actually do']
      );
    } else {
      push(
        'Pick the thinnest thesis on the sheet. What would tightening it look like?',
        ['thinnest thesis']
      );
    }
    return qs;
  }

  if (regime === 'elevated') {
    // 3-4 questions — names moving, plan pressure.
    if (s.biggestMoveDown) {
      push(
        `${s.biggestMoveDown.ticker} is down ${Math.abs(s.biggestMoveDown.change_1d ?? 0).toFixed(1)}% today at ${fmtPrice(s.biggestMoveDown.price)}. Has your plan for it changed since yesterday?`,
        [s.biggestMoveDown.ticker, 'plan for it changed']
      );
    } else if (s.biggestDrawdown && (s.biggestDrawdown.drawdown_52w ?? 0) < -10) {
      push(
        `${s.biggestDrawdown.ticker} is in a ${Math.abs(s.biggestDrawdown.drawdown_52w ?? 0).toFixed(0)}% drawdown. Read the thesis. Does it still work?`,
        [s.biggestDrawdown.ticker, 'still work']
      );
    } else {
      push(
        'Look at the sheet. Which name moved today in a way that changes your plan?',
        ['changes your plan']
      );
    }

    if (s.nearTrigger) {
      push(
        `${s.nearTrigger.ticker} is ${fmtPct(((s.nearTrigger.price! - s.nearTrigger.trigger_price!) / s.nearTrigger.trigger_price!) * 100)} from trigger. What specifically has to happen for you to pull it?`,
        [s.nearTrigger.ticker, 'pull it']
      );
    } else {
      push(
        'Which name on the list would you actually buy this week? Not "considering" — buy.',
        ['actually buy']
      );
    }

    push(
      'You wrote "waiting for confirmation" four times in the last ten sessions. What does confirmation look like today, specifically?',
      ['waiting for confirmation', 'specifically']
    );

    push(
      'Which position on your sheet has the thinnest thesis right now? Say it out loud.',
      ['thinnest thesis', 'out loud']
    );
    return qs;
  }

  if (regime === 'stressed') {
    // 5-6 questions — force plan-vs-action honesty.
    if (s.biggestDrawdown && (s.biggestDrawdown.drawdown_52w ?? 0) < -10) {
      push(
        `${s.biggestDrawdown.ticker} is in a ${Math.abs(s.biggestDrawdown.drawdown_52w ?? 0).toFixed(0)}% drawdown. Read the thesis. Which one are you quietly no longer believing?`,
        [s.biggestDrawdown.ticker, 'quietly no longer believing']
      );
    }

    if (s.biggestMoveDown) {
      push(
        `${s.biggestMoveDown.ticker} broke ${fmtPct(s.biggestMoveDown.change_1d)} today. Has the price action changed your plan, or only your comfort?`,
        [s.biggestMoveDown.ticker, 'changed your plan', 'your comfort']
      );
    } else {
      push(
        'Pick the name on the sheet whose chart you keep flinching at. Read its thesis out loud. Still works?',
        ['flinching']
      );
    }

    if (s.nearTrigger) {
      push(
        `${s.nearTrigger.ticker} is at ${fmtPrice(s.nearTrigger.price)}, inside 5% of trigger. If it closes through tomorrow, what do you do — and is that the same thing you wrote last time?`,
        [s.nearTrigger.ticker, 'what do you do']
      );
    } else if (s.triggerHit) {
      push(
        `${s.triggerHit.ticker} hit your trigger at ${fmtPrice(s.triggerHit.trigger_price!)} and you have not acted. Why not?`,
        [s.triggerHit.ticker, 'have not acted', 'Why not']
      );
    } else {
      push(
        'Name the one price on your sheet that, if printed tomorrow, demands action — not analysis.',
        ['demands action']
      );
    }

    push(
      'You said "not yet" yesterday. What changes between "not yet" and "now" — and is any of it showing up on the tape today?',
      ['not yet', 'now']
    );

    push(
      'Of the names on your list, which one do you still believe in with both hands? Only pick one.',
      ['both hands', 'only pick one']
    );

    // One metric-anchored grounding question, just one.
    push(
      'Dealers are short gamma and correlations are climbing. Your book assumes dispersion. Does the plan for any name on the sheet change if that is wrong for two more weeks?',
      ['short gamma', 'dispersion', 'two more weeks']
    );
    return qs;
  }

  // DISLOCATION — 7-8 questions. No politeness. Names, prices, plans.
  if (s.biggestDrawdown && (s.biggestDrawdown.drawdown_52w ?? 0) < -15) {
    push(
      `${s.biggestDrawdown.ticker} is down ${Math.abs(s.biggestDrawdown.drawdown_52w ?? 0).toFixed(0)}% from highs. Pull up the thesis. Does it still work, or are you holding onto the name out of inertia?`,
      [s.biggestDrawdown.ticker, 'inertia']
    );
  }

  if (s.triggerHit) {
    push(
      `${s.triggerHit.ticker} hit your trigger at ${fmtPrice(s.triggerHit.trigger_price!)}. Why have you not acted on it?`,
      [s.triggerHit.ticker, 'have not acted']
    );
  } else if (s.nearTrigger) {
    push(
      `${s.nearTrigger.ticker} is within 5% of trigger at ${fmtPrice(s.nearTrigger.price)}. This is the environment you have been waiting for. What are you doing with it?`,
      [s.nearTrigger.ticker, 'waiting for']
    );
  }

  if (s.biggestMoveDown) {
    push(
      `${s.biggestMoveDown.ticker} moved ${fmtPct(s.biggestMoveDown.change_1d)} today. Was that on the news, or on nothing? Does it change the plan?`,
      [s.biggestMoveDown.ticker, 'on nothing', 'change the plan']
    );
  }

  push(
    'Name three prices — specific numbers on three names on your sheet — where you stop asking questions and act.',
    ['three prices', 'specific numbers', 'stop asking questions']
  );

  push(
    'Your last five sessions in stressed regimes ended with "waiting." What is different about today, in one sentence?',
    ['"waiting"', 'one sentence']
  );

  push(
    'Which thesis on your sheet quietly died this week that you have not admitted yet?',
    ['quietly died', 'not admitted']
  );

  push(
    'Write the next 24 hours as if you have already executed. What did you do at the open?',
    ['already executed', 'at the open']
  );

  // One optional metric grounding — only if watchlist is thin enough that name
  // questions run out. Otherwise the eighth slot stays on plan.
  if (qs.length < 7) {
    push(
      'Dealer gamma is deeply negative. If the flow amplifies the next leg, which name on the sheet moves first, and what is your pre-committed response?',
      ['deeply negative', 'moves first', 'pre-committed response']
    );
  }
  return qs;
}

// ---------- Post-session read ----------

export function getMockRead(regime: Regime, answers: string[]): MentorRead {
  const text = answers.join(' ').toLowerCase();
  const wrote = (needle: string) => text.includes(needle);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const flagged: string[] = [];
  if (wrote('waiting')) flagged.push('waiting');
  if (wrote('not yet')) flagged.push('not yet');
  if (wrote('confirmation')) flagged.push('confirmation');

  let line = '';
  let watchFor = '';
  switch (regime) {
    case 'calm':
      line =
        wordCount < 30
          ? `Short session. Calm is when the list gets cleaned, not when trades get made. Fine.`
          : `Quiet read. The list looks sharper than last week. That is the work.`;
      watchFor = 'a name you revise this week vs quietly leave';
      break;
    case 'elevated':
      line = flagged.length
        ? `You named the names. Good. But "${flagged[0]}" showed up again — that is the pattern to watch.`
        : `Clear on the names today. The plan is tighter than yesterday. Stay on the sheet, not the tape.`;
      watchFor = 'whether tomorrow you move closer to your price or move the price';
      break;
    case 'stressed':
      line = flagged.includes('waiting')
        ? `"Waiting" again. That is now ${flagged.join(', ')} on the record. We have a pattern, not a plan.`
        : `Honest session. You sat with each name. Do not let that turn into paralysis tomorrow.`;
      watchFor = 'action vs watching on the one name you named';
      break;
    case 'dislocation':
      line = flagged.includes('waiting')
        ? `You wrote "waiting" in the environment you said you were waiting for. Read that sentence again.`
        : `You gave prices. Now we find out if the prices you gave are the ones you act on.`;
      watchFor = 'whether you execute at the numbers you just wrote down';
      break;
  }

  return { text: line, flagged_patterns: flagged, watch_for: watchFor };
}
