import MarketBoard from '../components/MarketBoard';
import WatchlistStrip from '../components/WatchlistStrip';
import { getMockSnapshot } from '../../lib/market/mock';
import { store } from '../../lib/mock-store';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const snapshot = getMockSnapshot();
  const watchlist = store.listWatchlist();
  return (
    <div className="space-y-6">
      <MarketBoard initial={snapshot} />
      <WatchlistStrip initial={watchlist} />
    </div>
  );
}
