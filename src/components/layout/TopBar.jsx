// src/components/layout/TopBar.jsx
import { Bell, Clock } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice } from '../../data/instruments';
import { useState, useEffect } from 'react';
import './TopBar.css';

function Ticker({ prices, onSelect }) {
  const tickers = ALL_INSTRUMENTS.slice(0, 15);
  // Duplicate for seamless loop
  const items = [...tickers, ...tickers];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {items.map((inst, i) => {
          const p = prices[inst.id];
          if (!p) return null;
          const up = p.changePct >= 0;
          return (
            <span
              key={i}
              className="ticker-item ticker-item-clickable"
              onClick={() => onSelect(inst.id)}
              title={`View ${inst.id} chart & order book`}
            >
              <span className="ticker-sym">{inst.id}</span>
              <span className="ticker-price text-mono">{formatPrice(p.price, inst.id)}</span>
              <span className={`ticker-change ${up ? 'text-green' : 'text-red'}`}>
                {up ? '▲' : '▼'} {Math.abs(p.changePct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Clock24() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="topbar-clock text-mono">{time}</span>;
}

export default function TopBar() {
  const { prices, alerts, navigateTo, showAlertsDropdown, setShowAlertsDropdown } = useMarket();

  return (
    <header className="topbar">
      <Ticker
        prices={prices}
        onSelect={(sym) => navigateTo('markets', sym)}
      />
      <div className="topbar-right">
        <Clock24 />
        <div style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowAlertsDropdown(s => !s)}
            title="Toggle Notifications"
          >
            <Bell size={15} />
            {alerts.length > 0 && <span className="topbar-alert-dot">{alerts.length}</span>}
          </button>
          {showAlertsDropdown && alerts.length > 0 && (
            <div className="alert-dropdown animate-fade-in">
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>NOTIFICATIONS</span>
                <span className="text-muted" style={{ cursor: 'pointer' }} onClick={() => setShowAlertsDropdown(false)}>✕</span>
              </div>
              {alerts.map(a => (
                <div key={a.id} className={`alert-item alert-${a.type}`}>
                  <span>{a.msg}</span>
                  <span className="alert-time text-mono">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="topbar-market-status"
          style={{ cursor: 'pointer' }}
          onClick={() => navigateTo('markets')}
          title="Go to Markets Feed"
        >
          <div className="live-dot" />
          <span>LIVE</span>
        </div>
      </div>
    </header>
  );
}
