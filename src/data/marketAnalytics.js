// src/data/marketAnalytics.js
// Advanced Market Flow, Moving Direction, and Breaking News Impact Engine

import { ALL_INSTRUMENTS, SECTORS } from './instruments';

/**
 * Calculates a technical momentum score (0-100) and moving direction for an instrument
 */
export function calculateMovingDirection(symbol, curPriceData, ohlcBars = []) {
  if (!curPriceData) {
    return {
      status: 'NEUTRAL',
      label: 'Consolidating ↔',
      score: 50,
      color: '#ffb347',
      rsi: 50,
      support: 0,
      resistance: 0,
      emaStatus: 'Neutral Alignment',
      orderFlowBias: 'Balanced',
    };
  }

  const { price, open, high, low, changePct = 0 } = curPriceData;

  // Calculate approximate RSI from recent bars if available
  let rsi = 50;
  if (ohlcBars && ohlcBars.length >= 14) {
    let gains = 0;
    let losses = 0;
    for (let i = ohlcBars.length - 14; i < ohlcBars.length; i++) {
      const diff = ohlcBars[i].close - ohlcBars[i].open;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) rsi = 100;
    else {
      const rs = avgGain / avgLoss;
      rsi = parseFloat((100 - (100 / (1 + rs))).toFixed(1));
    }
  } else {
    // Dynamic simulated RSI anchored to price change
    rsi = Math.min(Math.max(parseFloat((50 + changePct * 5.2).toFixed(1)), 18), 88);
  }

  // Pivot Points (Classic standard formula)
  const pivot = (high + low + price) / 3;
  const resistance1 = 2 * pivot - low;
  const support1 = 2 * pivot - high;

  // Multi-factor directional score (0 - 100)
  // Factors: changePct, RSI, position relative to daily range
  const range = high - low || 1;
  const rangePosition = (price - low) / range; // 0 = at low, 1 = at high
  const changeScore = Math.min(Math.max(50 + changePct * 6.5, 5), 95);
  const compositeScore = Math.round(changeScore * 0.45 + rsi * 0.35 + rangePosition * 100 * 0.20);

  let status = 'NEUTRAL';
  let label = 'Consolidating ↔';
  let color = 'var(--amber)';
  let emaStatus = 'EMA 20/50 Neutral';
  let orderFlowBias = 'Neutral Flow';

  if (compositeScore >= 75) {
    status = 'STRONG_BULLISH';
    label = 'Strong Bullish ↗↗';
    color = 'var(--green)';
    emaStatus = 'Golden Alignment (EMA 9>21>50)';
    orderFlowBias = 'Aggressive Buying Pressure';
  } else if (compositeScore >= 58) {
    status = 'BULLISH';
    label = 'Bullish ↗';
    color = 'var(--cyan)';
    emaStatus = 'Bullish Expansion (EMA > 50)';
    orderFlowBias = 'Net Accumulation';
  } else if (compositeScore <= 25) {
    status = 'STRONG_BEARISH';
    label = 'Strong Bearish ↘↘';
    color = 'var(--red)';
    emaStatus = 'Death Cross (EMA 9<21<50)';
    orderFlowBias = 'Aggressive Selling Pressure';
  } else if (compositeScore <= 42) {
    status = 'BEARISH';
    label = 'Bearish ↘';
    color = '#ff6b9d';
    emaStatus = 'Bearish Pressure (EMA < 50)';
    orderFlowBias = 'Net Distribution';
  }

  return {
    status,
    label,
    score: compositeScore,
    color,
    rsi,
    support: parseFloat(support1.toFixed(price > 500 ? 2 : 4)),
    resistance: parseFloat(resistance1.toFixed(price > 500 ? 2 : 4)),
    emaStatus,
    orderFlowBias,
  };
}

/**
 * Calculates Capital Flow metrics across all tracked instruments and sectors
 */
