// src/components/charts/HeatmapGrid.jsx
import { useMarket } from '../../context/MarketContext';
import { SECTORS, ALL_INSTRUMENTS } from '../../data/instruments';
import './HeatmapGrid.css';

function heatClass(pct) {
  if (pct >  3)   return 'heat-strong-up';
  if (pct >  1.5) return 'heat-mid-up';
  if (pct >  0.3) return 'heat-slight-up';
  if (pct > -0.3) return 'heat-neutral';
  if (pct > -1.5) return 'heat-slight-down';
  if (pct > -3)   return 'heat-mid-down';
  return 'heat-strong-down';
}

export default function HeatmapGrid() {
  const { prices, navigateTo } = useMarket();

  const sectorData = SECTORS.map(sector => {
    const stockPcts = sector.stocks
      .map(id => prices[id]?.changePct || 0)
      .filter(Boolean);

    const avgPct = stockPcts.length > 0
      ? stockPcts.reduce((a, b) => a + b, 0) / stockPcts.length
      : (Math.random() - 0.5) * 4;

    return { ...sector, avgPct: parseFloat(avgPct.toFixed(2)) };
  });

  function handleSectorClick(sector) {
    if (sector.stocks && sector.stocks.length > 0) {
      navigateTo('markets', sector.stocks[0]);
    } else {
      navigateTo('markets');
    }
  }

  return (
    <div className="heatmap-card glass-card">
      <div className="panel-header">
        <span className="panel-title">Market Sectors</span>
        <span className="text-xs text-muted">% change today &bull; Click to view</span>
      </div>
      <div className="heatmap-grid">
        {sectorData.map(sector => (
          <div
            key={sector.id}
            className={`heatmap-cell ${heatClass(sector.avgPct)}`}
            onClick={() => handleSectorClick(sector)}
            title={`View ${sector.id} (${sector.stocks.join(', ') || 'all'}) in Markets`}
            style={{ cursor: 'pointer' }}
          >
            <div className="heatmap-name">{sector.id}</div>
            <div className="heatmap-pct text-mono">
              {sector.avgPct >= 0 ? '+' : ''}{sector.avgPct.toFixed(2)}%
            </div>
            {sector.stocks.length > 0 && (
              <div className="heatmap-stocks">{sector.stocks.length} stocks &rarr;</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
