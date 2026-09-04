// src/views/SettingsView.jsx
import { useState } from 'react';
import {
  Settings,
  Cpu,
  Zap,
  Sliders,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  CheckCircle2,
  Play,
  Pause,
  Layers,
  Database,
  ShieldAlert,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import './SettingsView.css';

export default function SettingsView() {
  const {
    tickSpeed,
    setTickSpeed,
    isPaused,
    setIsPaused,
    volatility,
    setVolatility,
    marketBias,
    setMarketBias,
    soundEnabled,
    setSoundEnabled,
    currency,
    setCurrency,
    compactMode,
    setCompactMode,
    resetPortfolio,
    tradeHistory,
    portfolioStats,
    addAlert,
    clearAlerts,
  } = useMarket();

  const [resetSuccess, setResetSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  function handleReset() {
    resetPortfolio();
    setResetSuccess(true);
    addAlert('Portfolio reset to initial $100,000 cash and baseline holdings', 'info');
    setTimeout(() => setResetSuccess(false), 4000);
  }

  function handleExport() {
    const exportData = {
      timestamp: new Date().toISOString(),
      portfolio: {
        totalValue: portfolioStats.totalValue,
        marketValue: portfolioStats.marketValue,
        cash: portfolioStats.cash,
        totalPnl: portfolioStats.totalPnl,
      },
      trades: tradeHistory,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finpulse-portfolio-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    addAlert('Exported portfolio summary and trade history to JSON file', 'success');
    setTimeout(() => setExportSuccess(false), 3000);
  }

  return (
    <div className="settings-layout">
      {/* Diagnostics Banner */}
      <div className="settings-diagnostics-row">
        <div className="glass-card diag-card animate-fade-in-up">
          <div className="diag-icon-box" style={{ background: 'rgba(0, 212, 255, 0.12)', color: 'var(--cyan)' }}>
            <Cpu size={18} />
          </div>
          <div>
            <div className="diag-label">Simulation Engine</div>
            <div className="diag-val">Geometric Brownian Motion (GBM)</div>
          </div>
        </div>

        <div className="glass-card diag-card animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <div className="diag-icon-box" style={{ background: 'rgba(0, 255, 136, 0.12)', color: 'var(--green)' }}>
            <Zap size={18} />
          </div>
          <div>
            <div className="diag-label">Engine Rate</div>
            <div className="diag-val text-mono">{isPaused ? 'PAUSED' : `${1000 / tickSpeed} ticks / sec`}</div>
          </div>
        </div>

        <div className="glass-card diag-card animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="diag-icon-box" style={{ background: 'rgba(255, 179, 71, 0.12)', color: 'var(--amber)' }}>
            <Database size={18} />
          </div>
          <div>
            <div className="diag-label">Active Feeds</div>
            <div className="diag-val text-mono">19 Live Instruments</div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="settings-grid">
        {/* Section 1: Market Simulation Engine Tuning */}
        <div className="glass-card setting-section-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={16} color="var(--cyan)" />
              Simulation Engine Controls
            </span>
            <span className="text-xs text-muted">Adjust real-time market behavior</span>
          </div>

          <div className="setting-body">
            {/* Tick Speed */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Price Tick Frequency</div>
                <div className="setting-desc">How rapidly simulated price updates and order book depth change.</div>
              </div>
              <div className="setting-controls">
                <div className="tab-bar">
                  <button
                    className={`tab-item${tickSpeed === 500 && !isPaused ? ' active' : ''}`}
                    onClick={() => { setTickSpeed(500); setIsPaused(false); }}
                  >
                    Fast (500ms)
                  </button>
                  <button
                    className={`tab-item${tickSpeed === 1000 && !isPaused ? ' active' : ''}`}
                    onClick={() => { setTickSpeed(1000); setIsPaused(false); }}
                  >
                    Standard (1s)
                  </button>
                  <button
                    className={`tab-item${tickSpeed === 2500 && !isPaused ? ' active' : ''}`}
                    onClick={() => { setTickSpeed(2500); setIsPaused(false); }}
                  >
                    Eco (2.5s)
                  </button>
                </div>
                <button
                  className={`btn ${isPaused ? 'btn-buy' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
                  onClick={() => setIsPaused(p => !p)}
                  title={isPaused ? 'Resume live price ticks' : 'Pause market simulation'}
                >
                  {isPaused ? <Play size={13} /> : <Pause size={13} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>

            {/* Volatility Multiplier */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Market Volatility Level</div>
                <div className="setting-desc">Scales the diffusion amplitude per second for all stocks, crypto, and forex.</div>
              </div>
              <div className="setting-controls">
                <div className="tab-bar">
                  <button
                    className={`tab-item${volatility === 0.5 ? ' active' : ''}`}
                    onClick={() => setVolatility(0.5)}
                  >
                    Low (0.5x)
                  </button>
                  <button
                    className={`tab-item${volatility === 1.0 ? ' active' : ''}`}
                    onClick={() => setVolatility(1.0)}
                  >
                    Normal (1.0x)
                  </button>
                  <button
                    className={`tab-item${volatility === 2.0 ? ' active' : ''}`}
                    onClick={() => setVolatility(2.0)}
                  >
                    High / Crypto (2.0x)
                  </button>
                </div>
              </div>
            </div>

            {/* Market Drift Bias */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Macro Sentiment Bias (Drift)</div>
                <div className="setting-desc">Sets the mathematical drift tendency across all instrument prices.</div>
              </div>
              <div className="setting-controls">
                <div className="tab-bar">
                  <button
                    className={`tab-item${marketBias > 0.0001 ? ' active' : ''}`}
                    onClick={() => setMarketBias(0.0004)}
                    style={marketBias > 0.0001 ? { color: 'var(--green)' } : {}}
                  >
                    ▲ Bullish (+0.04%)
                  </button>
                  <button
                    className={`tab-item${Math.abs(marketBias) <= 0.0001 ? ' active' : ''}`}
                    onClick={() => setMarketBias(0)}
                  >
                    Neutral (0.00%)
                  </button>
                  <button
                    className={`tab-item${marketBias < -0.0001 ? ' active' : ''}`}
                    onClick={() => setMarketBias(-0.0004)}
                    style={marketBias < -0.0001 ? { color: 'var(--red)' } : {}}
                  >
                    ▼ Bearish (-0.04%)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Interface & Display Preferences */}
        <div className="glass-card setting-section-card animate-fade-in-up" style={{ animationDelay: '140ms' }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="var(--cyan)" />
              Interface & Display Preferences
            </span>
            <span className="text-xs text-muted">Customize workspace appearance</span>
          </div>

          <div className="setting-body">
            {/* Currency */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Base Display Currency</div>
                <div className="setting-desc">Primary currency unit for portfolio valuations and order book entries.</div>
              </div>
              <div className="setting-controls">
                <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="JPY">JPY (¥) — Japanese Yen</option>
                </select>
              </div>
            </div>

            {/* Audio Alerts */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Audio Feedback & Chimes</div>
                <div className="setting-desc">Play audio tone when price triggers are hit or orders are executed.</div>
              </div>
              <div className="setting-controls">
                <button
                  className={`btn ${soundEnabled ? 'btn-ghost active-toggle' : 'btn-ghost'}`}
                  onClick={() => setSoundEnabled(s => !s)}
                  style={{ gap: 8 }}
                >
                  {soundEnabled ? <Volume2 size={15} color="var(--green)" /> : <VolumeX size={15} color="var(--text-muted)" />}
                  {soundEnabled ? 'Sound Enabled' : 'Muted'}
                </button>
              </div>
            </div>

            {/* Compact Density Mode */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">High Density Layout</div>
                <div className="setting-desc">Tighter padding and font sizes for multi-screen trading terminals.</div>
              </div>
              <div className="setting-controls">
                <button
                  className={`btn ${compactMode ? 'btn-ghost active-toggle' : 'btn-ghost'}`}
                  onClick={() => setCompactMode(c => !c)}
                >
                  {compactMode ? 'Compact Density' : 'Standard Density'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Data & Portfolio Management */}
        <div className="glass-card setting-section-card animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={16} color="var(--cyan)" />
              Data & Portfolio Management
            </span>
            <span className="text-xs text-muted">Backup, reset, or purge history</span>
          </div>

          <div className="setting-body">
            {/* Export */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Export Portfolio & Trade Log</div>
                <div className="setting-desc">Download all completed buy/sell orders and active holdings as a structured JSON file.</div>
              </div>
              <div className="setting-controls">
                <button className="btn btn-ghost" style={{ gap: 8 }} onClick={handleExport}>
                  <Download size={15} />
                  {exportSuccess ? 'Downloaded!' : 'Export JSON'}
                </button>
              </div>
            </div>

            {/* Clear Alerts */}
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Purge Activity Notifications</div>
                <div className="setting-desc">Clear all stored event logs and execution notifications.</div>
              </div>
              <div className="setting-controls">
                <button className="btn btn-ghost" onClick={clearAlerts}>
                  Clear History
                </button>
              </div>
            </div>

            {/* Reset Demo Portfolio */}
            <div className="setting-item" style={{ borderBottom: 'none' }}>
              <div className="setting-info">
                <div className="setting-title" style={{ color: 'var(--red)' }}>Reset Demo Portfolio</div>
                <div className="setting-desc">
                  Restores cash balance to $100,000.00 and resets initial holdings back to defaults.
                </div>
              </div>
              <div className="setting-controls">
                <button
                  className="btn btn-sell"
                  style={{ gap: 8, padding: '8px 16px' }}
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  Reset to Default
                </button>
              </div>
            </div>

            {resetSuccess && (
              <div className="reset-banner animate-fade-in">
                <CheckCircle2 size={16} color="var(--green)" />
                <span>Demo portfolio successfully reset to $100,000 cash balance.</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Engine Architecture & System Info */}
        <div className="glass-card setting-section-card animate-fade-in-up" style={{ animationDelay: '220ms' }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color="var(--cyan)" />
              System Architecture & Build Information
            </span>
            <span className="text-xs text-muted">Platform specifications</span>
          </div>

          <div className="system-specs-grid">
            <div className="spec-card">
              <div className="spec-label">Version</div>
              <div className="spec-val text-mono">v1.2.0 Pro</div>
            </div>
            <div className="spec-card">
              <div className="spec-label">Charting Framework</div>
              <div className="spec-val">TradingView Lightweight Charts v5.2</div>
            </div>
            <div className="spec-card">
              <div className="spec-label">Analytics Engine</div>
              <div className="spec-val">Chart.js 4.5 Canvas Renderer</div>
            </div>
            <div className="spec-card">
              <div className="spec-label">Stochastic Model</div>
              <div className="spec-val">GBM (Box-Muller Normal Variable)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
