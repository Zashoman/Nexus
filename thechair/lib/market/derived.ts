// Phase 3: derived signal computations.
//   - QQQ 25-delta skew = put IV(25Δ) − call IV(25Δ) linearly interpolated from chain
//   - Implied correlation from QQQ IV² vs Σ(wᵢ × IVᵢ²)
//   - IV rank per name = (current IV − 52w min) / (52w max − 52w min) × 100
//   - Realized correlation: 20-day pairwise across watchlist
//   - NDX %>50DMA, top-10 YTD contribution, new-highs/new-lows ratio

export function ivRank(current: number, min52w: number, max52w: number): number {
  if (max52w === min52w) return 50;
  return ((current - min52w) / (max52w - min52w)) * 100;
}

export interface OptionQuote {
  strike: number;
  delta: number;
  iv: number;
  option_type: 'call' | 'put';
}

export function skew25d(chain: OptionQuote[]): number | null {
  const putIV = interpolateAtDelta(
    chain.filter((c) => c.option_type === 'put'),
    -0.25
  );
  const callIV = interpolateAtDelta(
    chain.filter((c) => c.option_type === 'call'),
    0.25
  );
  if (putIV === null || callIV === null) return null;
  return (putIV - callIV) * 100; // in vol points
}

function interpolateAtDelta(
  options: OptionQuote[],
  targetDelta: number
): number | null {
  if (options.length === 0) return null;
  const sorted = [...options].sort((a, b) => a.delta - b.delta);
  // Find bracket
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (
      (lo.delta <= targetDelta && targetDelta <= hi.delta) ||
      (hi.delta <= targetDelta && targetDelta <= lo.delta)
    ) {
      const t = (targetDelta - lo.delta) / (hi.delta - lo.delta);
      return lo.iv + t * (hi.iv - lo.iv);
    }
  }
  // Extrapolate to nearest
  const nearest = sorted.reduce((best, o) =>
    Math.abs(o.delta - targetDelta) < Math.abs(best.delta - targetDelta) ? o : best
  );
  return nearest.iv;
}

export function impliedCorrelation(
  indexIV: number,
  constituents: Array<{ weight: number; iv: number }>
): number {
  const sumSquares = constituents.reduce((s, c) => s + c.weight * c.iv ** 2, 0);
  if (sumSquares === 0) return 0;
  return indexIV ** 2 / sumSquares;
}

export function pairwiseCorrelation(returnsA: number[], returnsB: number[]): number {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n === 0) return 0;
  const meanA = returnsA.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const meanB = returnsB.slice(0, n).reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = returnsA[i] - meanA;
    const db = returnsB[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denom = Math.sqrt(denomA * denomB);
  return denom === 0 ? 0 : num / denom;
}
