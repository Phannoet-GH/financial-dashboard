// src/components/widgets/KPICard.jsx
import { useRef, useEffect } from 'react';
import './KPICard.css';

export default function KPICard({ title, value, change, changePct, prefix = '$', suffix = '', Icon, color = 'cyan', delay = 0, onClick }) {
  const valueRef = useRef(null);
  const prevRef  = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value && valueRef.current) {
      valueRef.current.classList.remove('updated');
      void valueRef.current.offsetWidth; // force reflow
      valueRef.current.classList.add('updated');
    }
    prevRef.current = value;
  }, [value]);

  const isPositive = changePct >= 0;
  const colorMap = { cyan: 'var(--cyan)', green: 'var(--green)', red: 'var(--red)', amber: 'var(--amber)', purple: 'var(--purple)' };
  const accent = colorMap[color] || 'var(--cyan)';

  function fmt(v) {
    if (typeof v === 'string') return v;
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (Math.abs(v) >= 1e3) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v.toFixed(2);
  }

  return (
    <div
      className={`kpi-card glass-card animate-fade-in-up${onClick ? ' kpi-clickable' : ''}`}
      style={{ '--accent': accent, animationDelay: `${delay}ms` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `View details in Portfolio` : undefined}
    >
      <div className="kpi-top">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div className="kpi-icon" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
            <Icon size={14} color={accent} />
          </div>
        )}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-prefix">{prefix}</span>
        <span ref={valueRef} className="kpi-value number-value">{fmt(value)}</span>
        <span className="kpi-suffix">{suffix}</span>
      </div>
      {changePct !== undefined && (
        <div className="kpi-change" style={{ color: isPositive ? 'var(--green)' : 'var(--red)' }}>
          <span className="kpi-arrow">{isPositive ? '▲' : '▼'}</span>
          <span className="text-mono">{Math.abs(changePct).toFixed(2)}%</span>
          {change !== undefined && (
            <span className="kpi-change-abs">
              {isPositive ? '+' : ''}{change > 0 ? '' : ''}{fmt(Math.abs(change))} today
            </span>
          )}
        </div>
      )}
      <div className="kpi-accent-bar" style={{ background: accent }} />
    </div>
  );
}
