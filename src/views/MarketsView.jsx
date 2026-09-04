// src/views/MarketsView.jsx
import CandlestickChart from '../components/charts/CandlestickChart';
import OrderBookPanel from '../components/panels/OrderBookPanel';
import WatchlistPanel from '../components/panels/WatchlistPanel';
import TradePanel from '../components/panels/TradePanel';
import './MarketsView.css';

export default function MarketsView() {
  return (
    <div className="markets-layout">
      {/* Top: Chart + Order Book */}
      <div className="markets-top">
        <div className="markets-chart">
          <CandlestickChart />
        </div>
        <div className="markets-orderbook">
          <OrderBookPanel />
        </div>
      </div>
      {/* Bottom: Watchlist + Trade Panel */}
      <div className="markets-bottom">
        <div className="markets-watchlist">
          <WatchlistPanel />
        </div>
        <div className="markets-trade">
          <TradePanel />
        </div>
      </div>
    </div>
  );
}