export function calculateMarketFlow(prices) {
  let totalMarketInflow = 0;
  let totalMarketOutflow = 0;
  let advancingCount = 0;
  let decliningCount = 0;
  let neutralCount = 0;

  const assetFlows = {};

  ALL_INSTRUMENTS.forEach(inst => {
    const p = prices[inst.id];
    if (!p) return;

    const isUp = p.changePct > 0;
    const isDown = p.changePct < 0;

    if (isUp) advancingCount++;
    else if (isDown) decliningCount++;
    else neutralCount++;

    // Calculate approximate capital flow in millions based on volume, volatility, and change
    const baseVolumeUSD = (p.volume * p.price) / 1_000_000; // $M volume
    const buyRatio = Math.min(Math.max(0.50 + (p.changePct / 100) * 2.8, 0.20), 0.85);
    const sellRatio = 1 - buyRatio;

    const inflow = baseVolumeUSD * buyRatio;
    const outflow = baseVolumeUSD * sellRatio;
    const netFlow = inflow - outflow;

    totalMarketInflow += inflow;
    totalMarketOutflow += outflow;

    assetFlows[inst.id] = {
      id: inst.id,
      name: inst.name,
      sector: inst.sector,
      price: p.price,
      changePct: p.changePct,
      volume: p.volume,
      inflowM: parseFloat(inflow.toFixed(1)),
      outflowM: parseFloat(outflow.toFixed(1)),
      netFlowM: parseFloat(netFlow.toFixed(1)),
      buyPct: Math.round(buyRatio * 100),
      sellPct: Math.round(sellRatio * 100),
    };
  });

  // Calculate sector flows
  const sectorFlows = SECTORS.map(sec => {
    let sectorInflow = 0;
    let sectorOutflow = 0;
    let sectorChangeSum = 0;
    let count = 0;

    sec.stocks.forEach(sym => {
      const af = assetFlows[sym];
      if (af) {
        sectorInflow += af.inflowM;
        sectorOutflow += af.outflowM;
        sectorChangeSum += af.changePct;
        count++;
      }
    });

    const netSectorFlow = sectorInflow - sectorOutflow;
    const avgChange = count > 0 ? sectorChangeSum / count : 0;
    const buyVolPct = (sectorInflow + sectorOutflow) > 0
      ? Math.round((sectorInflow / (sectorInflow + sectorOutflow)) * 100)
      : 50;

    return {
      id: sec.id,
      color: sec.color,
      stocks: sec.stocks,
      inflowM: parseFloat(sectorInflow.toFixed(1)),
      outflowM: parseFloat(sectorOutflow.toFixed(1)),
      netFlowM: parseFloat(netSectorFlow.toFixed(1)),
      buyVolPct,
      avgChange: parseFloat(avgChange.toFixed(2)),
      dominantDirection: netSectorFlow >= 0 ? 'Inflow ↗' : 'Outflow ↘',
    };
  }).filter(s => s.stocks.length > 0);

  // Macro market consensus
  const totalFlow = totalMarketInflow + totalMarketOutflow || 1;
  const netMarketFlow = totalMarketInflow - totalMarketOutflow;
  const marketBuyPct = Math.round((totalMarketInflow / totalFlow) * 100);

  // Fear & Greed Index simulation (0 - 100)
  const fearAndGreed = Math.min(Math.max(Math.round(marketBuyPct * 0.9 + (advancingCount / (advancingCount + decliningCount || 1)) * 25), 10), 92);

  let macroDirection = 'MODERATE_BULLISH';
  let macroLabel = 'BULLISH FLOW INFLOW (Buyers Dominating)';
  let macroColor = 'var(--cyan)';

  if (marketBuyPct >= 62) {
    macroDirection = 'STRONG_BULLISH';
    macroLabel = 'AGGRESSIVE BULLISH EXPANSION (+60%+ Buying Pressure)';
    macroColor = 'var(--green)';
  } else if (marketBuyPct <= 38) {
    macroDirection = 'STRONG_BEARISH';
    macroLabel = 'HEAVY INSTITUTIONAL OUTFLOW (High Selling Pressure)';
    macroColor = 'var(--red)';
  } else if (marketBuyPct <= 46) {
    macroDirection = 'BEARISH';
    macroLabel = 'BEARISH DISTRIBUTION (Outflow Pressure)';
    macroColor = '#ff6b9d';
  } else if (marketBuyPct >= 54) {
    macroDirection = 'BULLISH';
    macroLabel = 'MODERATE BULLISH (Net Inflow Accumulation)';
    macroColor = 'var(--cyan)';
  } else {
    macroDirection = 'NEUTRAL';
    macroLabel = 'CHOPPY / NEUTRAL CONSOLIDATION (Balanced Delta)';
    macroColor = 'var(--amber)';
  }

  return {
    netMarketFlowM: parseFloat(netMarketFlow.toFixed(1)),
    totalMarketInflowM: parseFloat(totalMarketInflow.toFixed(1)),
    totalMarketOutflowM: parseFloat(totalMarketOutflow.toFixed(1)),
    marketBuyPct,
    marketSellPct: 100 - marketBuyPct,
    advancingCount,
    decliningCount,
    neutralCount,
    fearAndGreed,
    macroDirection,
    macroLabel,
    macroColor,
    sectorFlows,
    assetFlows,
  };
}

