// src/components/panels/NewsPanel.jsx
import { useState, useMemo } from 'react';
import { useMarket } from '../../context/MarketContext';
import { Flame, Zap, Compass, Filter } from 'lucide-react';
import './NewsPanel.css';

export default function NewsPanel() {
  const { news, navigateTo, setSelectedBreakingNews } = useMarket();
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'BREAKING' | 'BULLISH' | 'BEARISH'

  const filteredNews = useMemo(() => {
    let list = news;
    if (filter === 'BREAKING') list = list.filter(n => n.isBreaking || n.impactLevel === 'CRITICAL' || n.impactLevel === 'HIGH');
    else if (filter === 'BULLISH') list = list.filter(n => n.type === 'bullish');
    else if (filter === 'BEARISH') list = list.filter(n => n.type === 'bearish');
    return list.slice(0, 14);
  }, [news, filter]);

  return (
    <div className="news-card glass-card">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="panel-title">Market News & Catalysts</span>
          <div className="live-dot" />
        </div>
        <button
          className="flow-link-btn"
          onClick={() => navigateTo('flow')}
          title="Open Full Market Flow & Moving Direction View"
        >
          <Compass size={12} />
          Flow Center &rarr;
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="news-filter-tabs">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'BREAKING', label: 'Breaking 🔥' },
          { id: 'BULLISH', label: 'Bullish' },
          { id: 'BEARISH', label: 'Bearish' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`news-tab-btn ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="news-list">
        {filteredNews.map((item, idx) => {
          const isCritical = item.impactLevel === 'CRITICAL';
          const isHigh = item.impactLevel === 'HIGH';
          return (
            <div
              key={item.id}
              className="news-item animate-fade-in-up"
              style={{ animationDelay: `${idx * 20}ms`, cursor: 'pointer' }}
              onClick={() => setSelectedBreakingNews(item)}
              title="Click to view market impact & trade options"
            >
              <div
                className="news-accent-line"
                style={{
                  background: isCritical
                    ? 'var(--red)'
                    : item.type === 'bullish'
                    ? 'var(--green)'
                    : 'var(--red)',
                }}
              />
              <div className="news-content">
                <div className="news-sym-row">
                  <span className="news-sym badge" style={{ background: item.color + '22', color: item.color }}>
                    {item.sym}
                  </span>

                  {(isCritical || isHigh) && (
                    <span className={`impact-badge-mini ${isCritical ? 'badge-critical' : 'badge-high'}`}>
                      {isCritical ? <Flame size={10} /> : <Zap size={10} />}
                      {item.impactLevel}
                    </span>
                  )}

                  <span className="news-time text-mono text-muted">{item.time}</span>
                  <span className={`badge ${item.type === 'bullish' ? 'badge-green' : 'badge-red'}`}>
                    {item.type === 'bullish' ? '▲ Bullish' : '▼ Bearish'}
                  </span>

                  <button
                    className="news-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('markets', item.sym);
                    }}
                    title={`Go to ${item.sym} chart`}
                  >
                    Chart &rarr;
                  </button>
                </div>
                <p className="news-text">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
