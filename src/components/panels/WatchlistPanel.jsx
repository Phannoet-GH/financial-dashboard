// src/components/panels/WatchlistPanel.jsx
import { useRef, useEffect, useState } from 'react';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice } from '../../data/instruments';
import './WatchlistPanel.css';

export default function WatchlistPanel() {
  const { prices, navigateTo } = useMarket();
  const [filter, setFilter]   = useState('all');
  const flashRefs = useRef({});

  function handleClick(id) {
    navigateTo('markets', id);
  }

  const filtered = filter === 'all'
    ? ALL_INSTRUMENTS
    : ALL_INSTRUMENTS.filter(i => i.sector.toLowerCase() === filter);

  return (
    <div className="watchlist-card glass-card">
      <div className="panel-header">
        <span className="panel-title">Watchlist</span>
        <div className="tab-bar">
          {['all', 'Technology', 'Crypto', 'Forex'].map(f => (
            <button key={f} className={`tab-item${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>
      <div className="watchlist-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Change</th>
              <th style={{ textAlign: 'right' }}>Change%</th>
              <th style={{ textAlign: 'right' }}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inst => {
              const p = prices[inst.id];
              if (!p) return null;
              const up = p.changePct >= 0;
              return (
                <WatchlistRow
                  key={inst.id}
                  inst={inst}
                  p={p}
                  up={up}
                  onClick={() => handleClick(inst.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WatchlistRow({ inst, p, up, onClick }) {
  const rowRef = useRef(null);
  const prevPrice = useRef(p.price);

  useEffect(() => {
    if (p.price === prevPrice.current) return;
    const el = rowRef.current;
    if (!el) return;
    const cls = p.price > prevPrice.current ? 'flash-green' : 'flash-red';
    el.classList.remove('flash-green', 'flash-red');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 600);
    prevPrice.current = p.price;
  }, [p.price]);

  function fmtVol(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
  }

  return (
    <tr ref={rowRef} style={{ cursor: 'pointer' }} onClick={onClick}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="inst-dot" style={{ background: inst.color }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{inst.id}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inst.sector}</div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>
        {formatPrice(p.price, inst.id)}
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: up ? 'var(--green)' : 'var(--red)' }}>
        {up ? '+' : ''}{p.change?.toFixed(2) ?? '—'}
      </td>
      <td style={{ textAlign: 'right' }}>
        <span className={`badge ${up ? 'badge-green' : 'badge-red'}`}>
          {up ? '▲' : '▼'} {Math.abs(p.changePct).toFixed(2)}%
        </span>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        {fmtVol(p.volume)}
      </td>
    </tr>
  );
}
