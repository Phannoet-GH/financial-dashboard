// src/App.jsx
import { useMarket } from './context/MarketContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import OverviewView from './views/OverviewView';
import MarketsView from './views/MarketsView';
import MarketFlowView from './views/MarketFlowView';
import PortfolioView from './views/PortfolioView';
import AlertsView from './views/AlertsView';
import SettingsView from './views/SettingsView';
import BreakingNewsModal from './components/widgets/BreakingNewsModal';
import AlertToast from './components/widgets/AlertToast';
import './App.css';

function ViewRouter() {
  const { activeView } = useMarket();
  switch (activeView) {
    case 'markets':   return <MarketsView />;
    case 'flow':      return <MarketFlowView />;
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
      <BreakingNewsModal />
      <AlertToast />
    </div>
  );
}