/**
 * Generates an institutional Whale Block Trade event
 */
export function generateWhaleOrder(prices) {
  const inst = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
  const p = prices[inst.id] ? prices[inst.id].price : inst.price;
  const isBuy = Math.random() > 0.45;
  const tradeTypes = ['INSTITUTIONAL BLOCK', 'DARK POOL CROSS', 'WHALE SWEEP', 'ALGO ACCUMULATION', 'LIQUIDITY ABSORB'];
  const venues = ['Direct Feed [EDGX]', 'Dark Liquidity Pool [ATS]', 'Institutional ECN', 'Prime Brokerage Sweep'];

  // Random size from $300k to $7.5M
  const notionalUSD = Math.floor(Math.random() * 6_800_000) + 350_000;
  const qty = p > 0 ? (notionalUSD / p).toFixed(p > 500 ? 2 : inst.id.includes('/') ? 0 : 0) : 1000;

  return {
    id: `whale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    time: new Date().toLocaleTimeString(),
    symbol: inst.id,
    name: inst.name,
    color: inst.color,
    price: p,
    qty: parseFloat(qty).toLocaleString('en-US'),
    notionalUSD: parseFloat((notionalUSD / 1_000_000).toFixed(2)), // in Millions
    side: isBuy ? 'BUY' : 'SELL',
    type: tradeTypes[Math.floor(Math.random() * tradeTypes.length)],
    venue: venues[Math.floor(Math.random() * venues.length)],
  };
}

/**
 * Catalog of High-Impact Breaking Catalysts with market shock vectors
 */
export const PRESET_BREAKING_NEWS = [
  {
    id: 'cat-1',
    headline: 'Federal Reserve Announces Emergency 50bps Benchmark Rate Cut',
    summary: 'The Federal Reserve announced an unscheduled 50-basis-point emergency rate cut citing decelerating inflation and a desire to bolster global liquidity.',
    category: 'Macro / Monetary Policy',
    impactLevel: 'CRITICAL',
    source: 'Bloomberg Terminal',
    primarySymbol: 'BTC',
    correlatedSymbols: ['ETH', 'AAPL', 'NVDA', 'EUR/USD'],
    direction: 'bullish',
    expectedImpactPct: 4.8,
    rationale: 'Substantially reduces capital borrowing costs, ignites high-beta technology rally, and triggers massive crypto liquidity inflow.',
  },
  {
    id: 'cat-2',
    headline: 'SEC Approves Universal Spot Crypto ETF Staking & Clearing Framework',
    summary: 'The Securities and Exchange Commission has formally approved nationwide clearing rules permitting spot crypto ETFs to offer native network staking yield.',
    category: 'Crypto Regulation',
    impactLevel: 'CRITICAL',
    source: 'CoinDesk Pro',
    primarySymbol: 'ETH',
    correlatedSymbols: ['BTC', 'SOL', 'BNB', 'AVAX'],
    direction: 'bullish',
    expectedImpactPct: 6.5,
    rationale: 'Unlocks hundreds of billions in institutional pension capital seeking real yield in decentralized assets.',
  },
  {
    id: 'cat-3',
    headline: 'NVIDIA Unveils Quantum AI Architecture with 12x Compute Leap',
    summary: 'NVIDIA CEO introduced next-generation Rubin-Ultra quantum architecture, announcing exclusive multi-billion enterprise deployments across cloud hyperscalers.',
    category: 'Tech Innovation',
    impactLevel: 'HIGH',
    source: 'Reuters Financial',
    primarySymbol: 'NVDA',
    correlatedSymbols: ['MSFT', 'GOOGL', 'AAPL', 'META'],
    direction: 'bullish',
    expectedImpactPct: 5.2,
    rationale: 'Expands NVIDIA competitive moat; lifts broad semiconductor indices and AI cloud partners.',
  },
  {
    id: 'cat-4',
    headline: 'Major Geopolitical Disruption Shuts Key Strait of Hormuz Energy Transit',
    summary: 'Naval blockades have halted commercial oil tankers in the Persian Gulf, threatening sudden global supply deficit of 4.2M barrels per day.',
    category: 'Geopolitics & Commodities',
    impactLevel: 'CRITICAL',
    source: 'Wall Street Journal',
    primarySymbol: 'XOM',
    correlatedSymbols: ['TSLA', 'USD/JPY', 'AMZN'],
    direction: 'bearish', // general market risk-off, though oil surges
    expectedImpactPct: -3.8,
    rationale: 'Energy equities surge while transport, automotive, and consumer discretionary face acute inflationary margin compressions.',
  },
  {
    id: 'cat-5',
    headline: 'Apple Unveils Revolutionary Autonomous AI Agent Ecosystem with Siri Quantum',
    summary: 'Apple revealed native neural hardware integration across 2.2B active devices, creating an omni-channel automated digital commerce layer.',
    category: 'Consumer Tech',
    impactLevel: 'HIGH',
    source: 'Financial Times',
    primarySymbol: 'AAPL',
    correlatedSymbols: ['GOOGL', 'META', 'AMZN'],
    direction: 'bullish',
    expectedImpactPct: 4.0,
    rationale: 'Catalyzes anticipated multi-year hardware replacement supercycle and high-margin services expansion.',
  },
  {
    id: 'cat-6',
    headline: 'US Department of Justice Files Sweeping Monopolistic Antitrust Injunction',
    summary: 'Federal antitrust authorities filed a court injunction seeking structural remedies and segment spin-offs against leading tech hyperscalers.',
    category: 'Antitrust & Regulation',
    impactLevel: 'CRITICAL',
    source: 'CNBC Breaking',
    primarySymbol: 'GOOGL',
    correlatedSymbols: ['META', 'MSFT', 'AAPL'],
    direction: 'bearish',
    expectedImpactPct: -4.5,
    rationale: 'Sparks institutional risk-off rotation away from megacap tech equities into treasury safety and defensively positioned sectors.',
  },
  {
    id: 'cat-7',
    headline: 'Tesla Achieves Level-5 Full Self-Driving Regulatory Clearance in 30 States',
    summary: 'US Department of Transportation granted historic autonomous commercial fleet license to Tesla CyberCab robotaxi network across 30 states.',
    category: 'Automotive & AI',
    impactLevel: 'HIGH',
    source: 'TechCrunch Enterprise',
    primarySymbol: 'TSLA',
    correlatedSymbols: ['NVDA', 'SOL', 'AAPL'],
    direction: 'bullish',
    expectedImpactPct: 7.5,
    rationale: 'Transforms company valuation multiples from automotive manufacturer to high-margin recurring autonomous software network.',
  },
  {
    id: 'cat-8',
    headline: 'European Central Bank Delivers Surprise Emergency Rate Hike on Inflation Surge',
    summary: 'ECB President announced sudden 25bps rate increase to combat localized service inflation, driving Euro exchange rates to 14-month highs.',
    category: 'Forex & Macro',
    impactLevel: 'HIGH',
    source: 'Reuters Forex',
    primarySymbol: 'EUR/USD',
    correlatedSymbols: ['GBP/USD', 'USD/CHF', 'USD/JPY'],
    direction: 'bullish',
    expectedImpactPct: 2.1,
    rationale: 'Aggressively recalibrates transatlantic sovereign interest rate differentials in favor of European currencies.',
  },
  {
    id: 'cat-gold-1',
    headline: 'Spot Gold Breaks Historic All-Time High Past $4,400 on Massive Central Bank Buying',
    summary: 'Spot Gold (XAU/USD) shattered all-time records surging past $4,400/oz as global central banks, sovereign wealth funds, and institutional desks ramp up reserve diversification.',
    category: 'Commodities & Metals',
    impactLevel: 'CRITICAL',
    source: 'World Gold Council / Bloomberg',
    primarySymbol: 'XAU/USD',
    correlatedSymbols: ['XAG/USD', 'BTC', 'USD/JPY', 'XOM'],
    direction: 'bullish',
    expectedImpactPct: 5.4,
    rationale: 'Persistent global inflation hedges, geopolitical flight-to-safety, and de-dollarization flows propel gold demand to unprecedented highs.',
  },
];
