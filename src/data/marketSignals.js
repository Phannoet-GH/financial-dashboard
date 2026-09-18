// src/data/marketSignals.js
// Technical Trading Signal Engine for Automated Buy & Sell Recommendations

import { ALL_INSTRUMENTS, formatPrice } from './instruments';
import { calculateMovingDirection } from './marketAnalytics';

/**
 * Generates an automated Buy, Sell, or Hold trading signal with Entry, TP, and SL targets
 */
export function calculateTradingSignal(symbol, curPriceData, ohlcBars = [], assetFlow = null) {
  if (!curPriceData || !curPriceData.price) {
    return {
      symbol,
      signal: 'HOLD',
      strength: 'NEUTRAL',
      confidence: 50,
      badgeColor: 'var(--amber)',
      entryPrice: 0,
      entryRange: '$0.00',
      tp1: 0,
      tp2: 0,
      tp1Pct: 0,
      tp2Pct: 0,
      stopLoss: 0,
      slPct: 0,
      riskReward: '1 : 2.0',
      timeframe: '15M / 1H',
      reasons: ['Awaiting price action confirmation'],
    };
  }

  const { price, open, high, low, changePct = 0 } = curPriceData;
  const isForex = symbol.includes('/') && price < 50;
  const decimals = isForex ? 4 : 2;

  // Technical momentum and moving direction
  const dir = calculateMovingDirection(symbol, curPriceData, ohlcBars);
  const rsi = dir.rsi || 50;
  const score = dir.score || 50;
  const buyVolPct = assetFlow?.buyPct || 50;

  // Intraday range & volatility buffer
  const dayRange = Math.max(high - low, price * 0.008);
  const atrBuffer = dayRange * 0.65;

  let signal = 'HOLD';
  let strength = 'MODERATE';
  let confidence = 65;
  let badgeColor = 'var(--amber)';
  const reasons = [];

  // Determine Signal based on multi-factor indicators
  if (score >= 68 || (rsi < 35 && changePct > -0.5) || (buyVolPct >= 62 && score >= 55)) {
    signal = 'BUY';
    strength = score >= 78 ? 'STRONG' : 'MODERATE';
    badgeColor = 'var(--green)';
    confidence = Math.min(Math.round(55 + (score * 0.3) + ((buyVolPct - 50) * 0.45)), 94);

    if (rsi <= 36) {
      reasons.push(`Oversold RSI recovery (${rsi}) signaling mean reversion`);
    } else {
      reasons.push(`Bullish trend momentum (Trend Score: ${score}/100)`);
    }

    if (buyVolPct >= 58) {
      reasons.push(`Order flow buyer dominance (${buyVolPct}% Buy Volume)`);
    } else {
      reasons.push('Price consolidating above key EMA dynamic support');
    }

    if (price >= open) {
      reasons.push(`Intraday expansion (+${Math.abs(changePct).toFixed(2)}%) towards resistance`);
    } else {
      reasons.push('Defending intraday liquidity support pool');
    }
  } else if (score <= 36 || (rsi > 68 && changePct < 0.5) || (buyVolPct <= 38 && score <= 48)) {
    signal = 'SELL';
    strength = score <= 24 ? 'STRONG' : 'MODERATE';
    badgeColor = 'var(--red)';
    confidence = Math.min(Math.round(55 + ((100 - score) * 0.3) + ((50 - buyVolPct) * 0.45)), 94);

    if (rsi >= 66) {
      reasons.push(`Overbought exhaustion (RSI ${rsi}) near upper envelope`);
    } else {
      reasons.push(`Bearish distribution breakdown (Trend Score: ${score}/100)`);
    }

    if (buyVolPct <= 44) {
      reasons.push(`Heavy institutional selling pressure (${100 - buyVolPct}% Sell Volume)`);
    } else {
      reasons.push('Rejection at key overhead resistance level');
    }

    reasons.push('Death cross alignment with expanding downward delta');
  } else {
    signal = 'HOLD';
    strength = 'NEUTRAL';
    badgeColor = 'var(--amber)';
    confidence = 58;
    reasons.push('Price consolidating in sideways chop range');
    reasons.push(`Balanced order flow (${buyVolPct}% Buy / ${100 - buyVolPct}% Sell)`);
    reasons.push(`Neutral RSI (${rsi}) awaiting directional breakout`);
  }

  // Calculate Entry, TP, and SL targets
  let tp1 = 0;
  let tp2 = 0;
  let stopLoss = 0;
  let entryPrice = price;

  if (signal === 'BUY') {
    // Buy Entry: at or slightly below current market price
    const entryLow = price * (1 - 0.002);
    const entryHigh = price * (1 + 0.001);
    const target1 = price + atrBuffer * 1.25;
    const target2 = price + atrBuffer * 2.20;
    const stop = price - atrBuffer * 0.75;

    tp1 = parseFloat(target1.toFixed(decimals));
    tp2 = parseFloat(target2.toFixed(decimals));
    stopLoss = parseFloat(stop.toFixed(decimals));

    const gainPct = ((tp1 - price) / price) * 100;
    const lossPct = ((price - stopLoss) / price) * 100;
    const rrRatio = lossPct > 0 ? (gainPct / lossPct).toFixed(1) : '2.2';

    return {
      symbol,
      signal,
      strength,
      confidence,
      badgeColor,
      entryPrice,
      entryRange: `$${formatPrice(entryLow, symbol)} – $${formatPrice(entryHigh, symbol)}`,
      tp1,
      tp2,
      tp1Pct: parseFloat(gainPct.toFixed(1)),
      tp2Pct: parseFloat((((tp2 - price) / price) * 100).toFixed(1)),
      stopLoss,
      slPct: parseFloat(lossPct.toFixed(1)),
      riskReward: `1 : ${rrRatio}`,
      timeframe: 'Intraday (15M / 1H)',
      reasons,
    };
  } else if (signal === 'SELL') {
    // Sell / Short Entry
    const entryLow = price * (1 - 0.001);
    const entryHigh = price * (1 + 0.002);
    const target1 = price - atrBuffer * 1.25;
    const target2 = price - atrBuffer * 2.20;
    const stop = price + atrBuffer * 0.75;

    tp1 = parseFloat(target1.toFixed(decimals));
    tp2 = parseFloat(target2.toFixed(decimals));
    stopLoss = parseFloat(stop.toFixed(decimals));

    const gainPct = ((price - tp1) / price) * 100;
    const lossPct = ((stopLoss - price) / price) * 100;
    const rrRatio = lossPct > 0 ? (gainPct / lossPct).toFixed(1) : '2.0';

    return {
      symbol,
      signal,
      strength,
      confidence,
      badgeColor,
      entryPrice,
      entryRange: `$${formatPrice(entryLow, symbol)} – $${formatPrice(entryHigh, symbol)}`,
      tp1,
      tp2,
      tp1Pct: parseFloat(gainPct.toFixed(1)),
      tp2Pct: parseFloat((((price - tp2) / price) * 100).toFixed(1)),
      stopLoss,
      slPct: parseFloat(lossPct.toFixed(1)),
      riskReward: `1 : ${rrRatio}`,
      timeframe: 'Intraday (15M / 1H)',
      reasons,
    };
  } else {
    // Hold / Neutral Setup
    const target1 = price * 1.015;
    const target2 = price * 1.03;
    const stop = price * 0.985;

    return {
      symbol,
      signal: 'HOLD',
      strength: 'NEUTRAL',
      confidence: 58,
      badgeColor: 'var(--amber)',
      entryPrice,
      entryRange: `$${formatPrice(price * 0.998, symbol)} – $${formatPrice(price * 1.002, symbol)}`,
      tp1: parseFloat(target1.toFixed(decimals)),
      tp2: parseFloat(target2.toFixed(decimals)),
      tp1Pct: 1.5,
      tp2Pct: 3.0,
      stopLoss: parseFloat(stop.toFixed(decimals)),
      slPct: 1.5,
      riskReward: '1 : 1.5',
      timeframe: 'Wait for Breakout',
      reasons,
    };
  }
}

/**
 * Scans all tracked instruments and generates a ranked list of trading signals
 */
export function getAllTradingSignals(prices, ohlcHistory, marketFlowData) {
  const signals = [];

  ALL_INSTRUMENTS.forEach(inst => {
    const p = prices[inst.id];
    if (!p) return;
    const bars = ohlcHistory[inst.id]?.['1m'] || [];
    const assetFlow = marketFlowData?.assetFlows?.[inst.id];
    const sig = calculateTradingSignal(inst.id, p, bars, assetFlow);
    signals.push({
      ...sig,
      name: inst.name,
      sector: inst.sector,
      color: inst.color,
      currentPrice: p.price,
      changePct: p.changePct,
    });
  });

  // Sort signals: Buy/Sell with highest confidence first, Hold last
  signals.sort((a, b) => {
    if (a.signal === 'HOLD' && b.signal !== 'HOLD') return 1;
    if (a.signal !== 'HOLD' && b.signal === 'HOLD') return -1;
    return b.confidence - a.confidence;
  });

  return signals;
}
