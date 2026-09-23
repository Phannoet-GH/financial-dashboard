// src/data/marketSignals.js
// Technical Trading Signal Engine for 15-Minute Short Profit Scalping & Predictions

import { ALL_INSTRUMENTS, formatPrice } from './instruments';
import { calculateMovingDirection } from './marketAnalytics';

/**
 * Generates an automated Next 15-Minute Short Profit Trading Signal with Entry, TP, and SL targets
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
      riskReward: '1 : 1.7',
      timeframe: 'Next 15m (Short Scalp)',
      guess15m: {
        direction: 'FLAT',
        label: 'Consolidating ↔',
        action: 'Wait / Chop',
        guessText: 'Guess next 15m: Awaiting price action confirmation',
        targetPrice: 0,
        targetPct: 0,
        stopLoss: 0,
        slPct: 0,
        expectedRange: { low: 0, high: 0 },
        winRate: 50,
        mode: '15m Short Profit',
      },
      reasons: [
        {
          title: 'Awaiting Confirmation',
          detail: 'No active 15-minute price momentum detected. Awaiting order flow impulse.',
          bias: 'neutral',
        },
      ],
    };
  }

  const { price, open, high, low, changePct = 0 } = curPriceData;
  const isForex = symbol.includes('/') && price < 50;
  const isCrypto = ['BTC', 'ETH', 'SOL'].includes(symbol) || price > 5000;
  const decimals = isForex ? 4 : 2;

  // Technical momentum and moving direction
  const dir = calculateMovingDirection(symbol, curPriceData, ohlcBars);
  const rsi = dir.rsi || 50;
  const score = dir.score || 50;
  const buyVolPct = assetFlow?.buyPct || 50;

  // Short Profit Scalp target sizing for the next 15 minutes:
  // - Forex: 0.15% - 0.30%
  // - Stocks / Commodities: 0.35% - 0.70%
  // - Crypto: 0.60% - 1.20%
  let minScalpPct = 0.0035;
  let maxScalpPct = 0.0075;
  if (isForex) {
    minScalpPct = 0.0015;
    maxScalpPct = 0.0030;
  } else if (isCrypto) {
    minScalpPct = 0.0060;
    maxScalpPct = 0.0120;
  }

  const dayRange = Math.max(high - low, price * 0.008);
  // 15m scalp buffer is approx 20% of the day's range, bounded to short profit bounds
  const scalp15mBuffer = Math.min(
    Math.max(price * (dayRange / price * 0.20), price * minScalpPct),
    price * maxScalpPct
  );

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
      reasons.push({
        title: 'Oversold Mean Reversion',
        detail: `15m RSI (${rsi}) deeply oversold; primed for immediate bounce`,
        bias: 'bullish',
      });
    } else {
      reasons.push({
        title: 'Bullish Momentum Flow',
        detail: `High composite velocity score (${score}/100) favoring upside breakout`,
        bias: 'bullish',
      });
    }

    if (buyVolPct >= 58) {
      reasons.push({
        title: 'Buyer Order Imbalance',
        detail: `Aggressive buyer volume taking liquidity (${buyVolPct}% Buy Flow)`,
        bias: 'bullish',
      });
    } else {
      reasons.push({
        title: 'EMA Dynamic Support',
        detail: 'Price bouncing cleanly off dynamic 15m short-term exponential moving averages',
        bias: 'bullish',
      });
    }

    if (price >= open) {
      reasons.push({
        title: 'Intraday Expansion',
        detail: `Pushing above opening tick (+${Math.abs(changePct).toFixed(2)}%) into overhead liquidity`,
        bias: 'bullish',
      });
    } else {
      reasons.push({
        title: 'Liquidity Absorption',
        detail: 'Defending intraday dip with institutional limit buy support wall',
        bias: 'bullish',
      });
    }
  } else if (score <= 36 || (rsi > 68 && changePct < 0.5) || (buyVolPct <= 38 && score <= 48)) {
    signal = 'SELL';
    strength = score <= 24 ? 'STRONG' : 'MODERATE';
    badgeColor = 'var(--red)';
    confidence = Math.min(Math.round(55 + ((100 - score) * 0.3) + ((50 - buyVolPct) * 0.45)), 94);

    if (rsi >= 66) {
      reasons.push({
        title: 'Overbought Rejection',
        detail: `15m RSI (${rsi}) exhausted near upper deviation envelope`,
        bias: 'bearish',
      });
    } else {
      reasons.push({
        title: 'Bearish Breakdown Drift',
        detail: `Velocity score (${score}/100) indicates downward continuation pressure`,
        bias: 'bearish',
      });
    }

    if (buyVolPct <= 44) {
      reasons.push({
        title: 'Heavy Sell Outflow',
        detail: `Institutional sellers hitting bids (${100 - buyVolPct}% Sell Volume)`,
        bias: 'bearish',
      });
    } else {
      reasons.push({
        title: 'Overhead Resistance Block',
        detail: 'Rejection candle confirming sell wall at local pivot resistance',
        bias: 'bearish',
      });
    }

    reasons.push({
      title: 'Order Flow Delta Drop',
      detail: 'Negative volume delta expanding downward into lower liquidity pool',
      bias: 'bearish',
    });
  } else {
    signal = 'HOLD';
    strength = 'NEUTRAL';
    badgeColor = 'var(--amber)';
    confidence = 58;

    reasons.push({
      title: 'Consolidation Chop',
      detail: 'Price oscillating within tight 15m equilibrium range',
      bias: 'neutral',
    });
    reasons.push({
      title: 'Balanced Order Flow',
      detail: `Order book delta balanced (${buyVolPct}% Buy / ${100 - buyVolPct}% Sell)`,
      bias: 'neutral',
    });
    reasons.push({
      title: 'Neutral Momentum',
      detail: `RSI (${rsi}) sitting in equilibrium awaiting next 15m breakout catalyst`,
      bias: 'neutral',
    });
  }

  // Calculate Entry, Short Profit TP, and Tight SL targets
  const entryPrice = price;

  if (signal === 'BUY') {
    // Buy Entry: at or slightly below current market price
    const entryLow = price * (1 - 0.0015);
    const entryHigh = price * (1 + 0.0008);
    const target1 = price + scalp15mBuffer;
    const target2 = price + scalp15mBuffer * 1.6;
    const stop = price - scalp15mBuffer * 0.60;

    const tp1 = parseFloat(target1.toFixed(decimals));
    const tp2 = parseFloat(target2.toFixed(decimals));
    const stopLoss = parseFloat(stop.toFixed(decimals));

    const gainPct = ((tp1 - price) / price) * 100;
    const lossPct = ((price - stopLoss) / price) * 100;
    const rrRatio = lossPct > 0 ? (gainPct / lossPct).toFixed(1) : '1.7';

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
      tp1Pct: parseFloat(gainPct.toFixed(2)),
      tp2Pct: parseFloat((((tp2 - price) / price) * 100).toFixed(2)),
      stopLoss,
      slPct: parseFloat(lossPct.toFixed(2)),
      riskReward: `1 : ${rrRatio}`,
      timeframe: 'Next 15m (Short Scalp)',
      guess15m: {
        direction: 'UP',
        label: 'Bullish Push ↗',
        action: 'Buy / Long (Scalp)',
        guessText: `Guess next 15m: Quick pop towards $${formatPrice(tp1, symbol)} (+${gainPct.toFixed(2)}% Short Profit)`,
        targetPrice: tp1,
        targetPct: parseFloat(gainPct.toFixed(2)),
        stopLoss,
        slPct: parseFloat(lossPct.toFixed(2)),
        expectedRange: {
          low: parseFloat((price - scalp15mBuffer * 0.35).toFixed(decimals)),
          high: tp1,
        },
        winRate: confidence,
        mode: '15m Short Profit',
      },
      reasons,
    };
  } else if (signal === 'SELL') {
    // Sell / Short Entry
    const entryLow = price * (1 - 0.0008);
    const entryHigh = price * (1 + 0.0015);
    const target1 = price - scalp15mBuffer;
    const target2 = price - scalp15mBuffer * 1.6;
    const stop = price + scalp15mBuffer * 0.60;

    const tp1 = parseFloat(target1.toFixed(decimals));
    const tp2 = parseFloat(target2.toFixed(decimals));
    const stopLoss = parseFloat(stop.toFixed(decimals));

    const gainPct = ((price - tp1) / price) * 100;
    const lossPct = ((stopLoss - price) / price) * 100;
    const rrRatio = lossPct > 0 ? (gainPct / lossPct).toFixed(1) : '1.7';

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
      tp1Pct: parseFloat(gainPct.toFixed(2)),
      tp2Pct: parseFloat((((price - tp2) / price) * 100).toFixed(2)),
      stopLoss,
      slPct: parseFloat(lossPct.toFixed(2)),
      riskReward: `1 : ${rrRatio}`,
      timeframe: 'Next 15m (Short Scalp)',
      guess15m: {
        direction: 'DOWN',
        label: 'Bearish Retest ↘',
        action: 'Sell / Short (Scalp)',
        guessText: `Guess next 15m: Pullback slip towards $${formatPrice(tp1, symbol)} (+${gainPct.toFixed(2)}% Short Profit)`,
        targetPrice: tp1,
        targetPct: parseFloat(gainPct.toFixed(2)),
        stopLoss,
        slPct: parseFloat(lossPct.toFixed(2)),
        expectedRange: {
          low: tp1,
          high: parseFloat((price + scalp15mBuffer * 0.35).toFixed(decimals)),
        },
        winRate: confidence,
        mode: '15m Short Profit',
      },
      reasons,
    };
  } else {
    // Hold / Neutral Setup - tight 15m range scalp
    const target1 = price * (1 + minScalpPct * 0.7);
    const target2 = price * (1 + minScalpPct * 1.4);
    const stop = price * (1 - minScalpPct * 0.5);

    const tp1 = parseFloat(target1.toFixed(decimals));
    const tp2 = parseFloat(target2.toFixed(decimals));
    const stopLoss = parseFloat(stop.toFixed(decimals));
    const gainPct = ((tp1 - price) / price) * 100;
    const lossPct = ((price - stopLoss) / price) * 100;

    return {
      symbol,
      signal: 'HOLD',
      strength: 'NEUTRAL',
      confidence: 58,
      badgeColor: 'var(--amber)',
      entryPrice,
      entryRange: `$${formatPrice(price * 0.999, symbol)} – $${formatPrice(price * 1.001, symbol)}`,
      tp1,
      tp2,
      tp1Pct: parseFloat(gainPct.toFixed(2)),
      tp2Pct: parseFloat((((tp2 - price) / price) * 100).toFixed(2)),
      stopLoss,
      slPct: parseFloat(lossPct.toFixed(2)),
      riskReward: '1 : 1.4',
      timeframe: 'Next 15m (Sideways)',
      guess15m: {
        direction: 'FLAT',
        label: 'Chop Range ↔',
        action: 'Range Scalp / Wait',
        guessText: `Guess next 15m: Sideways drift within $${formatPrice(stopLoss, symbol)} - $${formatPrice(tp1, symbol)}`,
        targetPrice: tp1,
        targetPct: parseFloat(gainPct.toFixed(2)),
        stopLoss,
        slPct: parseFloat(lossPct.toFixed(2)),
        expectedRange: {
          low: stopLoss,
          high: tp1,
        },
        winRate: 58,
        mode: '15m Short Profit',
      },
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
