// src/components/charts/PortfolioDonut.jsx
import { useState, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import './PortfolioDonut.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PortfolioDonut() {
  const { portfolioStats, navigateTo } = useMarket();
  const { enriched, totalValue, cash } = portfolioStats;
  const [allocationMode, setAllocationMode] = useState('asset'); // 'asset' | 'sector'

  // Map each instrument to sector
  const instrumentSectorMap = useMemo(() => {
    const map = {};
    ALL_INSTRUMENTS.forEach(i => {
      map[i.id] = { sector: i.sector || 'Other', color: i.color || '#6366f1' };
    });
    return map;
  }, []);

  const allSlices = useMemo(() => {
    if (allocationMode === 'sector') {
      const sectorTotals = {};
      enriched.forEach(h => {
        const sector = instrumentSectorMap[h.id]?.sector || 'Equities';
        const color = sector === 'Crypto' ? '#f59e0b' : sector === 'Technology' ? '#06b6d4' : sector === 'Automotive' ? '#f43f5e' : '#8b5cf6';
        if (!sectorTotals[sector]) sectorTotals[sector] = { label: sector, value: 0, color };
        sectorTotals[sector].value += h.mv;
      });

      const list = Object.values(sectorTotals);
      if (cash > 0) {
        list.push({ label: 'Cash Reserve', value: cash, color: '#475569' });
      }
      return list.filter(s => s.value > 0);
    }

    return [
      ...enriched.map(h => ({ label: h.id, value: h.mv, color: h.color })),
      { label: 'Cash', value: cash, color: '#475569' },
    ].filter(s => s.value > 0);
  }, [allocationMode, enriched, cash, instrumentSectorMap]);

  const data = {
    labels: allSlices.map(s => s.label),
    datasets: [{
      data:            allSlices.map(s => s.value),
      backgroundColor: allSlices.map(s => s.color + 'cc'),
      borderColor:     allSlices.map(s => s.color),
      borderWidth:     1.5,
      hoverBorderWidth: 3,
      hoverOffset:     6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor:  '#94a3b8',
        borderColor:'rgba(255,255,255,0.12)',
        borderWidth: 1,
        titleFont: { family: 'var(--font-sans)', size: 12, weight: '700' },
        bodyFont: { family: 'var(--font-mono)', size: 12 },
        callbacks: {
          label: ctx => {
            const v   = ctx.parsed;
            const pct = totalValue > 0 ? ((v / totalValue) * 100).toFixed(1) : 0;
            return ` $${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
          },
        },
      },
    },
    animation: { duration: 350 },
  };

  function handleLegendClick(label) {
    if (label.includes('Cash') || allocationMode === 'sector') {
      navigateTo('portfolio');
    } else {
      navigateTo('markets', label);
    }
  }

  return (
    <div className="donut-card glass-card">
      <div className="panel-header">
        <span className="panel-title">Asset Allocation</span>
        <div className="donut-mode-toggle">
          <button
            className={`donut-mode-btn ${allocationMode === 'asset' ? 'active' : ''}`}
            onClick={() => setAllocationMode('asset')}
          >
            Asset
          </button>
          <button
            className={`donut-mode-btn ${allocationMode === 'sector' ? 'active' : ''}`}
            onClick={() => setAllocationMode('sector')}
          >
            Sector
          </button>
        </div>
      </div>

      <div className="donut-wrap">
        <Doughnut data={data} options={options} />
        <div
          className="donut-center"
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onClick={() => navigateTo('portfolio')}
          title="Open Portfolio View"
        >
          <div className="donut-center-label">Total</div>
          <div className="donut-center-value text-mono">
            ${(totalValue / 1000).toFixed(1)}K
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="donut-legend">
        {allSlices.map(s => (
          <div
            key={s.label}
            className="donut-legend-item"
            style={{ cursor: 'pointer' }}
            onClick={() => handleLegendClick(s.label)}
            title={`View ${s.label} breakdown`}
          >
            <span className="donut-legend-dot" style={{ background: s.color }} />
            <span className="donut-legend-name">{s.label}</span>
            <span className="donut-legend-pct text-mono">
              {totalValue > 0 ? ((s.value / totalValue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
