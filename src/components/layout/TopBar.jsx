// src/components/layout/TopBar.jsx
import { Bell, Clock, Flame, Zap, Volume2, VolumeX, Trash2, ArrowRight } from 'lucide-react';
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
  const {
    prices,
    alerts,
    clearAlerts,
    priceTriggers,
    togglePriceTrigger,
    removePriceTrigger,
    navigateTo,
    showAlertsDropdown,
    setShowAlertsDropdown,
    news,
    setSelectedBreakingNews,
    feedMode,
    setFeedMode,
    liveFeedStatus,
    soundEnabled,
    setSoundEnabled,
  } = useMarket();

  const latestBreaking = news?.find(n => n.isBreaking && (n.impactLevel === 'CRITICAL' || n.impactLevel === 'HIGH'));
  const activeTriggers = priceTriggers.filter(t => t.active);

  return (
    <header className="topbar">
      <Ticker
        prices={prices}
        onSelect={(sym) => navigateTo('markets', sym)}
      />
      <div className="topbar-right">
        {latestBreaking && (
          <div
            className="topbar-breaking-pill animate-fade-in"
            onClick={() => setSelectedBreakingNews(latestBreaking)}
            title="High-Impact Market Catalyst — Click to Inspect"
          >
            <Flame size={12} className="text-red" />
            <span className="breaking-pill-text">
              {latestBreaking.sym}: {latestBreaking.text.substring(0, 36)}...
            </span>
          </div>
        )}
        <Clock24 />

        {/* Sound Toggle Icon */}
        <button
          className={`topbar-icon-btn ${soundEnabled ? 'sound-active' : 'sound-muted'}`}
          onClick={() => setSoundEnabled(s => !s)}
          title={soundEnabled ? 'Alert Audio: ON (Click to Mute)' : 'Alert Audio: MUTED (Click to Enable)'}
        >
          {soundEnabled ? <Volume2 size={15} color="var(--cyan)" /> : <VolumeX size={15} color="var(--text-muted)" />}
        </button>

        {/* Notifications & Price Alerts Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className={`topbar-icon-btn ${showAlertsDropdown ? 'active' : ''}`}
            onClick={() => setShowAlertsDropdown(s => !s)}
            title="Price Alerts & Notifications"
          >
            <Bell size={15} />
            {(alerts.length > 0 || activeTriggers.length > 0) && (
              <span className="topbar-alert-dot">{activeTriggers.length || alerts.length}</span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="alert-dropdown animate-fade-in">
              <div className="alert-dropdown-header">
                <div className="alert-dropdown-title">
                  <Bell size={13} color="var(--cyan)" />
                  <span>PRICE ALERTS & NOTIFICATIONS</span>
                </div>
                <div className="alert-dropdown-actions">
                  <button
                    className="alert-link-btn"
                    onClick={() => {
                      setShowAlertsDropdown(false);
                      navigateTo('alerts');
                    }}
                    title="Open Alerts Center"
                  >
                    Open Center <ArrowRight size={11} />
                  </button>
                  <button
                    className="alert-close-btn"
                    onClick={() => setShowAlertsDropdown(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Active Watchers Subheader */}
              {activeTriggers.length > 0 && (
                <div className="alert-dropdown-section">
                  <div className="alert-section-title">ACTIVE WATCHERS ({activeTriggers.length})</div>
                  {activeTriggers.slice(0, 4).map(t => (
                    <div key={t.id} className="topbar-watcher-item">
                      <div className="watcher-info">
                        <span className="watcher-sym" onClick={() => { setShowAlertsDropdown(false); navigateTo('markets', t.symbol); }}>
                          {t.symbol}
                        </span>
                        <span className="watcher-rule text-mono">
                          {t.condition === 'gte' ? '≥' : '≤'} ${t.targetPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="watcher-actions">
                        <button
                          className="btn-watcher-del"
                          onClick={() => removePriceTrigger(t.id)}
                          title="Remove alert"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notifications Stream */}
              <div className="alert-dropdown-section">
                <div className="alert-section-title-row">
                  <span className="alert-section-title">TRIGGER LOG ({alerts.length})</span>
                  {alerts.length > 0 && (
                    <button className="btn-clear-alerts" onClick={clearAlerts}>Clear</button>
                  )}
                </div>
                <div className="alert-dropdown-list">
                  {alerts.length === 0 ? (
                    <div className="alert-empty-text text-muted text-xs">No recent notifications</div>
                  ) : (
                    alerts.slice(0, 8).map(a => (
                      <div key={a.id} className={`alert-item alert-${a.type}`}>
                        <span className="alert-msg-text">{a.msg}</span>
                        <span className="alert-time text-mono">{a.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real Live Market API vs Local Simulator Switcher */}
        <div className="topbar-feed-toggle-wrap">
          <button
            type="button"
            className={`feed-toggle-btn ${feedMode === 'live' ? 'active-live' : ''}`}
            onClick={() => {
              setFeedMode('live');
              liveFeedStatus?.syncNow?.();
            }}
            title={`Real Live Market API (Yahoo, CoinGecko, ECB) • Latency: ${liveFeedStatus.latencyMs}ms • Click to sync now`}
          >
            <span className={`live-status-dot ${feedMode === 'live' ? 'dot-pulse' : ''}`} />
            <span>LIVE API</span>
            {feedMode === 'live' && liveFeedStatus.latencyMs > 0 && (
              <span className="feed-latency-tag text-mono">{liveFeedStatus.latencyMs}ms</span>
            )}
          </button>
          <button
            type="button"
            className={`feed-toggle-btn ${feedMode === 'simulator' ? 'active-sim' : ''}`}
            onClick={() => setFeedMode('simulator')}
            title="Local Market Simulation Sandbox"
          >
            <Zap size={11} />
            <span>SIMULATOR</span>
          </button>
        </div>
      </div>
    </header>
  );
}
