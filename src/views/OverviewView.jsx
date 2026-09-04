// src/views/OverviewView.jsx
import { TrendingUp, DollarSign, BarChart2, Activity } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import KPICard from '../components/widgets/KPICard';
import PortfolioDonut from '../components/charts/PortfolioDonut';
import PnLAreaChart from '../components/charts/PnLAreaChart';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import NewsPanel from '../components/panels/NewsPanel';
import './OverviewView.css';

export default function OverviewView() {
  const { portfolioStats, prices, navigateTo } = useMarket();
  const { totalValue, marketValue, cash, totalPnl, totalPnlPct } = portfolioStats;

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
