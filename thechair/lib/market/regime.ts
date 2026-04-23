// Regime composite — spec §5.1(3).
//
// Weighted score, 0-100, with these weights:
//   VXN percentile (5Y):                15%
//   Term structure (inversion = high):  15%
//   QQQ skew trend (flat+falling=high): 15%
//   Dealer gamma sign + magnitude:      15%
//   Implied correlation (>0.7 = high):  10%
//   HY OAS percentile:                  10%
//   NDX breadth (low %>50DMA = high):   10%
//   List IV rank >90 count:             10%
//
// Thresholds:
//   0–25   Calm
//   25–50  Elevated
//   50–75  Stressed
//   75–100 Dislocation

import type { Regime } from '../types';

export interface RegimeInputs {
  vxn_percentile_5y: number;      // 0-100
  vix_term_m1_m3: number;         // ratio; inverted when <1
  skew_trend_score: number;       // 0-100 pre-computed trend score
  dealer_gamma_score: number;     // 0-100 (negative+large gamma → higher)
  implied_corr: number;           // 0-1
  hy_oas_percentile: number;      // 0-100
  ndx_pct_above_50dma: number;    // 0-100
  list_iv_rank_above_90: number;  // count
}

export interface RegimeResult {
  score: number;
  regime: Regime;
  sub_signals: Record<string, number>;
}

export function computeRegime(x: RegimeInputs): RegimeResult {
  const termScore = clamp(((1.1 - x.vix_term_m1_m3) / 0.3) * 100, 0, 100);
  const corrScore = clamp(((x.implied_corr - 0.3) / 0.6) * 100, 0, 100);
  const breadthScore = clamp((1 - x.ndx_pct_above_50dma / 100) * 100, 0, 100);
  const listIvScore = clamp((x.list_iv_rank_above_90 / 10) * 100, 0, 100);

  const sub = {
    vxn_pct: x.vxn_percentile_5y,
    term_inversion: termScore,
    skew_trend: x.skew_trend_score,
    dealer_gamma: x.dealer_gamma_score,
    implied_corr: corrScore,
    hy_oas: x.hy_oas_percentile,
    breadth: breadthScore,
    list_iv_rank: listIvScore,
  };

  const score =
    0.15 * sub.vxn_pct +
    0.15 * sub.term_inversion +
    0.15 * sub.skew_trend +
    0.15 * sub.dealer_gamma +
    0.1 * sub.implied_corr +
    0.1 * sub.hy_oas +
    0.1 * sub.breadth +
    0.1 * sub.list_iv_rank;

  return {
    score,
    regime: scoreToRegime(score),
    sub_signals: sub,
  };
}

export function scoreToRegime(score: number): Regime {
  if (score < 25) return 'calm';
  if (score < 50) return 'elevated';
  if (score < 75) return 'stressed';
  return 'dislocation';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
