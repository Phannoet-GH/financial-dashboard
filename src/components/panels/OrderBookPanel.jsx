// src/components/panels/OrderBookPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useMarket } from '../../context/MarketContext';
import './OrderBookPanel.css';

function generateBook(midPrice, spread = 0.05, levels = 12) {
  const asks = [];
  const bids = [];
  let askP = midPrice * (1 + spread / 200);
  let bidP = midPrice * (1 - spread / 200);

  for (let i = 0; i < levels; i++) {
    asks.push({
      price: parseFloat(askP.toFixed(2)),
      size:  parseFloat((Math.random() * 500 + 50).toFixed(2)),
    });
    bids.push({
      price: parseFloat(bidP.toFixed(2)),
      size:  parseFloat((Math.random() * 500 + 50).toFixed(2)),
    });
    askP *= 1 + (Math.random() * 0.0015 + 0.0005);
    bidP *= 1 - (Math.random() * 0.0015 + 0.0005);
  }
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);
  return { asks, bids };
}

export default function OrderBookPanel() {
  const { prices, selectedSymbol } = useMarket();
  const [book, setBook] = useState(() => {
    const mid = prices[selectedSymbol]?.price || 100;
    return generateBook(mid);
  });

  useEffect(() => {
    const p = prices[selectedSymbol]?.price;
    if (!p) return;
    const id = setInterval(() => {
      setBook(generateBook(p));
    }, 500);
    return () => clearInterval(id);
  }, [prices, selectedSymbol]);

  const p   = prices[selectedSymbol];
  const mid = p?.price ?? 0;
  const spread = book.asks[0] && book.bids[0]
    ? (book.asks[0].price - book.bids[0].price).toFixed(2)
    : '—';

  const maxSize = Math.max(
    ...book.asks.map(a => a.size),
    ...book.bids.map(b => b.size),
  );

  return (
    <div className="orderbook-card glass-card">
      <div className="panel-header">
        <span className="panel-title">Order Book</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {selectedSymbol} · spread {spread}
        </span>
      </div>
      <div className="ob-body">
        <div className="ob-col-header">
          <span>Price</span>
          <span>Size</span>
          <span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {/* Asks (sells) — reversed so highest ask is at top */}
        <div className="ob-asks">
          {[...book.asks].reverse().map((row, i) => {
            const barPct = (row.size / maxSize * 100).toFixed(1);
            return (
              <div key={i} className="ob-row ob-ask">
                <div className="ob-depth-bar ob-ask-bar" style={{ width: `${barPct}%` }} />
                <span className="ob-price text-mono text-red">{row.price.toFixed(2)}</span>
                <span className="ob-size text-mono">{row.size.toFixed(0)}</span>
                <span className="ob-total text-mono text-muted" style={{ textAlign: 'right' }}>
                  {(row.price * row.size).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
        {/* Mid price */}
        <div className="ob-mid">
          <span className="text-mono fw-700" style={{ fontSize: 15, color: p?.changePct >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {mid.toFixed(2)}
          </span>
          <span className="text-xs text-muted">mid</span>
        </div>
        {/* Bids (buys) */}
        <div className="ob-bids">
          {book.bids.map((row, i) => {
            const barPct = (row.size / maxSize * 100).toFixed(1);
            return (
              <div key={i} className="ob-row ob-bid">
                <div className="ob-depth-bar ob-bid-bar" style={{ width: `${barPct}%` }} />
                <span className="ob-price text-mono text-green">{row.price.toFixed(2)}</span>
                <span className="ob-size text-mono">{row.size.toFixed(0)}</span>
                <span className="ob-total text-mono text-muted" style={{ textAlign: 'right' }}>
                  {(row.price * row.size).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
