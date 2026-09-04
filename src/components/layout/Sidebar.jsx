// src/components/layout/Sidebar.jsx
import { LayoutDashboard, TrendingUp, Briefcase, Bell, Settings, Activity, ChevronRight } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import './Sidebar.css';

const NAV = [
  { id: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
  { id: 'markets',   label: 'Markets',   Icon: TrendingUp      },
  { id: 'portfolio', label: 'Portfolio', Icon: Briefcase       },
];

export default function Sidebar() {
  const { activeView, navigateTo, portfolioStats, alerts, setShowAlertsDropdown, addAlert } = useMarket();

  const pct = portfolioStats.totalPnlPct;
  const isPositive = pct >= 0;

  return (
    <aside className="sidebar">
      {/* Logo -> Links to Overview */}
      <div
        className="sidebar-logo clickable-nav"
        onClick={() => navigateTo('overview')}
        title="Go to Overview"
        role="button"
        tabIndex={0}
      >
        <div className="sidebar-logo-icon">F</div>
        <div>
          <div className="sidebar-logo-text">FinPulse</div>
          <div className="sidebar-logo-sub">ANALYTICS PRO</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Dashboard</div>
        {NAV.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            className={`nav-item${activeView === id ? ' active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo(id);
            }}
          >
            <Icon className="nav-icon" size={16} />
            {label}
            {id === 'portfolio' && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
          </a>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Tools</div>
        <a
          href="#/markets"
          className={`nav-item${activeView === 'markets' ? ' active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigateTo('markets');
          }}
          title="Open Live Market Feed"
        >
          <Activity className="nav-icon" size={16} />
          Live Feed
          <div className="live-dot" style={{ marginLeft: 'auto' }} />
        </a>
        <a
          href="#/alerts"
          className={`nav-item${activeView === 'alerts' ? ' active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigateTo('alerts');
          }}
          title="Open Alerts Center & Price Watchers"
        >
          <Bell className="nav-icon" size={16} />
          Alerts
          {alerts.length > 0 && <span className="nav-badge">{alerts.length}</span>}
        </a>
        <a
          href="#/settings"
          className={`nav-item${activeView === 'settings' ? ' active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigateTo('settings');
          }}
          title="Open Platform & Simulation Settings"
        >
          <Settings className="nav-icon" size={16} />
          Settings
        </a>
      </nav>

      {/* Portfolio Mini -> Links to Portfolio view */}
      <div
        className="sidebar-portfolio clickable-nav"
        onClick={() => navigateTo('portfolio')}
        title="View Full Portfolio"
        role="button"
        tabIndex={0}
      >
        <div className="sidebar-portfolio-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Portfolio</span>
          <span style={{ fontSize: 10, color: 'var(--cyan)' }}>View &rarr;</span>
        </div>
        <div className="sidebar-portfolio-value">
          ${portfolioStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className="sidebar-portfolio-change"
          style={{ color: isPositive ? 'var(--green)' : 'var(--red)' }}
        >
          {isPositive ? '+' : ''}{pct.toFixed(2)}% all time
        </div>
        <div className="sidebar-portfolio-bar">
          <div
            className="sidebar-portfolio-bar-fill"
            style={{ width: `${Math.min(Math.max((pct + 30) / 60 * 100, 5), 95)}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
