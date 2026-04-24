import MarketBoard from '../components/MarketBoard';
import WatchlistStrip from '../components/WatchlistStrip';
import AlertsBanner from '../components/AlertsBanner';
import { getMockSnapshot } from '../../lib/market/mock';
import { store } from '../../lib/mock-store';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const snapshot = getMockSnapshot();
  const watchlist = store.listWatchlist();
  const alerts = store.listAlerts({ unacknowledgedOnly: true });
  return (
    <div className="space-y-6">
      <AlertsBanner initial={alerts} />
      <MarketBoard initial={snapshot} />
      <WatchlistStrip initial={watchlist} />
    </div>
  );
}
