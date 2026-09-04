// src/hooks/useNews.js
import { useState, useEffect } from 'react';
import { ALL_INSTRUMENTS, NEWS_TEMPLATES } from '../data/instruments';

function generateHeadline(prices) {
  const inst = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
  const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
  const pct   = (Math.random() * 8 + 0.5).toFixed(1);
  const price = prices[inst.id] ? prices[inst.id].price.toFixed(2) : '100.00';
  return {
    id:   Date.now() + Math.random(),
    sym:  inst.id,
    text: tmpl.replace('{sym}', inst.id).replace('{pct}', pct).replace('${price}', price),
    time: new Date().toLocaleTimeString(),
    type: Math.random() > 0.5 ? 'bullish' : 'bearish',
    color: inst.color,
  };
}

export function useNews(prices) {
  const [news, setNews] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id:   i,
      sym:  ALL_INSTRUMENTS[i % ALL_INSTRUMENTS.length].id,
      text: NEWS_TEMPLATES[i % NEWS_TEMPLATES.length]
              .replace('{sym}', ALL_INSTRUMENTS[i % ALL_INSTRUMENTS.length].id)
              .replace('{pct}', (Math.random() * 5 + 0.5).toFixed(1))
              .replace('${price}', (Math.random() * 500 + 100).toFixed(2)),
      time: new Date(Date.now() - (8 - i) * 120_000).toLocaleTimeString(),
      type: i % 2 === 0 ? 'bullish' : 'bearish',
      color: ALL_INSTRUMENTS[i % ALL_INSTRUMENTS.length].color,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(prices).length === 0) return;
      setNews(prev => [generateHeadline(prices), ...prev].slice(0, 30));
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [prices]);

  return news;
}
