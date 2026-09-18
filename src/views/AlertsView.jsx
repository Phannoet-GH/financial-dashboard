// src/views/AlertsView.jsx
import { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, AlertTriangle, Info, ArrowUpRight, ArrowDownRight, ShieldCheck, Filter } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice } from '../data/instruments';
import './AlertsView.css';

export default function AlertsView() {
  const {
    prices,
    alerts,
    clearAlerts,
    priceTriggers,
    addPriceTrigger,
    removePriceTrigger,
    togglePriceTrigger,
    navigateTo,
    soundEnabled,
    setSoundEnabled,
  } = useMarket();

  const [selectedSym, setSelectedSym] = useState('BTC');
  const [condition, setCondition]     = useState('gte'); // 'gte' | 'lte'
  const [targetPrice, setTargetPrice] = useState('');
  const [triggerNote, setTriggerNote] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  const curInst = ALL_INSTRUMENTS.find(i => i.id === selectedSym);
  const curP    = prices[selectedSym];

  function handleCreateTrigger(e) {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (!priceNum || priceNum <= 0) return;
    addPriceTrigger(selectedSym, condition, priceNum, triggerNote);
    setTargetPrice('');
    setTriggerNote('');
  }

  function setPresetOffset(pct) {
    if (!curP) return;
    const target = curP.price * (1 + pct / 100);
    setTargetPrice(target.toFixed(selectedSym.includes('/') ? 4 : 2));
    setCondition(pct >= 0 ? 'gte' : 'lte');
  }

  const filteredHistory = alerts.filter(a => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'price') return a.msg.includes('PRICE ALERT');
    if (historyFilter === 'trades') return a.msg.includes('Bought') || a.msg.includes('Sold');
    if (historyFilter === 'system') return !a.msg.includes('PRICE ALERT') && !a.msg.includes('Bought') && !a.msg.includes('Sold');
    return true;
  });

  const activeTriggersCount = priceTriggers.filter(t => t.active).length;

  return (
    <div className="alerts-layout">
      {/* Header Metrics */}
      <div className="alerts-metrics-row">
        <div className="glass-card alert-stat-card animate-fade-in-up">
          <div className="alert-stat-icon-wrap" style={{ background: 'rgba(0, 212, 255, 0.12)', color: 'var(--cyan)' }}>
            <Bell size={18} />
          </div>
          <div>
            <div className="alert-stat-label">Active Triggers</div>
            <div className="alert-stat-val text-mono">{activeTriggersCount} <span className="text-muted" style={{ fontSize: 13 }}>/ {priceTriggers.length}</span></div>
          </div>
        </div>

        <div className="glass-card alert-stat-card animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="alert-stat-icon-wrap" style={{ background: 'rgba(255, 179, 71, 0.12)', color: 'var(--amber)' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="alert-stat-label">Notifications Logged</div>
            <div className="alert-stat-val text-mono">{alerts.length}</div>
          </div>
        </div>

        <div className="glass-card alert-stat-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="alert-stat-icon-wrap" style={{ background: 'rgba(0, 255, 136, 0.12)', color: 'var(--green)' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="alert-stat-label">Watcher Engine</div>
            <div className="alert-stat-val" style={{ color: 'var(--green)', fontSize: 16 }}>Live Tick Active</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="alerts-main-grid">
        {/* Left Column: Create Trigger & Active Triggers */}
        <div className="alerts-left-col">
          {/* Create Price Trigger */}
          <div className="glass-card create-alert-card animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color="var(--cyan)" />
                Create Price Alert Trigger
              </span>
              <span className="text-xs text-muted">Auto-triggers notification</span>
            </div>

            <form className="create-alert-form" onSubmit={handleCreateTrigger}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Asset</label>
                  <select
                    className="select w-full"
                    value={selectedSym}
                    onChange={e => {
                      setSelectedSym(e.target.value);
                      setTargetPrice('');
                    }}
                  >
                    {ALL_INSTRUMENTS.map(i => (
                      <option key={i.id} value={i.id}>{i.id} — {i.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Market Price</label>
                  <div className="alert-current-price-box">
                    <span className="text-mono fw-700" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                      {curP ? formatPrice(curP.price, selectedSym) : '—'}
                    </span>
                    {curP && (
                      <span className={`badge ${curP.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {curP.changePct >= 0 ? '+' : ''}{curP.changePct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Trigger Condition</label>
                  <select
                    className="select w-full"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                  >
                    <option value="gte">Price Rises Above or Equal (≥)</option>
                    <option value="lte">Price Drops Below or Equal (≤)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Price ($)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    className="input w-full"
                    placeholder="Enter target price..."
                    value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="alert-presets-row">
                <span className="text-xs text-muted">Quick Presets:</span>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(1)}>+1%</button>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(3)}>+3%</button>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(5)}>+5%</button>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(-1)}>-1%</button>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(-3)}>-3%</button>
                <button type="button" className="btn btn-ghost preset-btn" onClick={() => setPresetOffset(-5)}>-5%</button>
              </div>

              {/* Optional Custom Note */}
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Alert Note / Catalyst Reason (Optional)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Breakout above key resistance, Dip buy target..."
                  value={triggerNote}
                  onChange={e => setTriggerNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', padding: '10px', marginTop: 4 }}
                disabled={!targetPrice}
              >
                <Bell size={15} />
                Set Live Price Watcher
              </button>
            </form>
          </div>

          {/* Active Price Triggers List */}
          <div className="glass-card active-triggers-card animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <div className="panel-header">
              <span className="panel-title">Active Price Watchers</span>
              <span className="text-xs text-muted">{priceTriggers.length} configured</span>
            </div>

            <div className="triggers-list">
              {priceTriggers.length === 0 ? (
                <div className="empty-state-card">
                  <Info size={24} color="var(--text-muted)" />
                  <p>No price triggers configured. Create one above to monitor market breakouts in real time.</p>
                </div>
              ) : (
                priceTriggers.map(trig => {
                  const p = prices[trig.symbol];
                  const curVal = p?.price || 0;
                  const diff = trig.targetPrice - curVal;
                  const pctDistance = curVal > 0 ? (Math.abs(diff) / curVal * 100).toFixed(2) : 0;
                  const isClose = parseFloat(pctDistance) < 2;

                  return (
                    <div key={trig.id} className={`trigger-item ${trig.active ? 'trigger-active' : 'trigger-disabled'}`}>
                      <div className="trigger-left">
                        <div className="trigger-sym-row">
                          <span
                            className="text-mono fw-700 trigger-sym"
                            onClick={() => navigateTo('markets', trig.symbol)}
                            title="Open in Markets"
                          >
                            {trig.symbol}
                          </span>
                          <span className={`badge ${trig.condition === 'gte' ? 'badge-green' : 'badge-red'}`}>
                            {trig.condition === 'gte' ? '≥ (Above)' : '≤ (Below)'} ${trig.targetPrice.toLocaleString()}
                          </span>
                          {!trig.active && (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                              Triggered / Paused
                            </span>
                          )}
                        </div>

                        <div className="trigger-details-row">
                          <span className="text-xs text-muted">Current: <b className="text-mono" style={{ color: 'var(--text-primary)' }}>${curVal.toFixed(2)}</b></span>
                          <span className="text-xs" style={{ color: isClose ? 'var(--amber)' : 'var(--text-secondary)' }}>
                            {diff >= 0 ? `${pctDistance}% below target` : `${pctDistance}% above target`}
                          </span>
                        </div>
                        {trig.note && (
                          <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: 2 }}>
                            "{trig.note}"
                          </div>
                        )}
                      </div>

                      <div className="trigger-actions">
                        <button
                          type="button"
                          className={`btn btn-ghost trigger-toggle-btn ${trig.active ? 'active' : ''}`}
                          onClick={() => togglePriceTrigger(trig.id)}
                          title={trig.active ? 'Pause trigger' : 'Activate trigger'}
                        >
                          {trig.active ? 'Active' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => removePriceTrigger(trig.id)}
                          title="Delete trigger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Notification Log & System Events */}
        <div className="alerts-right-col">
          <div className="glass-card alert-history-card animate-fade-in-up" style={{ animationDelay: '140ms' }}>
            <div className="panel-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="panel-title">Notification History</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {alerts.length > 0 && (
                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={clearAlerts}>
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="history-filter-bar">
              {['all', 'price', 'trades', 'system'].map(f => (
                <button
                  key={f}
                  className={`tab-item${historyFilter === f ? ' active' : ''}`}
                  onClick={() => setHistoryFilter(f)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {f === 'all' ? 'All Alerts' : f === 'price' ? 'Price Hits' : f === 'trades' ? 'Trades' : 'System'}
                </button>
              ))}
            </div>

            <div className="history-list">
              {filteredHistory.length === 0 ? (
                <div className="empty-state-card" style={{ padding: '40px 20px' }}>
                  <CheckCircle2 size={32} color="var(--green)" style={{ opacity: 0.6, marginBottom: 8 }} />
                  <p>All caught up! No recent notifications.</p>
                </div>
              ) : (
                filteredHistory.map(a => {
                  const isWarning = a.type === 'warning' || a.msg.includes('PRICE ALERT');
                  const isSuccess = a.type === 'success' || a.msg.includes('Bought');

                  return (
                    <div key={a.id} className="history-item animate-fade-in-up">
                      <div
                        className="history-indicator"
                        style={{
                          background: isWarning ? 'var(--amber)' : isSuccess ? 'var(--green)' : 'var(--cyan)'
                        }}
                      />
                      <div className="history-item-body">
                        <div className="history-item-top">
                          <span className={`badge ${isWarning ? 'badge-red' : isSuccess ? 'badge-green' : 'badge-cyan'}`} style={{ fontSize: 10 }}>
                            {isWarning ? 'ALERT' : isSuccess ? 'EXECUTED' : 'SYSTEM'}
                          </span>
                          <span className="text-mono text-muted text-xs">{a.time}</span>
                        </div>
                        <div className="history-item-msg">{a.msg}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
