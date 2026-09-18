// src/components/widgets/BreakingNewsModal.jsx
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice } from '../../data/instruments';
import { Zap, TrendingUp, TrendingDown, ExternalLink, X, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import './BreakingNewsModal.css';

export default function BreakingNewsModal() {
  const {
    selectedBreakingNews,
    setSelectedBreakingNews,
    prices,
    navigateTo,
    applyMarketShock,
    addAlert,
    buy,
  } = useMarket();

  if (!selectedBreakingNews) return null;

  const news = selectedBreakingNews;
  const isCritical = news.impactLevel === 'CRITICAL';
  const isBullish = news.type === 'bullish';

  // Gather affected instruments
  const allAffected = [news.sym, ...(news.correlatedSymbols || [])];
  const affectedList = allAffected.map(sym => {
    const inst = ALL_INSTRUMENTS.find(i => i.id === sym);
    const p = prices[sym] || (inst ? { price: inst.price, changePct: 0 } : { price: 100, changePct: 0 });
    return {
      sym,
      name: inst ? inst.name : sym,
      color: inst ? inst.color : '#00d4ff',
      price: p.price,
      changePct: p.changePct,
    };
  });

  const handleSimulateShock = () => {
    applyMarketShock({
      symbols: allAffected,
      direction: news.type,
      magnitudePct: Math.abs(news.expectedImpactPct || 4.0),
    });
    addAlert(`⚡ Shock wave triggered for ${allAffected.join(', ')} (${news.type === 'bullish' ? '+' : '-'}${Math.abs(news.expectedImpactPct)}%)`, 'warning');
  };

  const handleQuickTrade = (sym) => {
    const p = prices[sym];
    if (!p) return;
    const qty = sym === 'BTC' ? 0.25 : sym === 'ETH' ? 2 : 10;
    const res = buy(sym, qty);
    if (res?.ok) {
      setSelectedBreakingNews(null);
      navigateTo('markets', sym);
    }
  };

  return (
    <div className="breaking-modal-backdrop animate-fade-in" onClick={() => setSelectedBreakingNews(null)}>
      <div className="breaking-modal-dialog glass-card animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="breaking-modal-header">
          <div className="breaking-modal-badges">
            <span className={`impact-badge ${isCritical ? 'impact-critical' : 'impact-high'}`}>
              {isCritical ? <Flame size={12} /> : <Zap size={12} />}
              {news.impactLevel || 'HIGH'} IMPACT CATALYST
            </span>
            <span className="breaking-tag">
              <span className="live-dot" />
              BREAKING INTEL
            </span>
            <span className="category-tag">{news.category || 'Macro News'}</span>
          </div>
          <button className="modal-close-btn" onClick={() => setSelectedBreakingNews(null)}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="breaking-modal-body">
          <h2 className="breaking-headline">{news.text}</h2>

          <div className="breaking-meta">
            <span className="source-label">Source: <strong>{news.source || 'FinPulse Live'}</strong></span>
            <span className="dot-sep">•</span>
            <span className="time-label text-mono">{news.time}</span>
            <span className="dot-sep">•</span>
            <span className={`direction-label ${isBullish ? 'text-green' : 'text-red'}`}>
              {isBullish ? <TrendingUp size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> : <TrendingDown size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />}
              {' '}{isBullish ? 'BULLISH CATALYST' : 'BEARISH SHOCK'} (~{Math.abs(news.expectedImpactPct || 3.5)}% Impact)
            </span>
          </div>

          <div className="breaking-summary-box">
            <p className="summary-text">{news.summary || news.text}</p>
          </div>

          {news.rationale && (
            <div className="breaking-rationale-card">
              <div className="rationale-header">
                <ShieldAlert size={14} className="text-cyan" />
                <span>Market Impact Analysis & Rationale</span>
              </div>
              <p className="rationale-text">{news.rationale}</p>
            </div>
          )}

          {/* Affected Assets & Direct Reaction */}
          <div className="affected-section">
            <div className="affected-section-header">
              <span className="section-title">Directly Affected Instruments</span>
              <span className="text-xs text-muted">Live Quotes & Quick Actions</span>
            </div>

            <div className="affected-grid">
              {affectedList.map(item => {
                const up = item.changePct >= 0;
                return (
                  <div key={item.sym} className="affected-card">
                    <div className="affected-card-left">
                      <div className="affected-sym-row">
                        <span className="affected-sym" style={{ color: item.color }}>{item.sym}</span>
                        <span className="affected-name text-muted">{item.name}</span>
                      </div>
                      <div className="affected-price-row">
                        <span className="text-mono fw-600">${formatPrice(item.price, item.sym)}</span>
                        <span className={`text-xs text-mono ${up ? 'text-green' : 'text-red'}`}>
                          {up ? '+' : ''}{item.changePct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="affected-card-actions">
                      <button
                        className="btn-quick-chart"
                        onClick={() => {
                          setSelectedBreakingNews(null);
                          navigateTo('markets', item.sym);
                        }}
                        title="Inspect Chart"
                      >
                        Chart <ArrowRight size={11} />
                      </button>
                      <button
                        className="btn-quick-buy"
                        onClick={() => handleQuickTrade(item.sym)}
                        title={`Quick Buy ${item.sym}`}
                      >
                        Trade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="breaking-modal-footer">
          <div className="footer-left">
            <button className="btn-shock-test" onClick={handleSimulateShock}>
              <Zap size={14} />
              Re-simulate Live Market Shock
            </button>
          </div>
          <div className="footer-right">
            <button className="btn-modal-dismiss" onClick={() => setSelectedBreakingNews(null)}>
              Close
            </button>
            <button
              className="btn-modal-primary"
              onClick={() => {
                setSelectedBreakingNews(null);
                navigateTo('markets', news.sym);
              }}
            >
              Open {news.sym} in Markets Feed
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
