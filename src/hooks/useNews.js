// src/hooks/useNews.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { ALL_INSTRUMENTS, NEWS_TEMPLATES } from '../data/instruments';
import { PRESET_BREAKING_NEWS } from '../data/marketAnalytics';

function buildInitialNews() {
  // Prepopulate with a mix of high-impact breaking catalysts and routine market updates
  const list = [];

  // Seed preset high-impact catalysts first
  PRESET_BREAKING_NEWS.slice(0, 4).forEach((cat, idx) => {
    const inst = ALL_INSTRUMENTS.find(i => i.id === cat.primarySymbol) || ALL_INSTRUMENTS[0];
    list.push({
      id: `init-break-${idx}`,
      isBreaking: true,
      impactLevel: cat.impactLevel,
      sym: cat.primarySymbol,
      correlatedSymbols: cat.correlatedSymbols,
      category: cat.category,
      source: cat.source,
      text: cat.headline,
      summary: cat.summary,
      rationale: cat.rationale,
      expectedImpactPct: cat.expectedImpactPct,
      time: new Date(Date.now() - (idx + 1) * 90_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: cat.direction,
      color: inst.color,
    });
  });

  // Routine market news
  for (let i = 0; i < 6; i++) {
    const inst = ALL_INSTRUMENTS[(i * 3 + 2) % ALL_INSTRUMENTS.length];
    const tmpl = NEWS_TEMPLATES[i % NEWS_TEMPLATES.length];
    list.push({
      id: `init-norm-${i}`,
      isBreaking: false,
      impactLevel: 'MODERATE',
      sym: inst.id,
      correlatedSymbols: [],
      category: 'Market Update',
      source: 'FinPulse Feed',
      text: tmpl.replace('{sym}', inst.id).replace('{pct}', (Math.random() * 4 + 0.8).toFixed(1)).replace('${price}', (Math.random() * 400 + 50).toFixed(2)),
      summary: `Automated algorithmic tracking detected notable momentum shifts for ${inst.name}.`,
      rationale: 'Volume surges and technical indicator crossovers driving near-term volatility.',
      expectedImpactPct: 1.5,
      time: new Date(Date.now() - (i + 5) * 120_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: i % 2 === 0 ? 'bullish' : 'bearish',
      color: inst.color,
    });
  }

  return list;
}

export function useNews(prices, onMarketShock) {
  const [news, setNews] = useState(buildInitialNews);
  const onMarketShockRef = useRef(onMarketShock);
  onMarketShockRef.current = onMarketShock;

  // Function to manually trigger a preset breaking catalyst
  const triggerCatalyst = useCallback((presetId) => {
    const cat = PRESET_BREAKING_NEWS.find(c => c.id === presetId) || PRESET_BREAKING_NEWS[0];
    const inst = ALL_INSTRUMENTS.find(i => i.id === cat.primarySymbol) || ALL_INSTRUMENTS[0];

    const newItem = {
      id: `break-${Date.now()}`,
      isBreaking: true,
      impactLevel: cat.impactLevel,
      sym: cat.primarySymbol,
      correlatedSymbols: cat.correlatedSymbols,
      category: cat.category,
      source: cat.source,
      text: cat.headline,
      summary: cat.summary,
      rationale: cat.rationale,
      expectedImpactPct: cat.expectedImpactPct,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: cat.direction,
      color: inst.color,
    };

    setNews(prev => [newItem, ...prev].slice(0, 40));

    // Fire actual market shock
    if (onMarketShockRef.current) {
      onMarketShockRef.current({
        symbols: [cat.primarySymbol, ...cat.correlatedSymbols],
        direction: cat.direction,
        magnitudePct: Math.abs(cat.expectedImpactPct),
      });
    }

    return newItem;
  }, []);

  // Interval loop: mix of live breaking news and standard market flow headlines
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(prices).length === 0) return;

      const isBreaking = Math.random() < 0.35; // 35% chance of major breaking event

      if (isBreaking) {
        // Pick a preset or dynamic high impact catalyst
        const cat = PRESET_BREAKING_NEWS[Math.floor(Math.random() * PRESET_BREAKING_NEWS.length)];
        const inst = ALL_INSTRUMENTS.find(i => i.id === cat.primarySymbol) || ALL_INSTRUMENTS[0];

        const newItem = {
          id: `break-${Date.now()}`,
          isBreaking: true,
          impactLevel: cat.impactLevel,
          sym: cat.primarySymbol,
          correlatedSymbols: cat.correlatedSymbols,
          category: cat.category,
          source: cat.source,
          text: cat.headline,
          summary: cat.summary,
          rationale: cat.rationale,
          expectedImpactPct: cat.expectedImpactPct,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: cat.direction,
          color: inst.color,
        };

        setNews(prev => [newItem, ...prev].slice(0, 40));

        // Trigger real shock for critical/high impact breaking news
        if (onMarketShockRef.current && (cat.impactLevel === 'CRITICAL' || cat.impactLevel === 'HIGH')) {
          onMarketShockRef.current({
            symbols: [cat.primarySymbol, ...cat.correlatedSymbols.slice(0, 3)],
            direction: cat.direction,
            magnitudePct: Math.min(Math.abs(cat.expectedImpactPct) * 0.7, 5.0),
          });
        }
      } else {
        // Standard technical news
        const inst = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
        const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
        const pct   = (Math.random() * 6 + 0.5).toFixed(1);
        const price = prices[inst.id] ? prices[inst.id].price.toFixed(2) : '100.00';

        const newItem = {
          id: `norm-${Date.now()}`,
          isBreaking: false,
          impactLevel: 'MODERATE',
          sym: inst.id,
          correlatedSymbols: [],
          category: 'Market Pulse',
          source: 'MarketWire Live',
          text: tmpl.replace('{sym}', inst.id).replace('{pct}', pct).replace('${price}', price),
          summary: `Technical order book shift detected for ${inst.name}. Current quote at $${price}.`,
          rationale: 'Volume clusters and liquidity rebalancing across tier-1 execution venues.',
          expectedImpactPct: parseFloat(pct),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: Math.random() > 0.48 ? 'bullish' : 'bearish',
          color: inst.color,
        };

        setNews(prev => [newItem, ...prev].slice(0, 40));
      }
    }, 11000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [prices]);

  return { news, triggerCatalyst };
}
