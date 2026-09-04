// src/App.jsx
import { useMarket } from './context/MarketContext';
import Sidebar  from './components/layout/Sidebar';
import TopBar   from './components/layout/TopBar';
import OverviewView   from './views/OverviewView';
import MarketsView    from './views/MarketsView';
import PortfolioView  from './views/PortfolioView';
import AlertsView     from './views/AlertsView';
import SettingsView   from './views/SettingsView';
import './App.css';

function ViewRouter() {
  const { activeView } = useMarket();
  switch (activeView) {
    case 'markets':   return <MarketsView />;
    case 'portfolio': return <PortfolioView />;
    case 'alerts':    return <AlertsView />;
    case 'settings':  return <SettingsView />;
    default:          return <OverviewView />;
  }
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <div className="app-content">
          <ViewRouter />
        </div>
      </div>
    </div>
  );
}
