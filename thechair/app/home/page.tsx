import MarketBoard from '../components/MarketBoard';
import { getMockSnapshot } from '../../lib/market/mock';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  // Phase 1: stubbed snapshot. In Phase 3 this will hit /api/market/snapshot
  // which reads from market_snapshots in SQLite.
  const snapshot = getMockSnapshot();
  return <MarketBoard initial={snapshot} />;
}
