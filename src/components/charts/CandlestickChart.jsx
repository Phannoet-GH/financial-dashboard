// src/components/charts/CandlestickChart.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import { useMarket } from '../../context/MarketContext';
import { ALL_INSTRUMENTS, formatPrice } from '../../data/instruments';
import { calculateMovingDirection } from '../../data/marketAnalytics';
import { calculateTradingSignal } from '../../data/marketSignals';
import { Compass, Zap, ShieldCheck, ChevronDown, ChevronUp, Bell, Radio, Check } from 'lucide-react';
import './CandlestickChart.css';

const INTERVALS = ['1m', '5m', '15m', '1h'];

export default function CandlestickChart() {
  const {
    prices,
    ohlcHistory,
    selectedSymbol,
    setSelectedSymbol,
    marketFlowData,
    navigateTo,
    applySignalToTrade,
    feedMode,
    quickAddAlert,
  } = useMarket();

  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const volSeriesRef = useRef(null);
  const [interval, setInterval_] = useState('1m');
  const [ohlc, setOhlc] = useState(null);
  const [showReasons, setShowReasons] = useState(false);

  // Live Historical Candles state from real public APIs
  const [liveCandles, setLiveCandles] = useState(null);
  const [liveSource, setLiveSource] = useState(null);
  const [alertSetSuccess, setAlertSetSuccess] = useState(false);

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

  // Fetch real historical candles when in Live Mode
  useEffect(() => {
    if (feedMode !== 'live') {
      setLiveCandles(null);
      setLiveSource(null);
      return;
    }

    let isMounted = true;
    async function loadLiveHistory() {
      try {
        const res = await fetch(`/api/live/history?symbol=${selectedSymbol}&interval=${interval}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.candles) && data.candles.length > 0) {
            setLiveCandles(data.candles);
            setLiveSource(data.source);
          }
        }
      } catch (_e) {
        // Fall back gracefully to simulator history
      }
    }

    loadLiveHistory();
    return () => { isMounted = false; };
  }, [selectedSymbol, interval, feedMode]);

  const lastKeyRef = useRef({ symbol: null, interval: null, feedMode: null });

  // Synchronize candlestick data with selectedSymbol, interval, live history, and ticks
  useEffect(() => {
    if (!seriesRef.current) return;

    const instData = ohlcHistory[selectedSymbol];
    const syntheticHist = instData ? (instData[interval] || instData['1m'] || (Array.isArray(instData) ? instData : [])) : [];
    const hist = (feedMode === 'live' && liveCandles && liveCandles.length > 0) ? liveCandles : syntheticHist;

    if (!hist || hist.length === 0) return;

    const currentKey = `${selectedSymbol}-${interval}-${feedMode}-${liveCandles ? 'live' : 'sim'}`;
    const prevKey    = `${lastKeyRef.current.symbol}-${lastKeyRef.current.interval}-${lastKeyRef.current.feedMode}-${lastKeyRef.current.source}`;

    // If symbol, interval, or source changed: do a full reload with setData and fit content
    if (currentKey !== prevKey) {
      lastKeyRef.current = { symbol: selectedSymbol, interval, feedMode, source: liveCandles ? 'live' : 'sim' };
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
      return;
    }

    // Otherwise, this is a live tick for the CURRENT active symbol & interval: update last bar
    const last = hist[hist.length - 1];
    if (!last) return;

    seriesRef.current.update(last);
    volSeriesRef.current?.update({
      time:  last.time,
      value: last.volume,
      color: last.close >= last.open ? 'rgba(0,255,136,0.25)' : 'rgba(255,71,87,0.25)',
    });

    setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close });
  }, [selectedSymbol, interval, ohlcHistory, prices, feedMode, liveCandles]);

  const p = prices[selectedSymbol];
  const activeBars = (feedMode === 'live' && liveCandles && liveCandles.length > 0)
    ? liveCandles
    : (ohlcHistory[selectedSymbol]?.[interval] || []);

  const directionData = useMemo(() => {
    return calculateMovingDirection(selectedSymbol, p, activeBars);
  }, [selectedSymbol, p, activeBars]);

  const assetFlow = marketFlowData?.assetFlows?.[selectedSymbol];

  const currentSignal = useMemo(() => {
    return calculateTradingSignal(selectedSymbol, p, activeBars, assetFlow);
  }, [selectedSymbol, p, activeBars, assetFlow]);

  function handleIntervalChange(iv) {
    setInterval_(iv);
    lastKeyRef.current = { symbol: null, interval: null, feedMode: null };
  }

  function handleQuickAlert() {
    if (!p) return;
    const target = p.price >= 5 ? parseFloat((p.price * 1.02).toFixed(2)) : parseFloat((p.price * 1.01).toFixed(4));
    quickAddAlert(selectedSymbol, target, 'gte', `Quick alert +2% for ${selectedSymbol}`);
    setAlertSetSuccess(true);
    setTimeout(() => setAlertSetSuccess(false), 2200);
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
              lastKeyRef.current = { symbol: null, interval: null, feedMode: null };
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

          {/* Data Source Indicator */}
          {feedMode === 'live' ? (
            <span className="chart-source-badge source-live" title="Streaming real-time historical candlesticks">
              <Radio size={10} className="dot-pulse" />
              <span>{liveSource ? liveSource.replace('(Real-Time)', '').trim() : 'Live Feeds'}</span>
            </span>
          ) : (
            <span className="chart-source-badge source-sim" title="Simulated price action sandbox">
              <Zap size={10} />
              <span>Simulated</span>
            </span>
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
          {/* Quick Alert Button */}
          <button
            type="button"
            className={`btn-chart-quick-alert ${alertSetSuccess ? 'success' : ''}`}
            onClick={handleQuickAlert}
            title={`Set instant +2% breakout alert at $${p ? (p.price * 1.02).toFixed(2) : ''}`}
          >
            {alertSetSuccess ? <Check size={12} /> : <Bell size={12} />}
            <span>{alertSetSuccess ? 'Alert Armed!' : '+ Set Alert'}</span>
          </button>

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

      {/* Trading Signal Ribbon */}
      {currentSignal && (
        <div className={`chart-signal-banner signal-${currentSignal.signal.toLowerCase()}`}>
          <div className="signal-banner-left">
            <span className={`signal-badge badge-${currentSignal.signal.toLowerCase()}`}>
              <Zap size={13} />
              {currentSignal.strength}
            </span>
            <span className="signal-confidence" title="Algorithmic confluence confidence score">
              <ShieldCheck size={13} />
              {currentSignal.confidence}% Conf.
            </span>
            <div className="signal-metric-group">
              <span className="metric-label">Entry:</span>
              <span className="metric-val text-mono">
                ${formatPrice(currentSignal.entryPrice, selectedSymbol)}
              </span>
            </div>
            <div className="signal-metric-group">
              <span className="metric-label">TP:</span>
              <span className="metric-val text-mono text-green">
                ${formatPrice(currentSignal.tp1, selectedSymbol)}
                <span className="metric-sub"> (+{currentSignal.tp1Pct}%)</span>
              </span>
            </div>
            <div className="signal-metric-group">
              <span className="metric-label">SL:</span>
              <span className="metric-val text-mono text-red">
                ${formatPrice(currentSignal.stopLoss, selectedSymbol)}
                <span className="metric-sub"> ({currentSignal.slPct}%)</span>
              </span>
            </div>
            <div className="signal-metric-group r-r-group">
              <span className="metric-label">R:R:</span>
              <span className="metric-val text-mono text-cyan">
                1:{currentSignal.riskReward}
              </span>
            </div>
          </div>

          <div className="signal-banner-right">
            <button
              type="button"
              className="btn-reasons-toggle"
              onClick={() => setShowReasons(prev => !prev)}
              title="View technical rationale & confluence factors"
            >
              <span>Why?</span>
              {showReasons ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              type="button"
              className="btn-apply-signal"
              onClick={() => applySignalToTrade(currentSignal)}
              title="Pre-fill trade order with these entry, TP and SL targets"
            >
              Apply to Order
            </button>
          </div>
        </div>
      )}

      {/* Expanded Signal Confluence Rationale */}
      {currentSignal && showReasons && (
        <div className="signal-reasons-drawer animate-fade-in">
          <div className="reasons-header">
            <span>Algorithmic Confluence Analysis ({selectedSymbol})</span>
            <span className="reasons-timeframe text-muted">{currentSignal.timeframe}</span>
          </div>
          <div className="reasons-grid">
            {currentSignal.reasons?.map((r, i) => (
              <div key={i} className={`reason-card bias-${r.bias}`}>
                <div className="reason-title">{r.title}</div>
                <div className="reason-detail">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
