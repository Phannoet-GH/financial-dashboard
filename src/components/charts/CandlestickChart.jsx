// src/components/charts/CandlestickChart.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { calculateMovingDirection } from '../../data/marketAnalytics';
import { Compass } from 'lucide-react';
import './CandlestickChart.css';

const INTERVALS = ['1m', '5m', '15m', '1h'];

export default function CandlestickChart() {
  const { prices, ohlcHistory, selectedSymbol, setSelectedSymbol, marketFlowData, navigateTo } = useMarket();
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const volSeriesRef = useRef(null);
  const [interval, setInterval_] = useState('1m');
  const [ohlc, setOhlc] = useState(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background:  { type: ColorType.Solid, color: 'transparent' },
        textColor:   '#8896b0',
        fontFamily:  "'JetBrains Mono', monospace",
        fontSize:    11,
      },
      grid: {
        vertLines:   { color: 'rgba(255,255,255,0.04)' },
        horzLines:   { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(0,212,255,0.5)', width: 1, style: 3 },
        horzLine: { color: 'rgba(0,212,255,0.5)', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor:   '#8896b0',
      },
      timeScale: {
        borderColor:     'rgba(255,255,255,0.06)',
        timeVisible:     true,
        secondsVisible:  false,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        '#00ff88',
      downColor:      '#ff4757',
      borderUpColor:  '#00ff88',
      borderDownColor:'#ff4757',
      wickUpColor:    '#00ff88',
      wickDownColor:  '#ff4757',
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color:            'rgba(0,212,255,0.2)',
      priceFormat:      { type: 'volume' },
      priceScaleId:     'volume',
    });

    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current     = chart;
    seriesRef.current    = candleSeries;
    volSeriesRef.current = volSeries;

    // Crosshair hover OHLC update
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const data = param.seriesData.get(candleSeries);
      if (data && data.open !== undefined) {
        setOhlc({
          open:  data.open,
          high:  data.high,
          low:   data.low,
          close: data.close,
        });
      }
    });

    const resizeObs = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObs.observe(containerRef.current);

    return () => {
      resizeObs.disconnect();
      chart.remove();
    };
  }, []);

  const lastKeyRef = useRef({ symbol: null, interval: null });

  // Load / reload candle data when symbol OR timeframe interval changes
  useEffect(() => {
    const instData = ohlcHistory[selectedSymbol];
    if (!instData || !seriesRef.current) return;

    const hist = instData[interval] || instData['1m'] || (Array.isArray(instData) ? instData : []);
    if (!hist || hist.length === 0) return;

    const currentKey = `${selectedSymbol}-${interval}`;
    const prevKey    = `${lastKeyRef.current.symbol}-${lastKeyRef.current.interval}`;

    if (currentKey !== prevKey) {
      lastKeyRef.current = { symbol: selectedSymbol, interval };
      seriesRef.current.setData(hist);
      volSeriesRef.current?.setData(hist.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0,255,136,0.25)' : 'rgba(255,71,87,0.25)',
      })));
      chartRef.current?.timeScale().fitContent();

      const last = hist[hist.length - 1];
      if (last) {
        setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close });
      }
    }
  }, [selectedSymbol, interval, ohlcHistory]);

  // Live update: mutate last candle of the selected timeframe
  useEffect(() => {
    const p = prices[selectedSymbol];
    if (!p || !seriesRef.current) return;

    const instData = ohlcHistory[selectedSymbol];
    const bars = instData?.[interval] || instData?.['1m'] || (Array.isArray(instData) ? instData : null);
    if (!bars || bars.length === 0) return;

    const last = bars[bars.length - 1];
    seriesRef.current.update(last);
    volSeriesRef.current?.update({
      time:  last.time,
      value: last.volume,
      color: last.close >= last.open ? 'rgba(0,255,136,0.25)' : 'rgba(255,71,87,0.25)',
    });

    setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close });
  }, [prices, selectedSymbol, interval, ohlcHistory]);

  const p = prices[selectedSymbol];
  const bars = ohlcHistory[selectedSymbol]?.[interval] || [];
  const directionData = useMemo(() => {
    return calculateMovingDirection(selectedSymbol, p, bars);
  }, [selectedSymbol, p, bars]);
  const assetFlow = marketFlowData?.assetFlows?.[selectedSymbol];

  function handleIntervalChange(iv) {
    setInterval_(iv);
    // Reset key so useEffect triggers immediate data reload for the new timeframe
    lastKeyRef.current = { symbol: null, interval: null };
  }

  return (
    <div className="candlestick-root glass-card">
      {/* Header */}
      <div className="chart-header">
        <div className="chart-header-left">
          <select
            className="select symbol-select"
            value={selectedSymbol}
            onChange={e => {
              setSelectedSymbol(e.target.value);
              lastKeyRef.current = { symbol: null, interval: null };
            }}
          >
            {ALL_INSTRUMENTS.map(i => (
              <option key={i.id} value={i.id}>{i.id} — {i.name}</option>
            ))}
          </select>
          {p && (
            <div className="chart-price-group">
              <span className="chart-current-price text-mono">{p.price.toFixed(p.id?.includes('/') ? 4 : 2)}</span>
              <span
                className="chart-change text-mono"
                style={{ color: p.changePct >= 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%
              </span>
            </div>
          )}
          {directionData && (
            <div
              className="chart-direction-pill"
              style={{
                borderColor: directionData.color + '66',
                color: directionData.color,
                background: directionData.color + '15',
              }}
              onClick={() => navigateTo('flow')}
              title={`View ${selectedSymbol} in Market Flow Radar (Score: ${directionData.score}/100 | RSI: ${directionData.rsi})`}
            >
              <Compass size={12} />
              <span>{directionData.label}</span>
              {assetFlow && (
                <span className="chart-flow-tag text-mono">
                  {assetFlow.buyPct}% Inflow
                </span>
              )}
            </div>
          )}
        </div>
        <div className="chart-header-right">
          {ohlc && (
            <div className="ohlc-row">
              <span>O <b className="text-mono">{ohlc.open.toFixed(2)}</b></span>
              <span>H <b className="text-mono text-green">{ohlc.high.toFixed(2)}</b></span>
              <span>L <b className="text-mono text-red">{ohlc.low.toFixed(2)}</b></span>
              <span>C <b className="text-mono">{ohlc.close.toFixed(2)}</b></span>
            </div>
          )}
          <div className="tab-bar">
            {INTERVALS.map(iv => (
              <button
                key={iv}
                className={`tab-item${interval === iv ? ' active' : ''}`}
                onClick={() => handleIntervalChange(iv)}
                title={`Switch to ${iv} candlestick timeframe`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Chart */}
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
