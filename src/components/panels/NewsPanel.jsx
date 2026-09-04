// src/components/panels/NewsPanel.jsx
import { useMarket } from '../../context/MarketContext';
import './NewsPanel.css';

export default function NewsPanel() {
  const { news, navigateTo } = useMarket();

  return (
    <div className="news-card glass-card">
      <div className="panel-header">
        <span className="panel-title">Market News</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" />
          <span className="text-xs text-green fw-600">LIVE</span>
        </div>
      </div>
      <div className="news-list">
        {news.slice(0, 12).map((item, idx) => (
          <div
            key={item.id}
            className="news-item animate-fade-in-up"
            style={{ animationDelay: `${idx * 20}ms`, cursor: 'pointer' }}
            onClick={() => navigateTo('markets', item.sym)}
            title={`View ${item.sym} in Markets`}
          >
            <div className="news-accent-line" style={{ background: item.type === 'bullish' ? 'var(--green)' : 'var(--red)' }} />
            <div className="news-content">
              <div className="news-sym-row">
                <span className="news-sym badge" style={{ background: item.color + '22', color: item.color }}>{item.sym}</span>
                <span className="news-time text-mono text-muted">{item.time}</span>
                <span className={`badge ${item.type === 'bullish' ? 'badge-green' : 'badge-red'}`}>
                  {item.type === 'bullish' ? '▲ Bullish' : '▼ Bearish'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--cyan)', marginLeft: 'auto' }}>Chart &rarr;</span>
              </div>
              <p className="news-text">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
