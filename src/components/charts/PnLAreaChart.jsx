// src/components/charts/PnLAreaChart.jsx
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';
import { useMarket } from '../../context/MarketContext';
import { useState, useEffect, useRef } from 'react';
import './PnLAreaChart.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

function buildInitialHistory(baseValue, points = 50) {
  const arr = [];
  let val = baseValue * 0.85;
  for (let i = 0; i < points; i++) {
    val = val * (1 + (Math.random() - 0.46) * 0.012);
    arr.push(parseFloat(val.toFixed(2)));
  }
  return arr;
}

export default function PnLAreaChart() {
  const { portfolioStats, navigateTo } = useMarket();
  const [history, setHistory] = useState(() => buildInitialHistory(portfolioStats.totalValue));
  const [labels,  setLabels]  = useState(() => Array.from({ length: 50 }, (_, i) => `${50 - i}m`).reverse());

  const prevValue = useRef(portfolioStats.totalValue);

  useEffect(() => {
    if (Math.abs(portfolioStats.totalValue - prevValue.current) < 0.01) return;
    prevValue.current = portfolioStats.totalValue;
    setHistory(h => {
      const next = [...h.slice(1), parseFloat(portfolioStats.totalValue.toFixed(2))];
      return next;
    });
    setLabels(l => {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return [...l.slice(1), now];
    });
  }, [portfolioStats.totalValue]);

  const last   = history[history.length - 1];
  const first  = history[0];
  const isUp   = last >= first;
  const pct    = ((last - first) / first * 100).toFixed(2);
  const lineColor = isUp ? '#00ff88' : '#ff4757';

  const data = {
    labels,
    datasets: [{
      data:            history,
      borderColor:     lineColor,
      borderWidth:     2,
      backgroundColor: isUp
        ? 'rgba(0,255,136,0.08)'
        : 'rgba(255,71,87,0.08)',
      fill:   true,
      tension: 0.3,
      pointRadius:      0,
      pointHoverRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor:      '#8896b0',
        bodyColor:       '#f0f4ff',
        borderColor:     'rgba(255,255,255,0.1)',
        borderWidth:     1,
        callbacks: {
          label: ctx => ` $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        grid:       { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: {
          color: '#4a5568', font: { family: "'JetBrains Mono', monospace", size: 10 },
          callback: v => '$' + (v / 1000).toFixed(0) + 'K',
        },
        border: { display: false },
      },
    },
    animation: { duration: 250 },
  };

  return (
    <div className="pnl-card glass-card">
      <div
        className="panel-header"
        style={{ cursor: 'pointer' }}
        onClick={() => navigateTo('portfolio')}
        title="View full Portfolio breakdown"
      >
        <span className="panel-title">Portfolio Value</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pnl-change-badge" style={{ color: isUp ? 'var(--green)' : 'var(--red)', background: isUp ? 'var(--green-dim)' : 'var(--red-dim)' }}>
            {isUp ? '▲' : '▼'} {Math.abs(pct)}% today
          </div>
          <span style={{ fontSize: 11, color: 'var(--cyan)' }}>Details &rarr;</span>
        </div>
      </div>
      <div className="pnl-current">
        <span className="text-mono fw-800" style={{ fontSize: 24, color: 'var(--text-primary)' }}>
          ${last.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="pnl-chart-wrap">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
