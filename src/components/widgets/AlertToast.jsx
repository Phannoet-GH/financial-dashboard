// src/components/widgets/AlertToast.jsx
import { useEffect, useState } from 'react';
import { Bell, ArrowUpRight, ArrowDownRight, X, ExternalLink } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import './AlertToast.css';

export default function AlertToast() {
  const { activeAlertToast, dismissAlertToast, navigateTo } = useMarket();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!activeAlertToast) return;

    setProgress(100);
    const startTime = Date.now();
    const duration = 6000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        dismissAlertToast();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeAlertToast, dismissAlertToast]);

  if (!activeAlertToast) return null;

  const isUp = activeAlertToast.condition === 'gte';

  return (
    <div className="alert-toast-container">
      <div className="glass-card alert-toast-card animate-toast-slide">
        <div className="toast-header">
          <div className="toast-title-group">
            <div className={`toast-icon-pulse ${isUp ? 'icon-bullish' : 'icon-bearish'}`}>
              <Bell size={16} />
            </div>
            <div>
              <div className="toast-title">
                PRICE THRESHOLD TRIGGERED
              </div>
              <div className="toast-time text-xs text-muted">
                {activeAlertToast.time || 'Just now'}
              </div>
            </div>
          </div>
          <button
            className="toast-close-btn"
            onClick={dismissAlertToast}
            title="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>

        <div className="toast-body">
          <div className="toast-symbol-pill">
            <span className="toast-sym-text">{activeAlertToast.symbol}</span>
            <span className={`toast-dir-badge ${isUp ? 'text-green' : 'text-red'}`}>
              {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {isUp ? 'Crossed Above' : 'Dropped Below'}
            </span>
          </div>

          <div className="toast-price-info">
            <div className="toast-price-val text-mono">
              ${typeof activeAlertToast.price === 'number' ? activeAlertToast.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : activeAlertToast.price}
            </div>
            <div className="toast-target-val text-xs text-muted text-mono">
              Target: ${typeof activeAlertToast.targetPrice === 'number' ? activeAlertToast.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : activeAlertToast.targetPrice}
            </div>
          </div>
        </div>

        {activeAlertToast.note && (
          <div className="toast-note text-xs text-secondary">
            "{activeAlertToast.note}"
          </div>
        )}

        <div className="toast-actions">
          <button
            className="btn-toast-action"
            onClick={() => {
              navigateTo('markets', activeAlertToast.symbol);
              dismissAlertToast();
            }}
          >
            <ExternalLink size={13} />
            Open {activeAlertToast.symbol} Chart
          </button>
        </div>

        {/* Progress bar */}
        <div className="toast-progress-track">
          <div
            className={`toast-progress-fill ${isUp ? 'fill-green' : 'fill-amber'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
