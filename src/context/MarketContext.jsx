// src/context/MarketContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useMarketSimulator } from '../hooks/useMarketSimulator';
import { useLiveMarketFeed } from '../hooks/useLiveMarketFeed';
import { usePortfolio } from '../hooks/usePortfolio';
import { useNews } from '../hooks/useNews';
import { calculateMarketFlow, generateWhaleOrder } from '../data/marketAnalytics';
import { calculateTradingSignal, getAllTradingSignals } from '../data/marketSignals';

const MarketContext = createContext(null);

const VALID_ROUTES = ['overview', 'markets', 'flow', 'portfolio', 'alerts', 'settings'];

function getInitialRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (VALID_ROUTES.includes(hash)) return hash;
  return 'overview';
}

function getInitialSymbol() {
  const fullHash = window.location.hash.replace(/^#\/?/, '');
  const queryStr = fullHash.split('?')[1];
  if (queryStr) {
    const params = new URLSearchParams(queryStr);
    const sym = params.get('symbol');
    if (sym) return sym.toUpperCase();
  }
  return 'AAPL';
}

export function MarketProvider({ children }) {
  // Feed mode: 'live' (Real-time Exchange API) vs 'simulator' (Local sandbox)
  const [feedMode, setFeedModeState] = useState(() => {
    try {
      return localStorage.getItem('finpulse_feed_mode') || 'live';
    } catch {
      return 'live';
    }
  });

  // Simulator tuning options
  const [tickSpeed, setTickSpeed]       = useState(1000);   // 500, 1000, 2500
  const [isPaused, setIsPaused]         = useState(false);
  const [volatility, setVolatility]     = useState(1.0);    // 0.5, 1.0, 2.0
  const [marketBias, setMarketBias]     = useState(0.0002); // 0.0004 (bullish), 0 (neutral), -0.0004 (bearish)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currency, setCurrency]         = useState('USD');
  const [compactMode, setCompactMode]   = useState(false);

  const {
    prices,
    ohlcHistory,
    getMarketValue,
    applyMarketShock,
    updateWithLivePrices,
  } = useMarketSimulator({
    tickMs: tickSpeed,
    volatilityMultiplier: volatility,
    driftBias: marketBias,
    isPaused: feedMode === 'live' ? false : isPaused,
  });

  // Real-world market live feed hook
  const {
    livePrices,
    streamsStatus,
    feedState,
    lastSyncTime,
    latencyMs,
    syncCount,
    syncNow,
  } = useLiveMarketFeed({ enabled: feedMode === 'live', intervalMs: 3500 });

  // Sync real-world market prices into simulator engine
  useEffect(() => {
    if (feedMode === 'live' && livePrices && Object.keys(livePrices).length > 0) {
      updateWithLivePrices(livePrices);
    }
  }, [feedMode, livePrices, updateWithLivePrices]);

  const { portfolioStats, buy, sell, tradeHistory, resetPortfolio } = usePortfolio(prices);
  const { news, triggerCatalyst: baseTriggerCatalyst } = useNews(prices, applyMarketShock);

  const [selectedSymbol, setSelectedSymbol] = useState(getInitialSymbol);
  const [activeView, setActiveViewState]   = useState(getInitialRoute); // 'overview' | 'markets' | 'flow' | 'portfolio' | 'alerts' | 'settings'
  const [alerts, setAlerts]                 = useState([]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [selectedBreakingNews, setSelectedBreakingNews] = useState(null);

  // Sync state to URL hash
  const setActiveView = useCallback((view, symbol) => {
    setActiveViewState(view);
    const sym = symbol || (view === 'markets' ? selectedSymbol : null);
    const hash = `#/${view}${sym ? `?symbol=${sym}` : ''}`;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, [selectedSymbol]);

  // Navigate helper to set view and symbol simultaneously
  const navigateTo = useCallback((view, symbol) => {
    if (symbol) setSelectedSymbol(symbol);
    setActiveViewState(view);
    const hash = `#/${view}${symbol ? `?symbol=${symbol}` : ''}`;
    window.location.hash = hash;
  }, []);

  // Institutional Whale Tape State
  const [whaleOrders, setWhaleOrders] = useState(() => [
    generateWhaleOrder(prices),
    generateWhaleOrder(prices),
    generateWhaleOrder(prices),
  ]);

  // Periodic Institutional Whale Order Generation
  useEffect(() => {
    if (Object.keys(prices).length === 0) return;
    const interval = setInterval(() => {
      setWhaleOrders(prev => [generateWhaleOrder(prices), ...prev].slice(0, 20));
    }, 4500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [prices]);

  // Market Flow Aggregation
  const marketFlowData = useMemo(() => calculateMarketFlow(prices), [prices]);

  // Trading Signals Engine: multi-factor Buy / Sell / Hold recommendations
  const tradingSignals = useMemo(() => {
    return getAllTradingSignals(prices, ohlcHistory, marketFlowData);
  }, [prices, ohlcHistory, marketFlowData]);

  const [tradeSignalPrefill, setTradeSignalPrefill] = useState(null);

  const getSignalForSymbol = useCallback((sym) => {
    const p = prices[sym];
    if (!p) return null;
    const bars = ohlcHistory[sym]?.['1m'] || [];
    const assetFlow = marketFlowData?.assetFlows?.[sym];
    return calculateTradingSignal(sym, p, bars, assetFlow);
  }, [prices, ohlcHistory, marketFlowData]);

  const applySignalToTrade = useCallback((signal) => {
    if (!signal) return;
    setSelectedSymbol(signal.symbol);
    setTradeSignalPrefill(signal);
    navigateTo('markets', signal.symbol);
    addAlert(`🎯 Applied ${signal.signal} Signal for ${signal.symbol} (TP: $${signal.tp1} | SL: $${signal.stopLoss})`, 'info');
  }, [navigateTo]);

  // Price Triggers Engine
  const [priceTriggers, setPriceTriggers] = useState([
    { id: 'trig-1', symbol: 'BTC', condition: 'gte', targetPrice: 70000, active: true, createdAt: '08:00 AM' },
    { id: 'trig-2', symbol: 'NVDA', condition: 'gte', targetPrice: 900, active: true, createdAt: '08:15 AM' },
    { id: 'trig-3', symbol: 'AAPL', condition: 'lte', targetPrice: 185, active: true, createdAt: '08:20 AM' },
  ]);

  function addPriceTrigger(symbol, condition, targetPrice) {
    const newTrig = {
      id: `trig-${Date.now()}`,
      symbol,
      condition, // 'gte' | 'lte'
      targetPrice: parseFloat(targetPrice),
      active: true,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setPriceTriggers(prev => [newTrig, ...prev]);
    addAlert(`Alert created for ${symbol} ${condition === 'gte' ? '≥' : '≤'} $${targetPrice}`, 'info');
  }

  function removePriceTrigger(id) {
    setPriceTriggers(prev => prev.filter(t => t.id !== id));
  }

  function togglePriceTrigger(id) {
    setPriceTriggers(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
  }

  // Watch active price triggers against live price ticks
  useEffect(() => {
    priceTriggers.forEach(trig => {
      if (!trig.active) return;
      const p = prices[trig.symbol];
      if (!p) return;

      const hit = trig.condition === 'gte'
        ? p.price >= trig.targetPrice
        : p.price <= trig.targetPrice;

      if (hit) {
        addAlert(
          `PRICE ALERT: ${trig.symbol} hit $${p.price.toFixed(2)} (${trig.condition === 'gte' ? '≥' : '≤'} $${trig.targetPrice})`,
          'warning'
        );
        // Deactivate trigger so it does not spam every tick
        setPriceTriggers(prev =>
          prev.map(t => (t.id === trig.id ? { ...t, active: false, triggeredAt: new Date().toLocaleTimeString() } : t))
        );
      }
    });
  }, [prices]);

  // Listen to browser forward/back buttons & hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const fullHash = window.location.hash.replace(/^#\/?/, '');
      const [view, queryStr] = fullHash.split('?');
      if (VALID_ROUTES.includes(view)) {
        setActiveViewState(view);
      }
      if (queryStr) {
        const params = new URLSearchParams(queryStr);
        const sym = params.get('symbol');
        if (sym) setSelectedSymbol(sym.toUpperCase());
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Active Take Profit & Stop Loss orders
  const [tpSlOrders, setTpSlOrders] = useState([]);

  function addTpSlOrder({ symbol, qty, buyPrice, takeProfit, stopLoss }) {
    const order = {
      id: `tpsl-${Date.now()}`,
      symbol,
      qty: parseFloat(qty),
      buyPrice: parseFloat(buyPrice),
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: true,
    };
    setTpSlOrders(prev => [order, ...prev]);
  }

  function removeTpSlOrder(id) {
    setTpSlOrders(prev => prev.filter(o => o.id !== id));
  }

  // Pending Limit Orders state
  const [pendingLimitOrders, setPendingLimitOrders] = useState([]);

  function addLimitOrder({ symbol, side, qty, limitPrice, leverage = 1 }) {
    const order = {
      id: `limit-${Date.now()}`,
      symbol,
      side, // 'buy' | 'sell'
      qty: parseFloat(qty),
      limitPrice: parseFloat(limitPrice),
      leverage: parseInt(leverage, 10) || 1,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: true,
    };
    setPendingLimitOrders(prev => [order, ...prev]);
    addAlert(`Limit ${side.toUpperCase()} queued: ${qty} ${symbol} @ $${limitPrice} (${leverage}x)`, 'info');
    return { ok: true, orderId: order.id };
  }

  function cancelLimitOrder(id) {
    setPendingLimitOrders(prev => prev.filter(o => o.id !== id));
    addAlert('Limit order cancelled', 'info');
  }

  // Watch Limit orders against live market ticks
  useEffect(() => {
    pendingLimitOrders.forEach(order => {
      if (!order.active) return;
      const p = prices[order.symbol];
      if (!p) return;

      if (order.side === 'buy' && p.price <= order.limitPrice) {
        const res = buy(order.symbol, order.qty, p.price);
        if (res.ok) {
          addAlert(`⚡ LIMIT BUY FILLED: ${order.qty} ${order.symbol} @ $${p.price.toFixed(2)}`, 'success');
          setPendingLimitOrders(prev =>
            prev.map(o => o.id === order.id ? { ...o, active: false, status: 'FILLED', filledPrice: p.price } : o)
          );
        }
      } else if (order.side === 'sell' && p.price >= order.limitPrice) {
        const res = sell(order.symbol, order.qty, p.price);
        if (res.ok) {
          addAlert(`⚡ LIMIT SELL FILLED: ${order.qty} ${order.symbol} @ $${p.price.toFixed(2)}`, 'success');
          setPendingLimitOrders(prev =>
            prev.map(o => o.id === order.id ? { ...o, active: false, status: 'FILLED', filledPrice: p.price } : o)
          );
        }
      }
    });
  }, [prices, pendingLimitOrders]);

  // Watch Take Profit & Stop Loss orders against live market ticks
  useEffect(() => {
    tpSlOrders.forEach(order => {
      if (!order.active) return;
      const p = prices[order.symbol];
      if (!p) return;

      // Check Take Profit target hit
      if (order.takeProfit && p.price >= order.takeProfit) {
        const sellResult = sell(order.symbol, order.qty);
        if (sellResult?.ok) {
          const profit = (p.price - order.buyPrice) * order.qty;
          const profitPct = ((p.price - order.buyPrice) / order.buyPrice) * 100;
          addAlert(
            `🎯 TAKE PROFIT TRIGGERED: Sold ${order.qty} ${order.symbol} @ $${p.price.toFixed(2)} (+$${profit.toFixed(2)} / +${profitPct.toFixed(1)}%)`,
            'success'
          );
          setTpSlOrders(prev =>
            prev.map(o => (o.id === order.id ? { ...o, active: false, status: 'TP_HIT', executedPrice: p.price } : o))
          );
        }
      }
      // Check Stop Loss target hit
      else if (order.stopLoss && p.price <= order.stopLoss) {
        const sellResult = sell(order.symbol, order.qty);
        if (sellResult?.ok) {
          const loss = (p.price - order.buyPrice) * order.qty;
          const lossPct = ((p.price - order.buyPrice) / order.buyPrice) * 100;
          addAlert(
            `🛑 STOP LOSS TRIGGERED: Sold ${order.qty} ${order.symbol} @ $${p.price.toFixed(2)} (-$${Math.abs(loss).toFixed(2)} / ${lossPct.toFixed(1)}%)`,
            'warning'
          );
          setTpSlOrders(prev =>
            prev.map(o => (o.id === order.id ? { ...o, active: false, status: 'SL_HIT', executedPrice: p.price } : o))
          );
        }
      }
    });
  }, [prices, tpSlOrders]);

  function addAlert(msg, type = 'info') {
    const id = Date.now();
    setAlerts(a => [{ id, msg, type, time: new Date().toLocaleTimeString() }, ...a].slice(0, 30));
  }

  function clearAlerts() {
    setAlerts([]);
  }

  function handleBuy(id, qty, tpPrice = null, slPrice = null) {
    const p = prices[id];
    if (!p) return;
    const result = buy(id, qty, p.price);
    if (result.ok) {
      let msg = `Bought ${qty} ${id} @ $${p.price.toFixed(2)}`;
      if (tpPrice) msg += ` | TP: $${parseFloat(tpPrice).toFixed(2)}`;
      if (slPrice) msg += ` | SL: $${parseFloat(slPrice).toFixed(2)}`;
      addAlert(msg, 'success');

      if (tpPrice || slPrice) {
        addTpSlOrder({
          symbol: id,
          qty,
          buyPrice: p.price,
          takeProfit: tpPrice,
          stopLoss: slPrice,
        });
      }
    } else {
      addAlert(result.error, 'error');
    }
    return result;
  }

  function handleSell(id, qty) {
    const p = prices[id];
    if (!p) return;
    const result = sell(id, qty, p.price);
    if (result.ok) addAlert(`Sold ${qty} ${id} @ $${p.price.toFixed(2)}`, 'warning');
    else           addAlert(result.error, 'error');
    return result;
  }

  const triggerCatalyst = useCallback((presetId) => {
    const item = baseTriggerCatalyst(presetId);
    if (item) {
      addAlert(`🚨 BREAKING NEWS CATALYST: ${item.text}`, item.impactLevel === 'CRITICAL' ? 'warning' : 'info');
    }
    return item;
  }, [baseTriggerCatalyst]);

  const setFeedMode = useCallback((mode) => {
    setFeedModeState(mode);
    try {
      localStorage.setItem('finpulse_feed_mode', mode);
    } catch (_) {}
    if (mode === 'live') {
      addAlert('🟢 Connected to Real Live Market Feeds (Yahoo, CoinGecko, ECB)', 'info');
    } else {
      addAlert('⚡ Switched to Local Simulator Sandbox', 'info');
    }
  }, []);

  const liveFeedStatus = useMemo(() => ({
    feedState,
    streamsStatus,
    lastSyncTime,
    latencyMs,
    syncCount,
    syncNow,
    isLive: feedMode === 'live',
  }), [feedState, streamsStatus, lastSyncTime, latencyMs, syncCount, syncNow, feedMode]);

  return (
    <MarketContext.Provider value={{
      prices, ohlcHistory, getMarketValue, applyMarketShock,
      portfolioStats, tradeHistory, resetPortfolio,
      news, triggerCatalyst,
      marketFlowData, whaleOrders,
      selectedBreakingNews, setSelectedBreakingNews,
      tradingSignals, getSignalForSymbol,
      tradeSignalPrefill, setTradeSignalPrefill, applySignalToTrade,
      feedMode, setFeedMode, liveFeedStatus,
      selectedSymbol, setSelectedSymbol,
      activeView, setActiveView,
      navigateTo,
      alerts, addAlert, clearAlerts,
      showAlertsDropdown, setShowAlertsDropdown,
      priceTriggers, addPriceTrigger, removePriceTrigger, togglePriceTrigger,
      tpSlOrders, addTpSlOrder, removeTpSlOrder,
      pendingLimitOrders, addLimitOrder, cancelLimitOrder,
      tickSpeed, setTickSpeed,
      isPaused, setIsPaused,
      volatility, setVolatility,
      marketBias, setMarketBias,
      soundEnabled, setSoundEnabled,
      currency, setCurrency,
      compactMode, setCompactMode,
      buy: handleBuy,
      sell: handleSell,
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
