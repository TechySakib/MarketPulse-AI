import { tickerData, stockDetail, candlestickData } from './mock-data.js';

/**
 * Fetches all live ticker prices from DSE scroll page
 * @returns {Promise<Array>} List of ticker objects { symbol, price, change, changePct, dir }
 */
export async function fetchTickers() {
  try {
    const res = await fetch('/api/dse/tickers');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn('Failed to fetch live DSE tickers, using mock fallback:', err);
    return tickerData;
  }
}

/**
 * Fetches live company detail metrics for a given symbol
 * @param {string} symbol The stock ticker symbol (e.g. 'SQURPHARMA')
 * @returns {Promise<Object>} Object containing keys: price, daysRange, weeksRange, yesterdayClose, volume, marketCap, sector, pe
 */
export async function fetchStockMetrics(symbol) {
  try {
    // Normalise the symbol if the front-end requests SQPHARMA
    const normalizedSymbol = symbol === 'SQPHARMA' ? 'SQURPHARMA' : symbol;
    const res = await fetch(`/api/dse/stock?symbol=${encodeURIComponent(normalizedSymbol)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn(`Failed to fetch live metrics for ${symbol}, using mock fallback:`, err);
    
    // Create clean fallback based on mock-data variables
    return {
      price: stockDetail.price.toString(),
      daysRange: `${stockDetail.ohlc.low} - ${stockDetail.ohlc.high}`,
      weeksRange: `${stockDetail.metrics['52W Low']} - ${stockDetail.metrics['52W High']}`,
      yesterdayClose: stockDetail.ohlc.close.toString(),
      volume: stockDetail.metrics['Avg Volume'],
      marketCap: stockDetail.metrics['Market Cap'].replace('BDT ', ''),
      sector: stockDetail.sector,
      pe: stockDetail.metrics['P/E Ratio'].replace('x', '')
    };
  }
}

/**
 * Fetches historical OHLC + volume data points for a given symbol
 * @param {string} symbol The stock ticker symbol
 * @returns {Promise<Array>} List of candles: { time, open, high, low, close, volume }
 */
export async function fetchStockHistory(symbol) {
  try {
    const normalizedSymbol = symbol === 'SQPHARMA' ? 'SQURPHARMA' : symbol;
    const res = await fetch(`/api/dse/history?symbol=${encodeURIComponent(normalizedSymbol)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn(`Failed to fetch live history for ${symbol}, using mock fallback:`, err);
    return candlestickData;
  }
}
