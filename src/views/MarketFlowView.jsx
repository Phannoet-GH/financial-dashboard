// src/views/MarketFlowView.jsx
import { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import { ALL_INSTRUMENTS, INSTRUMENTS, formatPrice } from '../data/instruments';
import { calculateMovingDirection, PRESET_BREAKING_NEWS } from '../data/marketAnalytics';
import {
  Compass,
  Zap,
  Flame,
  Activity,
  ArrowUpRight,
  BarChart3,
  Layers,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react';
import './MarketFlowView.css';

export default function MarketFlowView() {
  const {
    prices,
    ohlcHistory,
    marketFlowData,
    whaleOrders,
    navigateTo,
    triggerCatalyst,
    setSelectedBreakingNews,
    news,
    tradingSignals,
    applySignalToTrade,
  } = useMarket();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'stocks' | 'crypto' | 'forex' | 'commodities'
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL'); // 'ALL' | 'BULLISH' | 'BEARISH'
  const [signalFilter, setSignalFilter] = useState('ALL'); // 'ALL' | 'BUY' | 'SELL' | 'HIGH'
  const [selectedCatalystPreset, setSelectedCatalystPreset] = useState(PRESET_BREAKING_NEWS[0]?.id || 'cat-1');

  // Filter instruments based on tab, direction, and search
  const filteredInstruments = useMemo(() => {
    let list = ALL_INSTRUMENTS;
    if (activeTab === 'stocks') list = INSTRUMENTS.stocks;
    else if (activeTab === 'crypto') list = INSTRUMENTS.crypto;
    else if (activeTab === 'forex') list = INSTRUMENTS.forex;
    else if (activeTab === 'commodities') list = INSTRUMENTS.commodities || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }

    return list.map(inst => {
      const p = prices[inst.id] || { price: inst.price, changePct: 0, high: inst.price, low: inst.price, volume: 1000000 };
      const bars = ohlcHistory[inst.id]?.['1m'] || [];
      const dir = calculateMovingDirection(inst.id, p, bars);
      const assetFlow = marketFlowData?.assetFlows?.[inst.id] || {
        inflowM: 50,
        outflowM: 40,
        netFlowM: 10,
        buyPct: 55,
        sellPct: 45,
      };

      return {
        ...inst,
        curPrice: p.price,
        changePct: p.changePct,
        high: p.high,
        low: p.low,
        volume: p.volume,
        dir,
        assetFlow,
      };
    }).filter(item => {
      if (directionFilter === 'BULLISH') return item.dir.status === 'BULLISH' || item.dir.status === 'STRONG_BULLISH';
      if (directionFilter === 'BEARISH') return item.dir.status === 'BEARISH' || item.dir.status === 'STRONG_BEARISH';
      return true;
    });
  }, [prices, ohlcHistory, marketFlowData, activeTab, searchQuery, directionFilter]);

  const handleTriggerPreset = () => {
    const item = triggerCatalyst(selectedCatalystPreset);
    if (item) {
      setSelectedBreakingNews(item);
    }
  };

  const breakingNewsList = useMemo(() => {
    return news.filter(n => n.isBreaking || n.impactLevel === 'CRITICAL' || n.impactLevel === 'HIGH').slice(0, 6);
  }, [news]);

  // Filtered Algorithmic Signals for Radar
  const displayedSignals = useMemo(() => {
    if (!tradingSignals) return [];
    return tradingSignals.filter(sig => {
      if (signalFilter === 'BUY') return sig.signal === 'BUY';
      if (signalFilter === 'SELL') return sig.signal === 'SELL';
      if (signalFilter === 'HIGH') return sig.confidence >= 75;
      return true;
    });
  }, [tradingSignals, signalFilter]);

  const {
    netMarketFlowM = 0,
    totalMarketInflowM = 0,
    totalMarketOutflowM = 0,
    marketBuyPct = 50,
    advancingCount = 0,
    decliningCount = 0,
    fearAndGreed = 50,
    macroLabel = 'BALANCED FLOW',
    macroColor = 'var(--cyan)',
    sectorFlows = [],
  } = marketFlowData || {};

  return (
    <div className="market-flow-layout">
      {/* Top Banner: Macro Regime & Moving Direction Radar */}
      <div className="flow-regime-card glass-card">
        <div className="regime-header-row">
          <div className="regime-left">
            <div className="regime-badge-group">
              <span className="regime-main-pill" style={{ borderColor: macroColor, color: macroColor }}>
                <Compass size={14} className="animate-spin" style={{ animationDuration: '8s' }} />
                MACRO MOVING DIRECTION
              </span>
              <span className="regime-live-pill">
                <span className="live-dot" /> LIVE ORDER FLOW ENGINE
              </span>
            </div>
            <h1 className="regime-title" style={{ color: macroColor }}>{macroLabel}</h1>
          </div>

          {/* Quick Catalyst Launcher */}
          <div className="regime-catalyst-box">
            <div className="catalyst-box-header">
              <Flame size={13} className="text-red" />
              <span>TEST BREAKING MARKET CATALYST</span>
            </div>
            <div className="catalyst-box-controls">
              <select
                className="catalyst-select"
                value={selectedCatalystPreset}
                onChange={e => setSelectedCatalystPreset(e.target.value)}
              >
                {PRESET_BREAKING_NEWS.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    [{cat.impactLevel}] {cat.headline.substring(0, 48)}...
                  </option>
                ))}
              </select>
              <button className="btn-inject-catalyst" onClick={handleTriggerPreset}>
                <Zap size={13} />
                Inject Shock
              </button>
            </div>
          </div>
        </div>

        {/* Macro Gauge Metrics Bar */}
        <div className="regime-metrics-row">
          <div className="regime-stat-item">
            <span className="stat-label">Net Capital Flow (24h)</span>
            <span className={`stat-value text-mono ${netMarketFlowM >= 0 ? 'text-green' : 'text-red'}`}>
              {netMarketFlowM >= 0 ? '+' : '-'}${Math.abs(netMarketFlowM).toLocaleString()}M
            </span>
            <span className="stat-sub text-muted">
              ${totalMarketInflowM.toLocaleString()}M In / ${totalMarketOutflowM.toLocaleString()}M Out
            </span>
          </div>

          <div className="regime-stat-item">
            <span className="stat-label">Order Flow Imbalance</span>
            <div className="flow-ratio-bar-wrap">
              <div className="flow-ratio-bar">
                <div className="flow-ratio-fill buy-fill" style={{ width: `${marketBuyPct}%` }} />
                <div className="flow-ratio-fill sell-fill" style={{ width: `${100 - marketBuyPct}%` }} />
              </div>
              <div className="flow-ratio-legend">
                <span className="text-green text-mono">{marketBuyPct}% Buy Delta</span>
                <span className="text-red text-mono">{100 - marketBuyPct}% Sell Delta</span>
              </div>
            </div>
          </div>

          <div className="regime-stat-item">
            <span className="stat-label">Market Breadth</span>
            <span className="stat-value text-mono">
              <span className="text-green">{advancingCount} Up</span>
              <span className="text-muted" style={{ margin: '0 6px' }}>/</span>
              <span className="text-red">{decliningCount} Down</span>
            </span>
            <span className="stat-sub text-muted">Advance/Decline Ratio</span>
          </div>

          <div className="regime-stat-item">
            <span className="stat-label">Sentiment & Liquidity Index</span>
            <div className="fear-greed-wrap">
              <span className="stat-value text-mono" style={{ color: fearAndGreed >= 60 ? 'var(--green)' : fearAndGreed <= 40 ? 'var(--red)' : 'var(--amber)' }}>
                {fearAndGreed} <span style={{ fontSize: 13, fontWeight: 500 }}>/ 100</span>
              </span>
              <span className="stat-sub" style={{ color: fearAndGreed >= 60 ? 'var(--green)' : fearAndGreed <= 40 ? 'var(--red)' : 'var(--amber)' }}>
                {fearAndGreed >= 75 ? 'Extreme Greed' : fearAndGreed >= 55 ? 'Greed' : fearAndGreed <= 30 ? 'Extreme Fear' : 'Neutral'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sector Capital Flow & Moving Direction Matrix */}
      <div className="flow-content-grid">
        {/* Left Column: Sector Capital Flows & Technical Consensus Table */}
        <div className="flow-main-column">
          {/* Sector Capital Flow Bar Grid */}
          <div className="glass-card flow-card">
            <div className="card-header-clean">
              <div className="card-header-title">
                <Layers size={16} className="text-cyan" />
                <span>Sector Capital Flow & Liquidity Inflow</span>
              </div>
              <span className="text-xs text-muted">Net Institutional Movement by Sector</span>
            </div>

            <div className="sector-flows-grid">
              {sectorFlows.map(sec => {
                const isNetPositive = sec.netFlowM >= 0;
                return (
                  <div key={sec.id} className="sector-flow-item">
                    <div className="sector-item-top">
                      <div className="sector-title-group">
                        <span className="sector-dot" style={{ background: sec.color }} />
                        <span className="sector-name">{sec.id}</span>
                      </div>
                      <span className={`sector-net-flow text-mono ${isNetPositive ? 'text-green' : 'text-red'}`}>
                        {isNetPositive ? '+' : '-'}${Math.abs(sec.netFlowM)}M
                      </span>
                    </div>

                    <div className="sector-bar-track">
                      <div
                        className="sector-bar-fill"
                        style={{
                          width: `${sec.buyVolPct}%`,
                          background: isNetPositive ? 'var(--green)' : 'var(--red)',
                        }}
                      />
                    </div>

                    <div className="sector-item-footer">
                      <span className="text-xs text-muted">{sec.buyVolPct}% Buy Volume</span>
                      <span className={`text-xs text-mono ${sec.avgChange >= 0 ? 'text-green' : 'text-red'}`}>
                        {sec.avgChange >= 0 ? '+' : ''}{sec.avgChange}% avg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Algorithmic Trading Signals Radar - 15m Short Profit */}
          <div className="glass-card flow-card signals-radar-card">
            <div className="card-header-clean" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="card-header-title">
                <Target size={16} className="text-cyan" />
                <span>Live Algorithmic Trading Signals Radar</span>
                <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                  NEXT 15M SHORT PROFIT
                </span>
              </div>

              {/* Signals Filter Tabs */}
              <div className="pill-group">
                {[
                  { id: 'ALL', label: 'All Signals' },
                  { id: 'BUY', label: 'Buy / Long' },
                  { id: 'SELL', label: 'Sell / Short' },
                  { id: 'HIGH', label: 'High Conviction (75%+)' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`pill-btn ${signalFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setSignalFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="signals-radar-grid">
              {displayedSignals.map(sig => {
                const isBuy = sig.signal === 'BUY';
                const isSell = sig.signal === 'SELL';
                const p = prices[sig.symbol];
                const inst = ALL_INSTRUMENTS.find(i => i.id === sig.symbol);

                return (
                  <div
                    key={sig.symbol}
                    className={`signal-radar-item signal-border-${sig.signal.toLowerCase()}`}
                  >
                    <div className="radar-item-top">
                      <div className="radar-sym-info">
                        <span
                          className="asset-sym-badge"
                          style={{
                            color: inst?.color || 'var(--cyan)',
                            borderColor: (inst?.color || 'var(--cyan)') + '44',
                          }}
                        >
                          {sig.symbol}
                        </span>
                        <div>
                          <div className="fw-700 text-sm">{inst?.name || sig.symbol}</div>
                          <div className="text-xs text-mono text-muted">
                            ${formatPrice(p?.price || sig.entryPrice, sig.symbol)}
                          </div>
                        </div>
                      </div>

                      <div className="radar-signal-badge-wrap">
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(0, 212, 255, 0.12)',
                            color: 'var(--cyan)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            fontSize: 10,
                          }}
                        >
                          15M: {sig.guess15m?.direction === 'UP' ? '↗ Bull' : sig.guess15m?.direction === 'DOWN' ? '↘ Bear' : '↔ Chop'}
                        </span>
                        <span
                          className={`badge ${
                            isBuy ? 'badge-green' : isSell ? 'badge-red' : 'badge-amber'
                          }`}
                        >
                          <Zap size={11} />
                          {sig.strength}
                        </span>
                        <span className="radar-conf-badge">
                          <ShieldCheck size={11} />
                          {sig.confidence}% Conf.
                        </span>
                      </div>
                    </div>

                    {/* Levels Matrix */}
                    <div className="radar-levels-box">
                      <div className="radar-level-col">
                        <span className="level-lbl">ENTRY</span>
                        <span className="level-val text-mono">
                          ${formatPrice(sig.entryPrice, sig.symbol)}
                        </span>
                      </div>
                      <div className="radar-level-col">
                        <span className="level-lbl">SHORT TP (15M)</span>
                        <span className="level-val text-mono text-green">
                          ${formatPrice(sig.tp1, sig.symbol)}
                          <small> (+{sig.tp1Pct}%)</small>
                        </span>
                      </div>
                      <div className="radar-level-col">
                        <span className="level-lbl">TIGHT SL</span>
                        <span className="level-val text-mono text-red">
                          ${formatPrice(sig.stopLoss, sig.symbol)}
                          <small> ({sig.slPct}%)</small>
                        </span>
                      </div>
                      <div className="radar-level-col">
                        <span className="level-lbl">RISK/REWARD</span>
                        <span className="level-val text-mono text-cyan">
                          {sig.riskReward}
                        </span>
                      </div>
                    </div>

                    {/* Confluence Reason Bullet */}
                    {sig.reasons?.[0] && (
                      <div className="radar-reason-text text-xs text-muted">
                        <span className="radar-reason-dot" />
                        <span>
                          <strong>{typeof sig.reasons[0] === 'object' ? sig.reasons[0].title : 'Confluence'}:</strong>{' '}
                          {typeof sig.reasons[0] === 'object' ? sig.reasons[0].detail : sig.reasons[0]}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="radar-item-actions">
                      <button
                        type="button"
                        className="btn-radar-chart"
                        onClick={() => navigateTo('markets', sig.symbol)}
                        title={`Inspect ${sig.symbol} 15m Chart`}
                      >
                        Chart <ArrowUpRight size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-radar-trade"
                        onClick={() => applySignalToTrade(sig)}
                        title={`Execute 15m Scalp on ${sig.symbol}`}
                      >
                        <Zap size={12} />
                        <span>Trade 15m Scalp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Moving Direction & Momentum Consensus Table */}
          <div className="glass-card flow-card">
            <div className="card-header-clean" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="card-header-title">
                <BarChart3 size={16} className="text-cyan" />
                <span>Instrument Moving Direction & Trend Matrix</span>
              </div>

              {/* Filters Toolbar */}
              <div className="table-filters-toolbar">
                <div className="search-input-wrap">
                  <Search size={13} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Search asset..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flow-search-input"
                  />
                </div>

                <div className="pill-group">
                  {['all', 'stocks', 'crypto', 'forex', 'commodities'].map(tab => (
                    <button
                      key={tab}
                      className={`pill-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="pill-group">
                  {['ALL', 'BULLISH', 'BEARISH'].map(dir => (
                    <button
                      key={dir}
                      className={`pill-btn ${directionFilter === dir ? 'active' : ''}`}
                      onClick={() => setDirectionFilter(dir)}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flow-table-container">
              <table className="flow-table">
                <thead>
                  <tr>
                    <th>ASSET</th>
                    <th>PRICE / 24H</th>
                    <th>MOVING DIRECTION</th>
                    <th>MOMENTUM SCORE</th>
                    <th>RSI</th>
                    <th>ORDER FLOW DELTA</th>
                    <th>PIVOT S / R</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstruments.map(item => {
                    const up = item.changePct >= 0;
                    const dir = item.dir;
                    return (
                      <tr key={item.id} className="flow-table-row">
                        <td>
                          <div className="table-asset-cell">
                            <span className="asset-sym-badge" style={{ color: item.color, borderColor: item.color + '44' }}>
                              {item.id}
                            </span>
                            <div>
                              <div className="asset-name-text">{item.name}</div>
                              <div className="asset-sector-text text-muted">{item.sector}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="text-mono fw-600">${formatPrice(item.curPrice, item.id)}</div>
                          <div className={`text-xs text-mono ${up ? 'text-green' : 'text-red'}`}>
                            {up ? '▲ +' : '▼ '}{item.changePct.toFixed(2)}%
                          </div>
                        </td>

                        <td>
                          <span
                            className="direction-status-badge"
                            style={{
                              borderColor: dir.color + '66',
                              color: dir.color,
                              background: dir.color + '18',
                            }}
                          >
                            {dir.label}
                          </span>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>{dir.emaStatus}</div>
                        </td>

                        <td>
                          <div className="score-cell-wrap">
                            <div className="score-bar-track">
                              <div
                                className="score-bar-fill"
                                style={{
                                  width: `${dir.score}%`,
                                  background: dir.color,
                                }}
                              />
                            </div>
                            <span className="text-mono text-xs fw-600">{dir.score} / 100</span>
                          </div>
                        </td>

                        <td>
                          <span className={`text-mono text-xs fw-600 ${dir.rsi >= 70 ? 'text-red' : dir.rsi <= 30 ? 'text-green' : 'text-secondary'}`}>
                            {dir.rsi}
                          </span>
                          <div className="text-xs text-muted">
                            {dir.rsi >= 70 ? 'Overbought' : dir.rsi <= 30 ? 'Oversold' : 'Neutral'}
                          </div>
                        </td>

                        <td>
                          <div className="table-flow-delta">
                            <span className="text-mono text-xs text-green">{item.assetFlow.buyPct}% Buy</span>
                            <div className="mini-delta-bar">
                              <div className="mini-delta-fill" style={{ width: `${item.assetFlow.buyPct}%` }} />
                            </div>
                            <span className="text-mono text-xs text-muted">Net: {item.assetFlow.netFlowM >= 0 ? '+' : ''}{item.assetFlow.netFlowM}M</span>
                          </div>
                        </td>

                        <td>
                          <div className="pivots-cell text-mono text-xs">
                            <div><span className="text-muted">R:</span> ${formatPrice(dir.resistance, item.id)}</div>
                            <div><span className="text-muted">S:</span> ${formatPrice(dir.support, item.id)}</div>
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-table-action"
                            onClick={() => navigateTo('markets', item.id)}
                            title={`Inspect ${item.id} Chart & Order Book`}
                          >
                            Chart <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Institutional Whale Flow Tape & Breaking News Radar */}
        <div className="flow-sidebar-column">
          {/* Breaking News Market Impact Radar */}
          <div className="glass-card flow-card">
            <div className="card-header-clean">
              <div className="card-header-title">
                <Flame size={16} className="text-red" />
                <span>Breaking News Market Catalysts</span>
              </div>
              <span className="text-xs text-green fw-600">LIVE IMPACT</span>
            </div>

            <div className="flow-breaking-list">
              {breakingNewsList.map((item, idx) => {
                const isCritical = item.impactLevel === 'CRITICAL';
                return (
                  <div
                    key={item.id || idx}
                    className="breaking-radar-card"
                    onClick={() => setSelectedBreakingNews(item)}
                    title="Click to view detailed market impact and trade options"
                  >
                    <div className="breaking-radar-top">
                      <span className={`impact-pill ${isCritical ? 'impact-critical' : 'impact-high'}`}>
                        {isCritical ? <Flame size={11} /> : <Zap size={11} />}
                        {item.impactLevel || 'HIGH'} IMPACT
                      </span>
                      <span className="text-xs text-muted text-mono">{item.time}</span>
                    </div>

                    <h4 className="breaking-radar-headline">{item.text}</h4>

                    <div className="breaking-radar-footer">
                      <span className="badge" style={{ background: item.color + '22', color: item.color }}>
                        {item.sym}
                      </span>
                      {item.correlatedSymbols && item.correlatedSymbols.length > 0 && (
                        <span className="text-xs text-muted">
                          +{item.correlatedSymbols.slice(0, 2).join(', ')}
                        </span>
                      )}
                      <span className={`text-xs fw-600 ${item.type === 'bullish' ? 'text-green' : 'text-red'}`} style={{ marginLeft: 'auto' }}>
                        {item.type === 'bullish' ? '▲ Bullish' : '▼ Bearish'} Shock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Institutional Whale Tape */}
          <div className="glass-card flow-card">
            <div className="card-header-clean">
              <div className="card-header-title">
                <Activity size={16} className="text-amber" />
                <span>Institutional Whale Block Tape</span>
              </div>
              <div className="live-dot" />
            </div>

            <div className="whale-tape-list">
              {whaleOrders.map(order => {
                const isBuy = order.side === 'BUY';
                return (
                  <div key={order.id} className="whale-tape-item animate-fade-in">
                    <div className="whale-tape-left">
                      <div className="whale-tape-sym-row">
                        <span className={`whale-side-badge ${isBuy ? 'whale-buy' : 'whale-sell'}`}>
                          {order.side}
                        </span>
                        <span className="whale-sym fw-700" style={{ color: order.color }}>
                          {order.symbol}
                        </span>
                        <span className="text-xs text-muted text-mono">{order.time}</span>
                      </div>
                      <div className="whale-type-text text-muted">{order.type} • {order.venue}</div>
                    </div>

                    <div className="whale-tape-right">
                      <span className="whale-notional text-mono fw-700">
                        ${order.notionalUSD}M
                      </span>
                      <span className="whale-qty text-muted text-mono">
                        {order.qty} @ ${formatPrice(order.price, order.symbol)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
