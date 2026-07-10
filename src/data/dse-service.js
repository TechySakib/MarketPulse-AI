const fallbackTickerData = [
  { symbol: 'SQURPHARMA', price: '222.84', change: '-3.10', changePct: '-1.37%', dir: 'down' },
  { symbol: 'GP', price: '256.70', change: '+2.40', changePct: '+0.94%', dir: 'up' },
  { symbol: 'BRACBANK', price: '62.40', change: '+1.30', changePct: '+2.13%', dir: 'up' }
];

const fallbackStockDetail = {
  price: "222.84",
  daysRange: "221.83 - 226.18",
  weeksRange: "189.40 - 248.30",
  yesterdayClose: "225.94",
  volume: "1.24M",
  marketCap: "24.88",
  sector: "PHARMA",
  pe: "18.4",
  lastUpdate: "2:40 PM"
};

const fallbackCandlestickData = [
  { time: '2025-01-16', open: 218.5, high: 221.3, low: 216.8, close: 220.1, volume: 100000.0 },
  { time: '2025-01-17', open: 220.0, high: 222.0, low: 218.5, close: 219.2, volume: 100000.0 },
  { time: '2025-01-19', open: 219.5, high: 223.8, low: 219.0, close: 223.0, volume: 100000.0 },
  { time: '2025-01-20', open: 223.2, high: 225.5, low: 221.0, close: 222.4, volume: 100000.0 },
  { time: '2025-01-21', open: 222.0, high: 222.8, low: 218.6, close: 219.0, volume: 100000.0 },
  { time: '2025-01-22', open: 219.2, high: 220.5, low: 217.0, close: 217.8, volume: 100000.0 },
  { time: '2025-01-23', open: 218.0, high: 220.2, low: 216.5, close: 219.5, volume: 100000.0 },
  { time: '2025-01-26', open: 219.8, high: 224.0, low: 219.0, close: 223.5, volume: 100000.0 },
  { time: '2025-01-27', open: 223.8, high: 227.0, low: 223.0, close: 226.5, volume: 100000.0 },
  { time: '2025-01-28', open: 226.2, high: 228.0, low: 224.8, close: 225.0, volume: 100000.0 },
  { time: '2025-01-29', open: 225.0, high: 225.5, low: 220.2, close: 221.0, volume: 100000.0 },
  { time: '2025-01-30', open: 221.5, high: 223.0, low: 219.8, close: 222.8, volume: 100000.0 }
];

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
    return fallbackTickerData;
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
    return fallbackStockDetail;
  }
}

/**
 * Fetches historical OHLC + volume data points for a given symbol
 * @param {string} symbol The stock ticker symbol
 * @returns {Promise<Array>} List of candles: { time, open, high, low, close, volume }
 */
export async function fetchStockHistory(symbol, duration = 3) {
  try {
    const normalizedSymbol = symbol === 'SQPHARMA' ? 'SQURPHARMA' : symbol;
    const res = await fetch(`/api/dse/history?symbol=${encodeURIComponent(normalizedSymbol)}&duration=${duration}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn(`Failed to fetch live history for ${symbol}, using mock fallback:`, err);
    return fallbackCandlestickData;
  }
}
