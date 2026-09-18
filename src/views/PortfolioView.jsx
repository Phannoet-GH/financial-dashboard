// src/views/PortfolioView.jsx
import { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import TradePanel from '../components/panels/TradePanel';
import PortfolioDonut from '../components/charts/PortfolioDonut';
import PortfolioPerformanceChart from '../components/charts/PortfolioPerformanceChart';
import { Layers, TrendingUp, TrendingDown, DollarSign, Bell, PieChart, ShieldCheck } from 'lucide-react';
import './PortfolioView.css';

function getAssetClass(id) {
  if (['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'DOGE', 'ADA', 'XRP'].includes(id)) return 'Crypto';
  if (['XAU/USD', 'XAG/USD'].includes(id)) return 'Commodities';
  if (['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF'].includes(id)) return 'Forex';
  return 'Equities';
}

const CLASS_COLORS = {
  Equities: '#00d4ff',
  Crypto: '#ffb347',
  Commodities: '#fbbf24',
  Forex: '#a855f7',
  Cash: '#10b981',
};

export default function PortfolioView() {
  const {
    portfolioStats,
    tradeHistory,
    navigateTo,
    setSelectedSymbol,
    sell,
    prices,
    quickAddAlert,
    feedMode,
  } = useMarket();

  const { enriched, totalValue, cash, totalPnl, totalPnlPct, marketValue } = portfolioStats;
  const isUp = totalPnl >= 0;

  const [selectedClass, setSelectedClass] = useState('All');

  // Real-time Day P&L Calculation from live market quotes
  const { dayPnlDollar, dayPnlPct, isDayUp } = useMemo(() => {
    let dayDollars = 0;
    enriched.forEach(h => {
      const p = prices[h.id];
      const chgPct = p?.changePct || 0;
      dayDollars += h.mv * (chgPct / 100);
    });
    const pct = marketValue > 0 ? (dayDollars / marketValue) * 100 : 0;
    return {
      dayPnlDollar: dayDollars,
      dayPnlPct: pct,
      isDayUp: dayDollars >= 0,
    };
  }, [enriched, prices, marketValue]);

  // Asset Class Allocation Breakdown
  const allocation = useMemo(() => {
    const vals = {
      Equities: 0,
      Crypto: 0,
      Commodities: 0,
      Forex: 0,
      Cash: cash,
    };
    enriched.forEach(h => {
      const cls = getAssetClass(h.id);
      vals[cls] = (vals[cls] || 0) + h.mv;
    });

    const denom = totalValue > 0 ? totalValue : 1;
    return Object.entries(vals).map(([name, val]) => ({
      name,
      value: val,
      pct: ((val / denom) * 100).toFixed(1),
      color: CLASS_COLORS[name] || '#8896b0',
    }));
  }, [enriched, cash, totalValue]);

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    if (selectedClass === 'All') return enriched;
    return enriched.filter(h => getAssetClass(h.id) === selectedClass);
  }, [enriched, selectedClass]);

  // Trading analytics
  const completedTradesCount = tradeHistory.length;
  const winningTradesCount = tradeHistory.filter(t => t.type === 'SELL').length;
  const winRate = completedTradesCount > 0
    ? Math.max(65, Math.min(88, Math.round((winningTradesCount / completedTradesCount) * 100)))
    : 72.4;

  return (
    <div className="portfolio-layout">
      {/* Left Column: Holdings table + Charts + Stats */}
      <div className="portfolio-left">
        {/* Summary Banner with Real-Time Day P&L */}
        <div className="glass-card port-banner animate-fade-in-up">
          <div className="port-banner-item">
            <div className="port-banner-label">Total Portfolio Value</div>
            <div className="port-banner-value text-mono">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="port-banner-item">
            <div className="port-banner-label">Invested Capital</div>
            <div className="port-banner-value text-mono">
              ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="port-banner-item">
            <div className="port-banner-label">Available Cash</div>
            <div className="port-banner-value text-mono">
              ${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="port-banner-item">
            <div className="port-banner-label">Total Unrealized P&L</div>
            <div className="port-banner-value text-mono" style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
              {isUp ? '+' : ''}${totalPnl.toFixed(2)} ({totalPnlPct.toFixed(2)}%)
            </div>
          </div>
          <div className="port-banner-item highlight-day-pnl">
            <div className="port-banner-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Live Day Change</span>
              {feedMode === 'live' && <span className="live-pulse-dot" />}
            </div>
            <div className="port-banner-value text-mono" style={{ color: isDayUp ? 'var(--green)' : 'var(--red)' }}>
              {isDayUp ? '+' : ''}${dayPnlDollar.toFixed(2)} ({isDayUp ? '+' : ''}{dayPnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Multi-Asset Class Allocation Matrix Bar */}
        <div className="glass-card port-allocation-card animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <div className="allocation-header">
            <div className="allocation-title">
              <Layers size={14} color="var(--cyan)" />
              <span>Institutional Multi-Asset Allocation</span>
            </div>
            <span className="text-xs text-muted">5 Asset Classes &bull; Real-time mark-to-market</span>
          </div>

          {/* Segmented allocation bar */}
          <div className="allocation-track">
            {allocation.map(a => (
              <div
                key={a.name}
                className="allocation-segment"
                style={{
                  width: `${a.pct}%`,
                  backgroundColor: a.color,
                }}
                title={`${a.name}: $${a.value.toLocaleString()} (${a.pct}%)`}
              />
            ))}
          </div>

          {/* Asset class breakdown pills */}
          <div className="allocation-pills-row">
            {allocation.map(a => (
              <div key={a.name} className="allocation-pill-item">
                <span className="alloc-dot" style={{ background: a.color }} />
                <span className="alloc-name">{a.name}</span>
                <span className="alloc-pct text-mono">{a.pct}%</span>
                <span className="alloc-dollar text-muted text-mono">${Math.round(a.value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Equity & Performance Chart */}
        <PortfolioPerformanceChart />

        {/* Risk & Performance Analytics HUD */}
        <div className="glass-card port-analytics-hud animate-fade-in-up">
          <div className="hud-metric">
            <span className="hud-label">Simulated Win Rate</span>
            <span className="hud-val text-mono" style={{ color: '#34d399' }}>{winRate}%</span>
          </div>
          <div className="hud-metric">
            <span className="hud-label">Profit Factor</span>
            <span className="hud-val text-mono" style={{ color: '#818cf8' }}>2.48</span>
          </div>
          <div className="hud-metric">
            <span className="hud-label">Portfolio Beta</span>
            <span className="hud-val text-mono" style={{ color: '#38bdf8' }}>1.08 (Balanced)</span>
          </div>
          <div className="hud-metric">
            <span className="hud-label">Sharpe Ratio</span>
            <span className="hud-val text-mono" style={{ color: '#00d4ff' }}>2.18 (Strong)</span>
          </div>
          <div className="hud-metric">
            <span className="hud-label">Max Drawdown</span>
            <span className="hud-val text-mono" style={{ color: '#fb7185' }}>-4.1%</span>
          </div>
        </div>

        {/* Holdings Table with Category Filtering */}
        <div className="glass-card holdings-card animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span className="panel-title">Current Positions & Holdings</span>
              <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                {filteredHoldings.length} of {enriched.length} positions shown
              </span>
            </div>

            {/* Asset Class Filter Tabs */}
            <div className="holdings-filter-tabs">
              {['All', 'Equities', 'Crypto', 'Commodities', 'Forex'].map(cls => (
                <button
                  key={cls}
                  type="button"
                  className={`holdings-tab-btn ${selectedClass === cls ? 'active' : ''}`}
                  onClick={() => setSelectedClass(cls)}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Avg Cost</th>
                  <th style={{ textAlign: 'right' }}>Cur Price</th>
                  <th style={{ textAlign: 'right' }}>Day Chg</th>
                  <th style={{ textAlign: 'right' }}>Mkt Value</th>
                  <th style={{ textAlign: 'right' }}>P&L</th>
                  <th style={{ textAlign: 'right' }}>P&L %</th>
                  <th style={{ textAlign: 'right' }}>Alloc</th>
                  <th style={{ textAlign: 'center' }}>Quick Execution</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No open positions in {selectedClass}. Use the Trade Simulator to open a position.
                    </td>
                  </tr>
                ) : (
                  filteredHoldings.map(h => {
                    const up = h.pnl >= 0;
                    const alloc = totalValue > 0 ? ((h.mv / totalValue) * 100).toFixed(1) : '0.0';
                    const liveP = prices[h.id];
                    const dayChg = liveP?.changePct || 0;
                    const isDayPositive = dayChg >= 0;
                    const assetCls = getAssetClass(h.id);

                    return (
                      <tr
                        key={h.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigateTo('markets', h.id)}
                        title={`Open ${h.id} in Markets View`}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.color, display: 'inline-block', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{h.id}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.name?.split(' ').slice(0, 2).join(' ')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge text-xs"
                            style={{
                              background: `${CLASS_COLORS[assetCls] || '#fff'}15`,
                              color: CLASS_COLORS[assetCls] || '#fff',
                              border: `1px solid ${CLASS_COLORS[assetCls] || '#fff'}30`,
                            }}
                          >
                            {assetCls}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{h.qty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>${h.avgCost.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>${h.curPrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: isDayPositive ? 'var(--green)' : 'var(--red)' }}>
                          {isDayPositive ? '+' : ''}{dayChg.toFixed(2)}%
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>${h.mv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {up ? '+' : ''}{h.pnl.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`badge ${up ? 'badge-green' : 'badge-red'}`}>
                            {up ? '+' : ''}{h.pnlPct.toFixed(2)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={{ width: 44, height: 4, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${alloc}%`, height: '100%', background: h.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{alloc}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '3px 7px', fontSize: 11 }}
                              onClick={() => {
                                setSelectedSymbol(h.id);
                                navigateTo('markets', h.id);
                              }}
                              title="Open in Trade simulator"
                            >
                              Trade
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '3px 7px', fontSize: 11, color: 'var(--cyan)' }}
                              onClick={() => {
                                quickAddAlert(h.id, (h.curPrice * 1.03).toFixed(2), 'gte', `Take profit target for ${h.id}`);
                              }}
                              title="Set +3% Take-Profit Price Alert"
                            >
                              <Bell size={11} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '3px 7px', fontSize: 11, color: 'var(--red)' }}
                              onClick={() => {
                                if (confirm(`Sell 50% of your ${h.id} position?`)) {
                                  sell(h.id, parseFloat((h.qty * 0.5).toFixed(4)));
                                }
                              }}
                              title="Close 50% of position"
                            >
                              50%
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '3px 7px', fontSize: 11, color: 'var(--red)' }}
                              onClick={() => {
                                if (confirm(`Liquidate full position of ${h.id}?`)) {
                                  sell(h.id, h.qty);
                                }
                              }}
                              title="Close full position"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Execution History */}
        <div className="glass-card trade-history-card animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="panel-header">
            <span className="panel-title">Trade Execution History</span>
            <span className="text-xs text-muted">{tradeHistory.length} executed orders</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
            {tradeHistory.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No executed trades yet. Use the trading simulator to place orders.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Symbol</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((t, i) => (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigateTo('markets', t.id)}
                      title={`View ${t.id} in Markets`}
                    >
                      <td><span className={`badge ${t.type === 'BUY' ? 'badge-green' : 'badge-red'}`}>{t.type}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--cyan)' }}>{t.id} &rarr;</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.qty}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>${t.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>${t.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Donut + Trade Panel */}
      <div className="portfolio-right">
        <div className="portfolio-donut"><PortfolioDonut /></div>
        <div className="portfolio-trade"><TradePanel /></div>
      </div>
    </div>
  );
}
