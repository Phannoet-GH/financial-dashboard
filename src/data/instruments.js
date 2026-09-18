// src/data/instruments.js
// All tradeable instruments with initial prices and metadata

export const INSTRUMENTS = {
  stocks: [
    { id: 'AAPL',  name: 'Apple Inc.',            price: 189.45, vol: 0.018, sector: 'Technology',   color: '#00d4ff' },
    { id: 'MSFT',  name: 'Microsoft Corp.',        price: 374.20, vol: 0.016, sector: 'Technology',   color: '#a855f7' },
    { id: 'NVDA',  name: 'NVIDIA Corp.',           price: 875.60, vol: 0.030, sector: 'Technology',   color: '#00ff88' },
    { id: 'GOOGL', name: 'Alphabet Inc.',          price: 155.80, vol: 0.017, sector: 'Technology',   color: '#ffb347' },
    { id: 'AMZN',  name: 'Amazon.com Inc.',        price: 185.30, vol: 0.020, sector: 'Consumer',     color: '#ff6b9d' },
    { id: 'META',  name: 'Meta Platforms Inc.',    price: 508.70, vol: 0.022, sector: 'Technology',   color: '#00d4ff' },
    { id: 'TSLA',  name: 'Tesla Inc.',             price: 240.10, vol: 0.040, sector: 'Automotive',   color: '#ff4757' },
    { id: 'JPM',   name: 'JPMorgan Chase & Co.',  price: 202.85, vol: 0.014, sector: 'Finance',      color: '#ffb347' },
    { id: 'JNJ',   name: 'Johnson & Johnson',      price: 158.20, vol: 0.010, sector: 'Healthcare',   color: '#a855f7' },
    { id: 'XOM',   name: 'Exxon Mobil Corp.',     price: 116.40, vol: 0.016, sector: 'Energy',       color: '#ff6b35' },
  ],
  crypto: [
    { id: 'BTC',  name: 'Bitcoin',       price: 67850.00, vol: 0.025, sector: 'Crypto', color: '#ffb347' },
    { id: 'ETH',  name: 'Ethereum',      price: 3480.50,  vol: 0.030, sector: 'Crypto', color: '#a855f7' },
    { id: 'SOL',  name: 'Solana',        price: 182.30,   vol: 0.045, sector: 'Crypto', color: '#00ff88' },
    { id: 'BNB',  name: 'BNB',           price: 598.70,   vol: 0.022, sector: 'Crypto', color: '#ffb347' },
    { id: 'AVAX', name: 'Avalanche',     price: 38.90,    vol: 0.050, sector: 'Crypto', color: '#ff4757' },
  ],
  forex: [
    { id: 'EUR/USD', name: 'Euro / US Dollar',      price: 1.0845, vol: 0.004, sector: 'Forex', color: '#00d4ff' },
    { id: 'GBP/USD', name: 'British Pound / USD',   price: 1.2705, vol: 0.005, sector: 'Forex', color: '#a855f7' },
    { id: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 149.25, vol: 0.003, sector: 'Forex', color: '#00ff88' },
    { id: 'USD/CHF', name: 'US Dollar / Swiss Franc',  price: 0.8920, vol: 0.004, sector: 'Forex', color: '#ffb347' },
  ],
  commodities: [
    { id: 'XAU/USD', name: 'Gold (Spot / USD)', price: 2384.50, vol: 0.012, sector: 'Commodities', color: '#fbbf24' },
    { id: 'XAG/USD', name: 'Silver (Spot / USD)', price: 28.60, vol: 0.022, sector: 'Commodities', color: '#cbd5e1' },
  ],
};

// Flat array for easy iteration
export const ALL_INSTRUMENTS = [
  ...INSTRUMENTS.stocks,
  ...INSTRUMENTS.crypto,
  ...INSTRUMENTS.forex,
  ...INSTRUMENTS.commodities,
];

// Sector heatmap grid data
export const SECTORS = [
  { id: 'Technology',  stocks: ['AAPL','MSFT','NVDA','GOOGL','META'], color: '#00d4ff' },
  { id: 'Finance',     stocks: ['JPM'],                               color: '#ffb347' },
  { id: 'Healthcare',  stocks: ['JNJ'],                               color: '#a855f7' },
  { id: 'Consumer',    stocks: ['AMZN'],                              color: '#ff6b9d' },
  { id: 'Energy',      stocks: ['XOM'],                               color: '#ff6b35' },
  { id: 'Automotive',  stocks: ['TSLA'],                              color: '#ff4757' },
  { id: 'Crypto',      stocks: ['BTC','ETH','SOL','BNB','AVAX'],     color: '#00ff88' },
  { id: 'Forex',       stocks: ['EUR/USD','GBP/USD'],                 color: '#38bdf8' },
  { id: 'Commodities', stocks: ['XAU/USD','XAG/USD'],                 color: '#fbbf24' },
  { id: 'Real Estate', stocks: [],                                    color: '#34d399' },
];

// News templates for simulation
export const NEWS_TEMPLATES = [
  '{sym} surges {pct}% on strong earnings beat',
  '{sym} falls {pct}% amid market sell-off',
  'Analysts upgrade {sym} with price target of ${price}',
  '{sym} announces share buyback program worth $5B',
  'Breaking: {sym} CEO steps down — stock reacts',
  '{sym} Q3 revenue exceeds estimates by {pct}%',
  'Federal Reserve hints at rate cut — {sym} rallies',
  '{sym} expands into new markets, stock up {pct}%',
  'Technical analysis: {sym} breaks key resistance at ${price}',
  '{sym} institutional holdings increase by {pct}%',
];

export function formatPrice(price, sym) {
  if (!sym) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sym === 'XAU/USD' || price > 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sym.includes('/') && price < 50) return price.toFixed(4);
  return price.toFixed(2);
}

export function formatVolume(vol) {
  if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
  return vol.toString();
}
