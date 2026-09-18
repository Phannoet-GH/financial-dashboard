// src/hooks/useMarketSimulator.js
// Geometric Brownian Motion price simulation engine

import { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_INSTRUMENTS } from '../data/instruments';

/**
 * GBM tick: S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
 * mu  = small drift (slightly bullish bias)
 * sigma = volatility per instrument
 * Z = standard normal random variable (Box-Muller)
 */
function boxMuller() {
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return u * mul;
}

function gbmTick(price, vol, dt = 1 / 252 / 390, drift = 0.0002, volMultiplier = 1.0) {
  const effectiveVol = vol * volMultiplier;
  const netDrift = (drift - 0.5 * effectiveVol * effectiveVol) * dt;
  const diffusion = effectiveVol * Math.sqrt(dt) * boxMuller();
  return price * Math.exp(netDrift + diffusion);
}

function buildInitialPriceMap() {
  const map = {};
  ALL_INSTRUMENTS.forEach(inst => {
    map[inst.id] = {
      price:    inst.price,
      open:     inst.price,
      high:     inst.price,
      low:      inst.price,
      close:    inst.price,
      change:   0,
      changePct:0,
      prevPrice:inst.price,
      volume:   Math.floor(Math.random() * 50_000_000) + 5_000_000,
      vol:      inst.vol,
      direction:'none', // 'up' | 'down' | 'none'
      name:     inst.name,
      sector:   inst.sector,
      color:    inst.color,
    };
  });
  return map;
}

export const TIMEFRAMES = {
  '1m':  { label: '1m',  seconds: 60,   bars: 120 },
  '5m':  { label: '5m',  seconds: 300,  bars: 100 },
  '15m': { label: '15m', seconds: 900,  bars: 90 },
  '1h':  { label: '1h',  seconds: 3600, bars: 80 },
};

