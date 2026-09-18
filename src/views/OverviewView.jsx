// src/views/OverviewView.jsx
import { TrendingUp, DollarSign, BarChart2, Activity, Compass, ArrowRight } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import KPICard from '../components/widgets/KPICard';
import PortfolioDonut from '../components/charts/PortfolioDonut';
import PnLAreaChart from '../components/charts/PnLAreaChart';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import NewsPanel from '../components/panels/NewsPanel';
import './OverviewView.css';

export default function OverviewView() {
  const { portfolioStats, marketFlowData, navigateTo } = useMarket();
  const { totalValue, marketValue, cash, totalPnl, totalPnlPct } = portfolioStats;

  const {
    macroLabel = 'BULLISH FLOW INFLOW',
    macroColor = 'var(--green)',
    netMarketFlowM = 0,
    marketBuyPct = 55,
    advancingCount = 0,
    decliningCount = 0,
    fearAndGreed = 60,
  } = marketFlowData || {};

  return (
    <div className="overview-layout">
      {/* KPI Row */}
      <div className="kpi-row">
        <KPICard
          title="Total Portfolio"
          value={totalValue}
          changePct={totalPnlPct}
          Icon={DollarSign}
          color="cyan"
          delay={0}
          onClick={() => navigateTo('portfolio')}
        />
        <KPICard
          title="Market Value"
          value={marketValue}
          changePct={totalPnlPct}
          Icon={TrendingUp}
          color="green"
          delay={60}
          onClick={() => navigateTo('portfolio')}
        />
        <KPICard
          title="Total P&L"
          value={Math.abs(totalPnl)}
          prefix={totalPnl >= 0 ? '+$' : '-$'}
          changePct={totalPnlPct}
          Icon={BarChart2}
          color={totalPnl >= 0 ? 'green' : 'red'}
          delay={120}
          onClick={() => navigateTo('portfolio')}
        />
        <KPICard
          title="Cash Available"
          value={cash}
          Icon={Activity}
          color="amber"
          delay={180}
          onClick={() => navigateTo('portfolio')}
        />
      </div>

      {/* Market Flow & Moving Direction Quick Ribbon */}
      <div
        className="overview-flow-ribbon glass-card"
        onClick={() => navigateTo('flow')}
        title="Open Full Market Flow & Moving Direction Analysis"
      >
        <div className="flow-ribbon-left">
          <div className="flow-ribbon-tag" style={{ borderColor: macroColor, color: macroColor }}>
            <Compass size={13} className="animate-spin" style={{ animationDuration: '9s' }} />
            MARKET DIRECTION
          </div>
          <span className="flow-ribbon-label" style={{ color: macroColor }}>
            {macroLabel}
          </span>
        </div>

        <div className="flow-ribbon-metrics">
          <div className="flow-ribbon-metric">
            <span className="text-muted text-xs">Net Flow:</span>
            <span className={`text-mono fw-700 text-sm ${netMarketFlowM >= 0 ? 'text-green' : 'text-red'}`}>
              {netMarketFlowM >= 0 ? '+' : '-'}${Math.abs(netMarketFlowM)}M
            </span>
          </div>
          <div className="flow-ribbon-metric">
            <span className="text-muted text-xs">Order Flow:</span>
            <span className="text-mono fw-700 text-sm text-green">{marketBuyPct}% Buy Delta</span>
          </div>
          <div className="flow-ribbon-metric">
            <span className="text-muted text-xs">Breadth:</span>
            <span className="text-mono fw-700 text-sm text-primary">{advancingCount} Up / {decliningCount} Dn</span>
          </div>
          <div className="flow-ribbon-metric">
            <span className="text-muted text-xs">Sentiment:</span>
            <span className="text-mono fw-700 text-sm" style={{ color: fearAndGreed >= 60 ? 'var(--green)' : fearAndGreed <= 40 ? 'var(--red)' : 'var(--amber)' }}>
              {fearAndGreed}/100
            </span>
          </div>
        </div>

        <div className="flow-ribbon-action">
          <span>Flow Radar</span>
          <ArrowRight size={13} />
        </div>
      </div>

      {/* Main content */}
      <div className="overview-main">
        {/* Left column */}
        <div className="overview-left">
          <div className="overview-pnl">
            <PnLAreaChart />
          </div>
          <div className="overview-heatmap">
            <HeatmapGrid />
          </div>
        </div>
        {/* Right column */}
        <div className="overview-right">
          <div className="overview-donut">
            <PortfolioDonut />
          </div>
          <div className="overview-news">
            <NewsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
