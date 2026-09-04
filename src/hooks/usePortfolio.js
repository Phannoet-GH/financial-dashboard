// src/hooks/usePortfolio.js
import { useState, useCallback, useMemo } from 'react';

const INITIAL_CASH = 100_000;

const INITIAL_HOLDINGS = [
  { id: 'AAPL',  qty: 50,  avgCost: 175.30 },
  { id: 'NVDA',  qty: 10,  avgCost: 680.00 },
  { id: 'BTC',   qty: 0.5, avgCost: 52000  },
  { id: 'MSFT',  qty: 20,  avgCost: 350.00 },
  { id: 'TSLA',  qty: 30,  avgCost: 200.00 },
];

export function usePortfolio(prices) {
  const [cash, setCash]         = useState(INITIAL_CASH);
  const [holdings, setHoldings] = useState(INITIAL_HOLDINGS);
  const [tradeHistory, setTradeHistory] = useState([]);

  const portfolioStats = useMemo(() => {
    let marketValue = 0;
    let totalCost   = 0;
    const enriched  = holdings.map(h => {
      const p       = prices[h.id];
      const curPrice = p ? p.price : h.avgCost;
      const mv      = curPrice * h.qty;
      const cost    = h.avgCost * h.qty;
      const pnl     = mv - cost;
      const pnlPct  = (pnl / cost) * 100;
      marketValue  += mv;
      totalCost    += cost;
      return { ...h, curPrice, mv, cost, pnl, pnlPct, name: p?.name || h.id, color: p?.color || '#ccc' };
    });

    const totalValue  = marketValue + cash;
    const totalPnl    = marketValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return { enriched, marketValue, cash, totalValue, totalPnl, totalPnlPct };
  }, [holdings, prices, cash]);

  const buy = useCallback((id, qty, price) => {
    const cost = qty * price;
    if (cost > cash) return { ok: false, error: 'Insufficient cash' };

    setCash(c => c - cost);
    setHoldings(prev => {
      const idx = prev.findIndex(h => h.id === id);
      if (idx >= 0) {
        const existing = prev[idx];
        const newQty  = existing.qty + qty;
        const newCost = (existing.avgCost * existing.qty + price * qty) / newQty;
        const next = [...prev];
        next[idx] = { ...existing, qty: newQty, avgCost: parseFloat(newCost.toFixed(4)) };
        return next;
      }
      return [...prev, { id, qty, avgCost: price }];
    });
    setTradeHistory(h => [{
      type: 'BUY', id, qty, price, total: cost,
      time: new Date().toLocaleTimeString(),
    }, ...h].slice(0, 50));
    return { ok: true };
  }, [cash]);

  const sell = useCallback((id, qty, price) => {
    const holding = holdings.find(h => h.id === id);
    if (!holding || holding.qty < qty) return { ok: false, error: 'Insufficient shares' };

    const proceeds = qty * price;
    setCash(c => c + proceeds);
    setHoldings(prev => {
      const idx = prev.findIndex(h => h.id === id);
      const next = [...prev];
      const newQty = next[idx].qty - qty;
      if (newQty <= 0.0001) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], qty: parseFloat(newQty.toFixed(6)) };
      }
      return next;
    });
    setTradeHistory(h => [{
      type: 'SELL', id, qty, price, total: proceeds,
      time: new Date().toLocaleTimeString(),
    }, ...h].slice(0, 50));
    return { ok: true };
  }, [holdings]);

  const resetPortfolio = useCallback(() => {
    setCash(INITIAL_CASH);
    setHoldings(INITIAL_HOLDINGS);
    setTradeHistory([]);
  }, []);

  return { portfolioStats, buy, sell, tradeHistory, resetPortfolio };
}