function buildOHLCHistory(basePrice, vol, bars = 100, intervalSeconds = 60) {
  const candles = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const alignedNow = Math.floor(nowSec / intervalSeconds) * intervalSeconds;
  const tfVol = vol * Math.sqrt(intervalSeconds / 60);
  let price = basePrice * (0.90 + Math.random() * 0.20);

  for (let i = bars; i >= 0; i--) {
    const t = alignedNow - i * intervalSeconds;
    const open = price;
    let hi = open;
    let lo = open;

    // Simulate realistic intra-bar price movement
    const steps = 8;
    let cur = open;
    for (let j = 0; j < steps; j++) {
      cur = gbmTick(cur, tfVol / Math.sqrt(steps));
      if (cur > hi) hi = cur;
      if (cur < lo) lo = cur;
    }
    const close = cur;
    price = close;

    candles.push({
      time: t,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(hi.toFixed(4)),
      low: parseFloat(lo.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.floor(Math.random() * 1_000_000 * Math.sqrt(intervalSeconds / 60)) + 50_000,
    });
  }

  // Ensure current candle's close matches the current price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}

export function useMarketSimulator(options = {}) {
  const tickMs = typeof options === 'number' ? options : (options.tickMs ?? 1000);
  const volatilityMultiplier = options.volatilityMultiplier ?? 1.0;
  const driftBias = options.driftBias ?? 0.0002;
  const isPaused = options.isPaused ?? false;

  const [prices, setPrices]         = useState(() => buildInitialPriceMap());
  const [ohlcHistory, setOhlcHistory] = useState({});
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  // Build OHLC history for all timeframes on mount
  useEffect(() => {
    const hist = {};
    ALL_INSTRUMENTS.forEach(inst => {
      hist[inst.id] = {
        '1m':  buildOHLCHistory(inst.price, inst.vol, TIMEFRAMES['1m'].bars, TIMEFRAMES['1m'].seconds),
        '5m':  buildOHLCHistory(inst.price, inst.vol, TIMEFRAMES['5m'].bars, TIMEFRAMES['5m'].seconds),
        '15m': buildOHLCHistory(inst.price, inst.vol, TIMEFRAMES['15m'].bars, TIMEFRAMES['15m'].seconds),
        '1h':  buildOHLCHistory(inst.price, inst.vol, TIMEFRAMES['1h'].bars, TIMEFRAMES['1h'].seconds),
      };
    });
    setOhlcHistory(hist);
  }, []);

  // Tick engine
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        ALL_INSTRUMENTS.forEach(inst => {
          const cur = prev[inst.id];
          const newPrice = gbmTick(cur.price, cur.vol, 1 / 252 / 390, driftBias, volatilityMultiplier);
          const dir = newPrice > cur.price ? 'up' : newPrice < cur.price ? 'down' : 'none';
          const change    = newPrice - cur.open;
          const changePct = (change / cur.open) * 100;

          next[inst.id] = {
            ...cur,
            prevPrice: cur.price,
            price:     parseFloat(newPrice.toFixed(inst.id.includes('/') ? 4 : 2)),
            high:      Math.max(cur.high, newPrice),
            low:       Math.min(cur.low, newPrice),
            close:     parseFloat(newPrice.toFixed(4)),
            change:    parseFloat(change.toFixed(2)),
            changePct: parseFloat(changePct.toFixed(2)),
            volume:    cur.volume + Math.floor(Math.random() * 50_000),
            direction: dir,
          };
        });
        return next;
      });

      // Update current OHLC candle across all 4 timeframes
      setOhlcHistory(prev => {
        const next = { ...prev };
        const nowSec = Math.floor(Date.now() / 1000);

        ALL_INSTRUMENTS.forEach(inst => {
          const instTfs = prev[inst.id];
          if (!instTfs) return;
          const cur = pricesRef.current[inst.id];
          if (!cur) return;

          next[inst.id] = { ...instTfs };

          ['1m', '5m', '15m', '1h'].forEach(tf => {
            const bars = instTfs[tf];
            if (!bars || bars.length === 0) return;
            const tfSeconds = TIMEFRAMES[tf].seconds;
            const lastBar = bars[bars.length - 1];
            const newBar = {
              ...lastBar,
              high:  Math.max(lastBar.high, cur.price),
              low:   Math.min(lastBar.low,  cur.price),
              close: cur.price,
            };

            // Push a new candle when current period expires
            if (nowSec - lastBar.time >= tfSeconds) {
              next[inst.id][tf] = [...bars, {
                time:   Math.floor(nowSec / tfSeconds) * tfSeconds,
                open:   cur.price,
                high:   cur.price,
                low:    cur.price,
                close:  cur.price,
                volume: 0,
              }];
            } else {
              next[inst.id][tf] = [...bars.slice(0, -1), newBar];
            }
          });
        });
        return next;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [tickMs, volatilityMultiplier, driftBias, isPaused]);

  // Portfolio market value recalc helper
  const getMarketValue = useCallback((holdings) => {
    return holdings.reduce((sum, h) => {
      const p = pricesRef.current[h.id];
      return sum + (p ? p.price * h.qty : 0);
    }, 0);
  }, []);

  // Real-time market shock engine triggered by breaking news events
  const applyMarketShock = useCallback(({ symbols = [], direction = 'bullish', magnitudePct = 3.5 }) => {
    if (!symbols.length) return;

    setPrices(prev => {
      const next = { ...prev };
      symbols.forEach(sym => {
        const cur = prev[sym];
        if (!cur) return;

        const mult = direction === 'bullish' ? 1 + magnitudePct / 100 : 1 - magnitudePct / 100;
        const newPrice = Math.max(cur.price * mult, 0.0001);
        const change = newPrice - cur.open;
        const changePct = (change / cur.open) * 100;
        const volumeSurge = Math.floor(Math.random() * 500_000) + 200_000;

        next[sym] = {
          ...cur,
          prevPrice: cur.price,
          price: parseFloat(newPrice.toFixed(sym.includes('/') ? 4 : 2)),
          high: Math.max(cur.high, newPrice),
          low: Math.min(cur.low, newPrice),
          close: parseFloat(newPrice.toFixed(4)),
          change: parseFloat(change.toFixed(2)),
          changePct: parseFloat(changePct.toFixed(2)),
          volume: cur.volume + volumeSurge,
          direction: direction === 'bullish' ? 'up' : 'down',
        };
      });
      return next;
    });

    // Also update OHLC history so charts react instantly
    setOhlcHistory(prev => {
      const next = { ...prev };
      symbols.forEach(sym => {
        const instTfs = prev[sym];
        if (!instTfs) return;
        const curP = pricesRef.current[sym];
        if (!curP) return;

        const mult = direction === 'bullish' ? 1 + magnitudePct / 100 : 1 - magnitudePct / 100;
        const shockPrice = Math.max(curP.price * mult, 0.0001);

        next[sym] = { ...instTfs };
        ['1m', '5m', '15m', '1h'].forEach(tf => {
          const bars = instTfs[tf];
          if (!bars || bars.length === 0) return;
          const lastBar = bars[bars.length - 1];
          next[sym][tf] = [
            ...bars.slice(0, -1),
            {
              ...lastBar,
              high: Math.max(lastBar.high, shockPrice),
              low: Math.min(lastBar.low, shockPrice),
              close: shockPrice,
              volume: lastBar.volume + 150_000,
            },
          ];
        });
      });
      return next;
    });
  }, []);

  return { prices, ohlcHistory, getMarketValue, applyMarketShock };
}
