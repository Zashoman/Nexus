// Phase 3 polling worker. Runs every 5 min during US market hours, 30 min off-hours.
//
// 1. Fetch raw data in parallel (Tradier, Menthor Q, CBOE, FRED, NDX constituents).
// 2. Compute derived signals (skew, implied corr, IV-rank per name, realized corr, breadth).
// 3. Compute regime composite.
// 4. Write market_snapshots + watchlist_snapshots rows.
// 5. Detect trigger hits and insert into alerts.

export async function runMarketPoll(): Promise<void> {
  // Phase 1: no-op — scaffold only.
  // eslint-disable-next-line no-console
  console.log('[market-poll] phase 1 stub — no-op');
}
