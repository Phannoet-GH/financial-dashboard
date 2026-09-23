// src/components/panels/TradePanel.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice, getUnitLabel } from '../../data/instruments';
import { calculateTradingSignal } from '../../data/marketSignals';
import { Zap, ShieldCheck, Target, Clock } from 'lucide-react';
import './TradePanel.css';

export default function TradePanel() {
  const {
    prices,
    buy,
    sell,
    selectedSymbol,
    setSelectedSymbol,
    tpSlOrders,
    removeTpSlOrder,
    pendingLimitOrders,
    addLimitOrder,
    cancelLimitOrder,
    portfolioStats,
    ohlcHistory,
    marketFlowData,
    tradeSignalPrefill,
    setTradeSignalPrefill,
  } = useMarket();

  const [activeTab, setActiveTab] = useState('trade'); // 'trade' | 'pending'
  const [side, setSide] = useState('buy'); // 'buy' | 'sell'
  const [orderType, setOrderType] = useState('market'); // 'market' | 'limit'
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [leverage, setLeverage] = useState(1); // 1, 2, 5, 10, 20
  const [status, setStatus] = useState(null);

  // Take Profit & Stop Loss state
  const [enableTpSl, setEnableTpSl] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const p = prices[selectedSymbol];
  const qtyN = parseFloat(qty) || 0;
  const execPrice = orderType === 'limit' && parseFloat(limitPrice) ? parseFloat(limitPrice) : (p?.price || 0);
  const notionalTotal = qtyN * execPrice;
  const marginRequired = leverage > 1 ? notionalTotal / leverage : notionalTotal;

  // Estimated Liquidation Price for leveraged orders
  const liqPrice = leverage > 1 && execPrice > 0
    ? side === 'buy'
      ? execPrice * (1 - 0.85 / leverage)
      : execPrice * (1 + 0.85 / leverage)
    : null;

  // Estimated TP / SL profit
  const tpNum = parseFloat(takeProfit);
  const slNum = parseFloat(stopLoss);
  const estTpProfit = p && tpNum
    ? side === 'buy'
      ? tpNum > p.price ? (tpNum - p.price) * qtyN : 0
      : tpNum < p.price ? (p.price - tpNum) * qtyN : 0
    : 0;
  const estTpPct = p && tpNum
    ? side === 'buy'
      ? tpNum > p.price ? ((tpNum - p.price) / p.price * 100).toFixed(2) : null
      : tpNum < p.price ? ((p.price - tpNum) / p.price * 100).toFixed(2) : null
    : null;
  const estSlLoss = p && slNum
    ? side === 'buy'
      ? slNum < p.price ? (p.price - slNum) * qtyN : 0
      : slNum > p.price ? (slNum - p.price) * qtyN : 0
    : 0;
  const estSlPct = p && slNum
    ? side === 'buy'
      ? slNum < p.price ? ((p.price - slNum) / p.price * 100).toFixed(2) : null
      : slNum > p.price ? ((slNum - p.price) / p.price * 100).toFixed(2) : null
    : null;

  function setTpPreset(pct) {
    if (!p) return;
    const target = side === 'buy' ? p.price * (1 + pct / 100) : p.price * (1 - pct / 100);
    setTakeProfit(target.toFixed(selectedSymbol.includes('/') ? 4 : 2));
  }

  function setSlPreset(pct) {
    if (!p) return;
    const target = side === 'buy' ? p.price * (1 - pct / 100) : p.price * (1 + pct / 100);
    setStopLoss(target.toFixed(selectedSymbol.includes('/') ? 4 : 2));
  }

  function setLimitPreset(pctOffset) {
    if (!p) return;
    const target = p.price * (1 + pctOffset / 100);
    setLimitPrice(target.toFixed(selectedSymbol.includes('/') ? 4 : 2));
  }

  function applyCashPreset(ratio) {
    if (!p || p.price <= 0) return;
    const available = (portfolioStats?.cash || 0) * ratio;
    const maxNotional = available * leverage;
    const calculatedQty = maxNotional / p.price;
    setQty(selectedSymbol.includes('/') ? calculatedQty.toFixed(2) : calculatedQty < 1 ? calculatedQty.toFixed(4) : calculatedQty.toFixed(2));
  }

  // Algorithmic Trading Signal for Current Symbol
  const currentSignal = useMemo(() => {
    return calculateTradingSignal(
      selectedSymbol,
      p,
      ohlcHistory[selectedSymbol]?.['1m'] || [],
      marketFlowData?.assetFlows?.[selectedSymbol]
    );
  }, [selectedSymbol, p, ohlcHistory, marketFlowData]);

  // Apply signal levels to form inputs
  const applySignalValues = useCallback((sig) => {
    if (!sig) return;
    setSide(sig.signal === 'SELL' ? 'sell' : 'buy');
    setEnableTpSl(true);
    setTakeProfit(String(sig.tp1));
    setStopLoss(String(sig.stopLoss));

    // Preset appropriate default quantity if empty
    setQty(prev => {
      if (!prev || parseFloat(prev) <= 0) {
        if (selectedSymbol.includes('XAU')) return '1.0';
        if (selectedSymbol.includes('XAG')) return '50';
        if (selectedSymbol === 'BTC') return '0.25';
        if (selectedSymbol === 'ETH') return '2';
        if (selectedSymbol.includes('/')) return '1000';
        return '10';
      }
      return prev;
    });

    setStatus({
      ok: true,
      msg: `Applied 15m Scalp: ${sig.signal} on ${selectedSymbol} (Short TP: $${sig.tp1} | SL: $${sig.stopLoss})`
    });
    setTimeout(() => setStatus(null), 3500);
  }, [selectedSymbol]);

  // Watch for external prefill requests (from Chart Ribbon or Radar)
  useEffect(() => {
    if (tradeSignalPrefill && tradeSignalPrefill.symbol === selectedSymbol) {
      applySignalValues(tradeSignalPrefill);
      setTradeSignalPrefill(null);
    }
  }, [tradeSignalPrefill, selectedSymbol, applySignalValues, setTradeSignalPrefill]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!qtyN || qtyN <= 0) return;

    if (orderType === 'limit') {
      const lPriceNum = parseFloat(limitPrice);
      if (!lPriceNum || lPriceNum <= 0) {
        setStatus({ ok: false, msg: 'Please enter a valid limit price' });
        return;
      }
      const res = addLimitOrder({
        symbol: selectedSymbol,
        side,
        qty: qtyN,
        limitPrice: lPriceNum,
        leverage
      });
      setStatus({
        ok: res.ok,
        msg: `Limit ${side.toUpperCase()} queued for ${qtyN} ${selectedSymbol} @ $${lPriceNum} (${leverage}x)`
      });
      setQty('');
      setLimitPrice('');
      setTimeout(() => setStatus(null), 3500);
      return;
    }

    // Market Order Execution
    const tpVal = enableTpSl && side === 'buy' && takeProfit ? takeProfit : null;
    const slVal = enableTpSl && side === 'buy' && stopLoss ? stopLoss : null;

    const result = side === 'buy'
      ? buy(selectedSymbol, qtyN, tpVal, slVal)
      : sell(selectedSymbol, qtyN);

    let successMsg = `${side === 'buy' ? 'Bought' : 'Sold'} ${qtyN} ${selectedSymbol} @ $${p?.price.toFixed(2)} (${leverage}x)`;
    if (tpVal) successMsg += ` (TP: $${tpVal})`;
    if (slVal) successMsg += ` (SL: $${slVal})`;

    setStatus({
      ok: result?.ok,
      msg: result?.ok ? successMsg : result?.error,
    });

    if (result?.ok) {
      setQty('');
      setTakeProfit('');
      setStopLoss('');
    }
    setTimeout(() => setStatus(null), 3500);
  }

  const allActiveLimits = pendingLimitOrders?.filter(o => o.active) || [];
  const totalPendingCount = allActiveLimits.length + (tpSlOrders?.filter(o => o.active)?.length || 0);

  return (
    <div className="trade-card glass-card">
      <div className="panel-header">
        <div className="trade-mode-tabs">
          <button
            className={`trade-mode-tab ${activeTab === 'trade' ? 'active' : ''}`}
            onClick={() => setActiveTab('trade')}
          >
            Order Simulator
          </button>
          <button
            className={`trade-mode-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({totalPendingCount})
          </button>
        </div>

        {activeTab === 'trade' && (
          <div className="tab-bar">
            <button
              className={`tab-item${side === 'buy' ? ' active' : ''}`}
              onClick={() => setSide('buy')}
              style={side === 'buy' ? { color: 'var(--green)', background: 'var(--green-dim)' } : {}}
            >
              Buy / Long
            </button>
            <button
              className={`tab-item${side === 'sell' ? ' active' : ''}`}
              onClick={() => setSide('sell')}
              style={side === 'sell' ? { color: 'var(--red)', background: 'var(--red-dim)' } : {}}
            >
              Sell / Short
            </button>
          </div>
        )}
      </div>

      {activeTab === 'pending' ? (
        <div className="pending-orders-container animate-fade-in">
          {totalPendingCount === 0 ? (
            <div className="no-pending-orders">
              <span style={{ fontSize: 22 }}>📋</span>
              <p>No active limit or bracket orders</p>
              <span className="text-xs text-muted">Place a Limit or TP/SL order to simulate automated execution.</span>
            </div>
          ) : (
            <div className="pending-orders-list">
              {allActiveLimits.map(o => (
                <div key={o.id} className="pending-order-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${o.side === 'buy' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        LIMIT {o.side.toUpperCase()}
                      </span>
                      <span className="text-mono fw-700">{o.qty} {o.symbol}</span>
                      {o.leverage > 1 && <span className="badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 9 }}>{o.leverage}x</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      Target: <strong style={{ color: '#fff' }}>${o.limitPrice.toFixed(2)}</strong> &bull; Current: ${prices[o.symbol]?.price?.toFixed(2) || '-'} &bull; {o.createdAt}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => cancelLimitOrder(o.id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}

              {tpSlOrders?.filter(o => o.active)?.map(o => (
                <div key={o.id} className="pending-order-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 10 }}>BRACKET TP/SL</span>
                      <span className="text-mono fw-700">{o.qty} {o.symbol}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 3 }}>
                      {o.takeProfit && <span className="text-green">TP: ${o.takeProfit}</span>}
                      {o.stopLoss && <span className="text-red">SL: ${o.stopLoss}</span>}
                      <span className="text-muted">&bull; {o.createdAt}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => removeTpSlOrder(o.id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form className="trade-form animate-fade-in" onSubmit={handleSubmit}>
          {/* Order Type Selector */}
          <div className="order-type-switch">
            <button
              type="button"
              className={`order-type-btn ${orderType === 'market' ? 'active' : ''}`}
              onClick={() => setOrderType('market')}
            >
              Market Order
            </button>
            <button
              type="button"
              className={`order-type-btn ${orderType === 'limit' ? 'active' : ''}`}
              onClick={() => {
                setOrderType('limit');
                if (p && !limitPrice) setLimitPrice(p.price.toFixed(2));
              }}
            >
              Limit Order
            </button>
          </div>

          {/* Instrument */}
          <div className="form-group">
            <label className="form-label">Instrument</label>
            <select className="select w-full" value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
              {ALL_INSTRUMENTS.map(i => (
                <option key={i.id} value={i.id}>{i.id} — {i.name}</option>
              ))}
            </select>
          </div>

          {/* Market Price */}
          {p && (
            <div className="trade-price-row">
              <span className="form-label">Live Market Tick</span>
              <span className="text-mono fw-700" style={{ fontSize: 17, color: p.changePct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatPrice(p.price, selectedSymbol)}
              </span>
            </div>
          )}

          {/* Smart Signal Confluence Assistant - Next 15m Short Profit */}
          {currentSignal && (
            <div className={`trade-signal-card signal-border-${currentSignal.signal.toLowerCase()}`}>
              <div className="trade-signal-header">
                <div className="trade-signal-title">
                  <Target
                    size={14}
                    style={{
                      color:
                        currentSignal.signal === 'BUY'
                          ? 'var(--green)'
                          : currentSignal.signal === 'SELL'
                          ? 'var(--red)'
                          : 'var(--amber)',
                    }}
                  />
                  <span className="fw-700">15m Scalp Engine</span>
                  <span
                    className={`badge ${
                      currentSignal.signal === 'BUY'
                        ? 'badge-green'
                        : currentSignal.signal === 'SELL'
                        ? 'badge-red'
                        : 'badge-amber'
                    }`}
                  >
                    {currentSignal.guess15m?.label || currentSignal.strength}
                  </span>
                </div>
                <span className="trade-signal-conf">
                  <ShieldCheck size={12} />
                  {currentSignal.confidence}% Conf.
                </span>
              </div>

              {currentSignal.guess15m?.guessText && (
                <div className="trade-signal-guess-banner">
                  <Clock size={11} className="text-cyan" />
                  <span>{currentSignal.guess15m.guessText}</span>
                </div>
              )}

              <div className="trade-signal-grid">
                <div className="trade-signal-col">
                  <span className="signal-label">Entry Range</span>
                  <span className="signal-value text-mono">
                    ${formatPrice(currentSignal.entryRange?.min || currentSignal.entryPrice, selectedSymbol)} - ${formatPrice(currentSignal.entryRange?.max || currentSignal.entryPrice, selectedSymbol)}
                  </span>
                </div>
                <div className="trade-signal-col">
                  <span className="signal-label">Short TP</span>
                  <span className="signal-value text-mono text-green">
                    ${formatPrice(currentSignal.tp1, selectedSymbol)}
                    <small> (+{currentSignal.tp1Pct}%)</small>
                  </span>
                </div>
                <div className="trade-signal-col">
                  <span className="signal-label">Tight SL</span>
                  <span className="signal-value text-mono text-red">
                    ${formatPrice(currentSignal.stopLoss, selectedSymbol)}
                    <small> ({currentSignal.slPct}%)</small>
                  </span>
                </div>
                <div className="trade-signal-col">
                  <span className="signal-label">Risk : Reward</span>
                  <span className="signal-value text-mono text-cyan">
                    {currentSignal.riskReward}
                  </span>
                </div>
              </div>

              {currentSignal.reasons?.[0] && (
                <div className="trade-signal-rationale">
                  <span className="rationale-dot" />
                  <span>
                    <strong>{typeof currentSignal.reasons[0] === 'object' ? currentSignal.reasons[0].title : 'Confluence'}:</strong>{' '}
                    {typeof currentSignal.reasons[0] === 'object' ? currentSignal.reasons[0].detail : currentSignal.reasons[0]}
                  </span>
                </div>
              )}

              <button
                type="button"
                className="btn-apply-signal-panel"
                onClick={() => applySignalValues(currentSignal)}
              >
                <Zap size={13} />
                <span>Apply 15m Short Profit Target (TP & SL)</span>
              </button>
            </div>
          )}

          {/* Limit Price Input if Limit Order */}
          {orderType === 'limit' && (
            <div className="form-group animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Target Limit Price ($)</label>
                <span className="text-xs text-muted">Triggers automatically on tick</span>
              </div>
              <input
                className="input"
                type="number"
                step="any"
                min="0.0001"
                placeholder={p ? p.price.toFixed(2) : '0.00'}
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                required
              />
              <div className="qty-presets">
                {[-5, -2, -1, 1, 2, 5].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 10, color: pct > 0 ? 'var(--green)' : 'var(--red)' }}
                    onClick={() => setLimitPreset(pct)}
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leverage Slider / Selector */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Leverage / Margin</label>
              <span className="text-mono text-xs" style={{ color: leverage > 1 ? 'var(--cyan)' : 'var(--text-muted)' }}>
                {leverage}x {leverage === 1 ? '(Spot 1:1)' : 'Isolated Margin'}
              </span>
            </div>
            <div className="leverage-chips">
              {[1, 2, 5, 10, 20].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`leverage-chip ${leverage === lvl ? 'active' : ''}`}
                  onClick={() => setLeverage(lvl)}
                >
                  {lvl}x
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Quick Size Presets */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">
                Quantity <span className="text-cyan text-xs" style={{ fontWeight: 600 }}>({getUnitLabel(selectedSymbol)})</span>
              </label>
              <span className="text-xs text-muted">
                Avail: ${(portfolioStats?.cash || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <input
              className="input"
              type="number"
              min="0.0001"
              step="any"
              placeholder={selectedSymbol === 'XAU/USD' || selectedSymbol === 'XAG/USD' ? '1.0 oz' : '0.00'}
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
            />
            <div className="qty-presets">
              {[
                { label: '25%', ratio: 0.25 },
                { label: '50%', ratio: 0.50 },
                { label: '75%', ratio: 0.75 },
                { label: 'MAX', ratio: 0.98 },
              ].map(pre => (
                <button
                  key={pre.label}
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => applyCashPreset(pre.ratio)}
                >
                  {pre.label}
                </button>
              ))}
            </div>
          </div>

          {/* Take Profit & Stop Loss Section */}
          <div className="tpsl-container">
            <div className="tpsl-header" onClick={() => setEnableTpSl(v => !v)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={enableTpSl}
                  onChange={e => setEnableTpSl(e.target.checked)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="form-label" style={{ cursor: 'pointer', margin: 0, color: enableTpSl ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                  Bracket TP & SL Orders
                </span>
              </div>
              <span className="text-xs text-muted">{enableTpSl ? 'Active' : 'Optional'}</span>
            </div>

            {enableTpSl && (
              <div className="tpsl-body animate-fade-in">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ color: 'var(--green)' }}>Take Profit (TP)</label>
                    {estTpPct && <span className="text-mono text-xs" style={{ color: 'var(--green)' }}>+{estTpPct}% (+${estTpProfit.toFixed(2)})</span>}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    className="input"
                    placeholder="Target exit price"
                    value={takeProfit}
                    onChange={e => setTakeProfit(e.target.value)}
                  />
                  <div className="qty-presets">
                    {[0.3, 0.5, 0.8, 1.5].map(pct => (
                      <button key={pct} type="button" className="btn btn-ghost preset-btn-green" onClick={() => setTpPreset(pct)}>
                        +{pct}%
                      </button>
                    ))}
                    <span className="preset-mode-tag" title="Short Profit 15m Target">Short Profit</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ color: 'var(--red)' }}>Stop Loss (SL)</label>
                    {estSlPct && <span className="text-mono text-xs" style={{ color: 'var(--red)' }}>-{estSlPct}% (-${estSlLoss.toFixed(2)})</span>}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    className="input"
                    placeholder="Stop limit price"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                  />
                  <div className="qty-presets">
                    {[0.25, 0.5, 0.8].map(pct => (
                      <button key={pct} type="button" className="btn btn-ghost preset-btn-red" onClick={() => setSlPreset(pct)}>
                        -{pct}%
                      </button>
                    ))}
                    <span className="preset-mode-tag" title="Tight Scalp Stop Loss">Tight SL</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Financial Summary */}
          {qtyN > 0 && p && (
            <div className="trade-summary">
              <div className="trade-summary-row">
                <span>Notional Size</span>
                <span className="text-mono">${notionalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {leverage > 1 && (
                <div className="trade-summary-row" style={{ color: 'var(--cyan)' }}>
                  <span>Margin Required ({leverage}x)</span>
                  <span className="text-mono">${marginRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {liqPrice && (
                <div className="trade-summary-row" style={{ color: 'var(--red)' }}>
                  <span>Est. Liquidation Price</span>
                  <span className="text-mono">${liqPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="trade-summary-row">
                <span>Est. Slippage & Fees</span>
                <span className="text-mono text-muted">$0.00 (Simulated)</span>
              </div>
            </div>
          )}

          {/* Status Alert */}
          {status && (
            <div className={`trade-status ${status.ok ? 'status-ok' : 'status-err'} animate-fade-in`}>
              {status.msg}
            </div>
          )}

          <button
            type="submit"
            className={`btn w-full ${side === 'buy' ? 'btn-buy' : 'btn-sell'}`}
            style={{ justifyContent: 'center', padding: '11px', marginTop: 4 }}
            disabled={!qtyN || qtyN <= 0}
          >
            {orderType === 'limit'
              ? `Place Limit ${side === 'buy' ? 'Buy' : 'Sell'}`
              : `${side === 'buy' ? '▲ Buy / Long' : '▼ Sell / Short'} ${selectedSymbol}`}
          </button>
        </form>
      )}
    </div>
  );
}
