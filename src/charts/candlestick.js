/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Candlestick Chart (TradingView Lightweight Charts v5)
   ═══════════════════════════════════════════════════════════════ */

import { createChart, ColorType, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { candlestickData, aiForecastLine, volumeData } from '../data/mock-data.js';

export function initCandlestickChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const chart = createChart(container, {
    width: container.clientWidth,
    height: 300,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: '#7A8599',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
    },
    grid: {
      vertLines: { color: 'rgba(26, 35, 64, 0.5)' },
      horzLines: { color: 'rgba(26, 35, 64, 0.5)' },
    },
    crosshair: {
      mode: 0,
      vertLine: { color: 'rgba(0, 212, 255, 0.3)', width: 1, style: LineStyle.Dashed },
      horzLine: { color: 'rgba(0, 212, 255, 0.3)', width: 1, style: LineStyle.Dashed },
    },
    rightPriceScale: {
      borderColor: '#1A2340',
    },
    timeScale: {
      borderColor: '#1A2340',
      timeVisible: false,
    },
  });

  // Candlestick series (v5 unified API)
  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#10B981',
    downColor: '#EF4444',
    borderUpColor: '#10B981',
    borderDownColor: '#EF4444',
    wickUpColor: '#10B981',
    wickDownColor: '#EF4444',
  });
  candleSeries.setData(candlestickData);

  // AI Forecast line overlay (v5 unified API)
  const forecastSeries = chart.addSeries(LineSeries, {
    color: '#00D4FF',
    lineWidth: 1.5,
    lineStyle: LineStyle.Dashed,
    crosshairMarkerVisible: false,
  });
  forecastSeries.setData(aiForecastLine);

  // Volume histogram (v5 unified API)
  const volSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  });

  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.85, bottom: 0 },
  });

  volSeries.setData(volumeData);

  // Fit content
  chart.timeScale().fitContent();

  // Resize observer
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth });
  });
  ro.observe(container);

  return chart;
}
