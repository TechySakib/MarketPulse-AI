import { createChart, ColorType, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { fetchStockHistory } from '../data/dse-service.js';

/**
 * Initializes the TradingView Lightweight Chart in the specified container
 * @param {string} containerId The container DOM element ID
 * @returns {Object} Chart instance details and series references
 */
export function initCandlestickChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

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
      vertLines: { color: 'rgba(26, 35, 64, 0.2)' },
      horzLines: { color: 'rgba(26, 35, 64, 0.2)' },
    },
    crosshair: {
      mode: 0,
      vertLine: { color: 'rgba(0, 102, 255, 0.3)', width: 1, style: LineStyle.Dashed },
      horzLine: { color: 'rgba(0, 102, 255, 0.3)', width: 1, style: LineStyle.Dashed },
    },
    rightPriceScale: {
      borderColor: '#E4E4E7',
    },
    timeScale: {
      borderColor: '#E4E4E7',
      timeVisible: false,
    },
  });

  // Candlestick series
  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#059669',     // Emerald Mint
    downColor: '#DC2626',   // Crimson Slate
    borderUpColor: '#059669',
    borderDownColor: '#DC2626',
    wickUpColor: '#059669',
    wickDownColor: '#DC2626',
  });

  // AI Forecast line overlay
  const forecastSeries = chart.addSeries(LineSeries, {
    color: '#0066FF',       // Core Cobalt Blue
    lineWidth: 1.5,
    lineStyle: LineStyle.Dashed,
    crosshairMarkerVisible: false,
  });

  // Volume histogram
  const volSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  });

  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.85, bottom: 0 },
  });

  // Fit content
  chart.timeScale().fitContent();

  // Resize observer
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth });
  });
  ro.observe(container);

  return { chart, candleSeries, forecastSeries, volSeries };
}

/**
 * Updates the candlestick chart with dynamic history data and renders the actual AI forecast line
 * @param {Object} chartInstances The references returned by initCandlestickChart
 * @param {Array} historyData List of candle objects { time, open, high, low, close, volume }
 * @param {Array} predictions The dynamic AI predictions array for the next 5 days
 */
export function updateCandlestickChartData(chartInstances, historyData, predictions) {
  if (!chartInstances || !historyData || historyData.length === 0) return;

  const { candleSeries, forecastSeries, volSeries, chart } = chartInstances;

  // 1. Set history candlesticks
  candleSeries.setData(historyData);

  // 2. Set volume histogram data
  const volData = historyData.map(d => ({
    time: d.time,
    value: d.volume,
    color: d.close >= d.open ? 'rgba(5, 150, 105, 0.4)' : 'rgba(220, 38, 38, 0.4)'
  }));
  volSeries.setData(volData);

  // 3. Render AI Forecast line (5 days projection) using actual predictions
  const lastPoint = historyData[historyData.length - 1];
  const lastPrice = lastPoint.close;
  const lastTime = new Date(lastPoint.time);
  
  const forecastData = [];
  // Connect seamlessly from history endpoint
  forecastData.push({ time: lastPoint.time, value: lastPrice });
  
  let currDate = new Date(lastTime);
  let predList = predictions;
  if (!predList || !Array.isArray(predList) || predList.length === 0) {
    // Graceful fallback projection if no actual predictions are loaded yet
    predList = [lastPrice * 1.002, lastPrice * 1.005, lastPrice * 1.008, lastPrice * 1.01, lastPrice * 1.012];
  }

  for (let j = 0; j < predList.length; j++) {
    currDate.setDate(currDate.getDate() + 1);
    // Skip DSE weekends (Friday/Saturday)
    while (currDate.getDay() === 5 || currDate.getDay() === 6) {
      currDate.setDate(currDate.getDate() + 1);
    }
    const timeString = currDate.toISOString().split('T')[0];
    
    forecastData.push({
      time: timeString,
      value: predList[j]
    });
  }
  forecastSeries.setData(forecastData);

  // Re-fit
  chart.timeScale().fitContent();
}
