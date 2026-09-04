// src/components/charts/PortfolioPerformanceChart.jsx
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useMarket } from '../../context/MarketContext';
import './PortfolioPerformanceChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TIMEFRAMES = ['1D', '1W', '1M', 'YTD', 'ALL'];

export default function PortfolioPerformanceChart() {
  const { portfolioStats } = useMarket();
  const { totalValue, totalPnl, totalPnlPct } = portfolioStats;
  const [timeframe, setTimeframe] = useState('1M');

  // Generate realistic historical equity curve anchored to current totalValue
  const chartData = useMemo(() => {
    const pointsCount = timeframe === '1D' ? 24 : timeframe === '1W' ? 14 : timeframe === '1M' ? 30 : 60;
    const labels = [];
    const portfolioPoints = [];
    const benchmarkPoints = [];

    const baseVal = totalValue * 0.88; // Started 12% lower
    const baseBench = totalValue * 0.92;

    for (let i = 0; i < pointsCount; i++) {
      let label = '';
      if (timeframe === '1D') {
        const h = i.toString().padStart(2, '0');
        label = `${h}:00`;
      } else if (timeframe === '1W') {
        const d = new Date();
        d.setDate(d.getDate() - (pointsCount - i));
        label = d.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (pointsCount - i));
        label = `${d.getMonth() + 1}/${d.getDate()}`;
      }
      labels.push(label);

      // Trajectory towards totalValue with simulated market volatility
      const progress = (i + 1) / pointsCount;
      const noise = (Math.sin(i * 0.7) * 0.02 + Math.cos(i * 1.3) * 0.015);
      const portVal = i === pointsCount - 1
        ? totalValue
        : baseVal + (totalValue - baseVal) * Math.pow(progress, 0.8) + (totalValue * noise);

      const benchVal = i === pointsCount - 1
        ? totalValue * 0.95
        : baseBench + (totalValue * 0.95 - baseBench) * progress + (totalValue * (noise * 0.5));

      portfolioPoints.push(parseFloat(portVal.toFixed(2)));
      benchmarkPoints.push(parseFloat(benchVal.toFixed(2)));
    }

    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Equity ($)',
          data: portfolioPoints,
          borderColor: '#10b981',
          backgroundColor: (ctx) => {
            const canvas = ctx.chart.ctx;
            const gradient = canvas.createLinearGradient(0, 0, 0, 260);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
            return gradient;
          },
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#10b981',
          tension: 0.25,
          fill: true,
        },
        {
          label: 'S&P 500 Benchmark',
          data: benchmarkPoints,
          borderColor: 'rgba(99, 102, 241, 0.55)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.2,
          fill: false,
        }
      ]
    };
  }, [totalValue, timeframe]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'var(--font-sans)' },
          boxWidth: 12,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'var(--font-mono)', size: 12 },
        bodyFont: { family: 'var(--font-mono)', size: 12 },
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#64748b',
          font: { family: 'var(--font-mono)', size: 10 },
          callback: (val) => `$${(val / 1000).toFixed(0)}k`
        }
      }
    }
  };

  const isUp = totalPnl >= 0;

  return (
    <div className="perf-chart-card glass-card animate-fade-in-up">
      <div className="perf-header">
        <div className="perf-header-left">
          <span className="panel-title">Portfolio Equity & Alpha Curve</span>
          <div className="perf-stat-row">
            <span className="perf-current-equity text-mono">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`perf-pnl-chip ${isUp ? 'positive' : 'negative'}`}>
              {isUp ? '+' : ''}{totalPnlPct.toFixed(2)}% vs Inception
            </span>
            <span className="perf-alpha-badge">
              +4.8% Alpha vs SPY
            </span>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="perf-timeframe-group">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`perf-tf-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="perf-chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
