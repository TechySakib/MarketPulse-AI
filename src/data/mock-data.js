/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Mock Market Data
   All values match the uploaded screenshots exactly.
   ═══════════════════════════════════════════════════════════════ */

// ─── TICKER DATA ────────────────────────────────────────────────
export const tickerData = [
  { symbol: 'SQPHARMA', price: '230.80', change: '+5.67%', dir: 'up' },
  { symbol: 'BRACBANK', price: '62.40', change: '+1.30%', dir: 'up' },
  { symbol: 'DBBL', price: '92.10', change: '-3.25%', dir: 'down' },
  { symbol: 'RENATA', price: '1,245.00', change: '+2.68%', dir: 'up' },
  { symbol: 'OLYMPICIND', price: '185.30', change: '-1.49%', dir: 'down' },
  { symbol: 'BSRMSTEEL', price: '78.20', change: '+5.53%', dir: 'up' },
  { symbol: 'AFTAB AUTO', price: '15.80', change: '+3.95%', dir: 'up' },
  { symbol: 'DSE-30 IDX', price: '5,842.30', change: '+0.59%', dir: 'up' },
  { symbol: 'BEXIMCO', price: '45.20', change: '+1.80%', dir: 'up' },
];

// ─── AI NARRATOR MESSAGES ───────────────────────────────────────
export const narratorMessages = {
  'market-intelligence': 'SQPHARMA showing institutional accumulation — AI confidence: 87% for next-day upside',
  'stock-analysis': 'Correlation breakdown between pharma and industrials flagged in last 48h window',
  'ai-prediction': 'Correlation breakdown between pharma and industrials flagged in last 48h window',
  'drift-monitor': 'Pre-trend buildup in steel manufacturing stocks — monitor volume surge closely',
  'my-portfolio': 'Market transitioning into uncertainty phase — volatility index elevated 34% above baseline',
};

// ─── MARKET REGIME ──────────────────────────────────────────────
export const marketRegime = {
  status: 'VOLATILE',
  label: 'Stormy Market',
  description: 'High turbulence — elevated systemic risk',
  driftScore: 64.2,
  driftLevel: 'HIGH ALERT',
  stabilityIdx: 38,
  activeSegment: 'VOLATILE',
};

// ─── AI TOP PICKS ───────────────────────────────────────────────
export const aiTopPicks = [
  { rank: 1, name: 'SQPHARMA', badge: 'BULL', change: '+6.2%', dir: 'up', cap: '1.56M', confidence: 87 },
  { rank: 2, name: 'BEXIMCO', badge: 'VOLATILE', change: '+4.8%', dir: 'up', cap: '2.34M', confidence: 74 },
  { rank: 3, name: 'BSRMSTEEL', badge: 'VOLATILE', change: '+3.9%', dir: 'up', cap: '2.10M', confidence: 71 },
  { rank: 4, name: 'RENATA', badge: 'BULL', change: '+3.1%', dir: 'up', cap: '45K', confidence: 68 },
  { rank: 5, name: 'BRACBANK', badge: 'STABLE', change: '+1.9%', dir: 'up', cap: '3.20M', confidence: 62 },
];

// ─── CONFIDENCE HEATMAP ─────────────────────────────────────────
export const heatmapData = [
  { stock: 'SQPHARMA', momentum: 92, volume: 78, sentiment: 85, trend: 91, regime: 74 },
  { stock: 'BEXIMCO', momentum: 68, volume: 82, sentiment: 55, trend: 72, regime: 80 },
  { stock: 'BSRMSTEEL', momentum: 74, volume: 91, sentiment: 62, trend: 68, regime: 77 },
  { stock: 'RENATA', momentum: 85, volume: 65, sentiment: 78, trend: 88, regime: 69 },
  { stock: 'BRACBANK', momentum: 58, volume: 72, sentiment: 70, trend: 64, regime: 82 },
];

// ─── DRIFT ALERT ────────────────────────────────────────────────
export const driftAlert = {
  title: 'Market behavior shift detected in last 24h.',
  description: 'Drift score crossed critical threshold. Regime transition probability elevated.',
  driftScore: { value: 64.2, level: 'HIGH' },
  regimeConfidence: '71%',
  lastShift: { label: 'VOLATILE', time: '2h 14m ago' },
  affectedStocks: { pct: '46.7%', count: '14 / 30' },
};

// ─── MARKET WEATHER ─────────────────────────────────────────────
export const marketWeather = {
  icon: '⛈',
  label: 'Stormy Market',
  description: 'High turbulence — elevated systemic risk',
  pressure: '1028 hPa',
  windSpeed: '34 knots',
  visibility: 'Poor',
  humidity: 'High',
};

// ─── REGIME EVENTS ──────────────────────────────────────────────
export const regimeEvents = [
  { date: 'Jan 08', text: 'Structural break in financial sector', color: 'red' },
  { date: 'Jan 15', text: 'Volatility regime transition detected', color: 'amber' },
];

// ─── STOCK ANALYSIS DATA ────────────────────────────────────────
export const stockDetail = {
  name: 'SQPHARMA',
  fullName: 'Square Pharmaceuticals Ltd · Dhaka Stock Exchange',
  sector: 'PHARMA',
  exchange: 'DSE',
  price: 222.84,
  change: -3.10,
  changePct: -1.37,
  ohlc: { open: 224.97, high: 226.18, low: 221.83, close: 222.84 },
  metrics: {
    '52W High': '248.30',
    '52W Low': '189.40',
    'Avg Volume': '1.24M',
    'Market Cap': 'BDT 24.88',
    'P/E Ratio': '18.4x',
    'Beta': { value: '1.24', level: 'HIGH' },
    'AI Regime': { value: 'BULL', dir: 'up' },
  },
};

export const featureImportance = [
  { label: 'Price Momentum (14D)', value: 92, color: 'green' },
  { label: 'Volume Anomaly Score', value: 78, color: 'cyan' },
  { label: 'Regime State Vector', value: 84, color: 'green' },
  { label: 'Drift Coefficient', value: 71, color: 'amber' },
  { label: 'Sector Correlation', value: 65, color: 'cyan' },
  { label: 'Sentiment Index', value: 58, color: 'amber' },
];

// ─── CANDLESTICK OHLC DATA ──────────────────────────────────────
export const candlestickData = [
  { time: '2025-01-16', open: 218.5, high: 221.3, low: 216.8, close: 220.1 },
  { time: '2025-01-17', open: 220.0, high: 222.0, low: 218.5, close: 219.2 },
  { time: '2025-01-19', open: 219.5, high: 223.8, low: 219.0, close: 223.0 },
  { time: '2025-01-20', open: 223.2, high: 225.5, low: 221.0, close: 222.4 },
  { time: '2025-01-21', open: 222.0, high: 222.8, low: 218.6, close: 219.0 },
  { time: '2025-01-22', open: 219.2, high: 220.5, low: 217.0, close: 217.8 },
  { time: '2025-01-23', open: 218.0, high: 220.2, low: 216.5, close: 219.5 },
  { time: '2025-01-26', open: 219.8, high: 224.0, low: 219.0, close: 223.5 },
  { time: '2025-01-27', open: 223.8, high: 227.0, low: 223.0, close: 226.5 },
  { time: '2025-01-28', open: 226.2, high: 228.0, low: 224.8, close: 225.0 },
  { time: '2025-01-29', open: 225.0, high: 225.5, low: 220.2, close: 221.0 },
  { time: '2025-01-30', open: 221.5, high: 223.0, low: 219.8, close: 222.8 },
  { time: '2025-02-01', open: 222.5, high: 226.8, low: 222.0, close: 226.0 },
  { time: '2025-02-02', open: 226.2, high: 229.5, low: 225.5, close: 228.8 },
  { time: '2025-02-03', open: 228.5, high: 231.0, low: 228.0, close: 230.2 },
  { time: '2025-02-04', open: 230.0, high: 231.2, low: 226.5, close: 227.0 },
  { time: '2025-02-05', open: 227.5, high: 228.8, low: 224.0, close: 224.5 },
  { time: '2025-02-06', open: 224.8, high: 226.0, low: 223.0, close: 225.5 },
  { time: '2025-02-09', open: 225.2, high: 229.0, low: 225.0, close: 228.5 },
  { time: '2025-02-10', open: 228.0, high: 228.5, low: 224.5, close: 225.0 },
  { time: '2025-02-11', open: 225.2, high: 226.5, low: 222.0, close: 222.5 },
  { time: '2025-02-12', open: 222.8, high: 226.2, low: 222.0, close: 225.8 },
  { time: '2025-02-13', open: 225.5, high: 226.18, low: 221.83, close: 222.84 },
];

// AI forecast overlay line
export const aiForecastLine = [
  { time: '2025-01-26', value: 222.0 },
  { time: '2025-01-27', value: 224.5 },
  { time: '2025-01-28', value: 226.0 },
  { time: '2025-01-29', value: 224.0 },
  { time: '2025-01-30', value: 223.5 },
  { time: '2025-02-01', value: 225.0 },
  { time: '2025-02-02', value: 227.5 },
  { time: '2025-02-03', value: 229.0 },
  { time: '2025-02-04', value: 228.0 },
  { time: '2025-02-05', value: 226.0 },
  { time: '2025-02-06', value: 225.5 },
  { time: '2025-02-09', value: 227.0 },
  { time: '2025-02-10', value: 226.5 },
  { time: '2025-02-11', value: 224.0 },
  { time: '2025-02-12', value: 224.5 },
  { time: '2025-02-13', value: 225.0 },
];

// Volume data
export const volumeData = [
  { time: '2025-01-16', value: 850000, color: '#10B981' },
  { time: '2025-01-17', value: 620000, color: '#EF4444' },
  { time: '2025-01-19', value: 1800000, color: '#10B981' },
  { time: '2025-01-20', value: 950000, color: '#EF4444' },
  { time: '2025-01-21', value: 780000, color: '#EF4444' },
  { time: '2025-01-22', value: 540000, color: '#EF4444' },
  { time: '2025-01-23', value: 680000, color: '#10B981' },
  { time: '2025-01-26', value: 920000, color: '#10B981' },
  { time: '2025-01-27', value: 1100000, color: '#10B981' },
  { time: '2025-01-28', value: 890000, color: '#EF4444' },
  { time: '2025-01-29', value: 760000, color: '#EF4444' },
  { time: '2025-01-30', value: 640000, color: '#10B981' },
  { time: '2025-02-01', value: 820000, color: '#10B981' },
  { time: '2025-02-02', value: 1050000, color: '#10B981' },
  { time: '2025-02-03', value: 980000, color: '#10B981' },
  { time: '2025-02-04', value: 850000, color: '#EF4444' },
  { time: '2025-02-05', value: 720000, color: '#EF4444' },
  { time: '2025-02-06', value: 580000, color: '#10B981' },
  { time: '2025-02-09', value: 910000, color: '#10B981' },
  { time: '2025-02-10', value: 780000, color: '#EF4444' },
  { time: '2025-02-11', value: 650000, color: '#EF4444' },
  { time: '2025-02-12', value: 880000, color: '#10B981' },
  { time: '2025-02-13', value: 1200000, color: '#10B981' },
];

// ─── AI PREDICTION DATA ─────────────────────────────────────────
export const prediction = {
  currentPrice: 222.84,
  forecastPrice: 236.66,
  expectedChange: '+6.2%',
  aiConfidence: 87,
  driftScore: 64,
  modelDesc: 'LSTM ensemble with drift-aware retraining projects upward movement based on momentum divergence, volume accumulation, and sector regime alignment. Model retrained 4h ago.',
};

export const scenarioLabels = ['Feb 1', 'Feb 3', 'Feb 5', 'Feb 7', 'Feb 9', 'Feb 11', 'Feb 13', 'Feb 15'];
export const scenarioOptimistic = [222.84, 226, 232, 240, 248, 255, 262, 270];
export const scenarioNeutral = [222.84, 223, 224, 225, 226, 226.5, 227, 228];
export const scenarioPessimistic = [222.84, 221, 219, 217, 216, 215, 213, 210];

export const modelReasoning = [
  {
    icon: '📈',
    title: 'Trend Analysis',
    color: 'green',
    body: '14-day momentum shows sustained upward pressure. EMA crossover confirmed at BDT 228.40. RSI at 62 — not yet overbought.',
  },
  {
    icon: '◎',
    title: 'Anomaly Detection',
    color: 'amber',
    body: 'Volume spike detected on Jan 19 (+340% above 20-day avg). Unusual call option accumulation noted in derivatives market.',
  },
  {
    icon: '↗',
    title: 'Drift Context',
    color: 'cyan',
    body: 'Market drift elevated but sector model shows pharma decoupling from broader DSE index. Sector alpha positive.',
  },
  {
    icon: '⊘',
    title: 'Risk Factors',
    color: 'red',
    body: 'Approval cycle risk present. Current regulatory pipeline uncertain. Raw material cost dependency on import channels — BDT depreciation adds pressure.',
  },
];

// ─── DRIFT MONITOR DATA ─────────────────────────────────────────
export const driftMetrics = {
  driftScore: { value: '79.3', tag: 'CRITICAL', tagClass: 'critical' },
  stabilityIdx: { value: '40/100', tag: 'LOW', tagClass: 'low' },
  regimeAge: { value: '14 days', tag: 'VOLATILE', tagClass: 'volatile' },
  alertLevel: { value: 'LEVEL 3', tag: 'OF 5', tagClass: 'volatile' },
};

export const driftAlertBanner = {
  title: 'Structural Break Likely',
  body: 'Drift detection model flags high-confidence regime transition. Market instability index at critical level. Drift score 64.2 exceeds alert threshold of 60.0. Exercise caution on new entries.',
};

export const driftTimelineLabels = ['Jan 1', 'Jan 11', 'Jan 21', 'Jan 31', 'Feb 10', 'Feb 20'];
export const driftTimelineValues = [22, 28, 35, 30, 42, 38, 45, 50, 55, 48, 52, 60, 58, 65, 72, 68, 75, 79.3];

export const driftWarnings = [
  { icon: '⚠', text: 'High volatility regime detected' },
  { icon: '⚡', text: 'Structural break likely in 48–72h' },
  { icon: '📉', text: 'Correlation matrix breakdown detected' },
];

// Return distribution data (before/after)
export const returnDistLabels = ['-30%', '-20%', '-10%', '0%', '10%', '20%', '30%'];
export const returnDistBefore = [2, 8, 25, 55, 30, 10, 3];
export const returnDistAfter = [5, 18, 35, 40, 28, 12, 8];

// ─── PORTFOLIO DATA ─────────────────────────────────────────────
export const portfolio = {
  totalValue: '277,909',
  dayPnl: '+৳ 4,280',
  riskScore: '6.4/10',
  sharpe: '1.84',
  returnPct: '+10.24% since inception',
};

export const portfolioChartLabels = ['Jan 1', 'Jan 5', 'Jan 9', 'Jan 13', 'Jan 17', 'Jan 19', 'Jan 21', 'Jan 25'];
export const portfolioChartValues = [252000, 258000, 260000, 262000, 265000, 268000, 272000, 277909];
export const benchmarkValues = [250000, 253000, 254000, 256000, 258000, 259000, 261000, 264000];

export const assetAllocation = [
  { name: 'Pharma', pct: 35, color: '#14B8A6' },
  { name: 'Banking', pct: 25, color: '#A855F7' },
  { name: 'Industry', pct: 20, color: '#F59E0B' },
  { name: 'Telecom', pct: 12, color: '#10B981' },
  { name: 'Others', pct: 8, color: '#6B7280' },
];

export const portfolioRecommendations = [
  { action: 'REDUCE', actionClass: 'badge-reduce', stock: 'BEXIMCO', risk: 'HIGH', riskClass: 'badge-risk-high', desc: 'Elevated drift in volatile regime — reduce exposure by 30%' },
  { action: 'HOLD', actionClass: 'badge-hold', stock: 'SQPHARMA', risk: 'LOW', riskClass: 'badge-risk-low', desc: 'Strong momentum — maintain current position through next cycle' },
  { action: 'WATCH', actionClass: 'badge-watch', stock: 'BRACBANK', risk: 'MED', riskClass: 'badge-risk-med', desc: 'Approaching key resistance at 64.80 — monitor for breakout' },
  { action: 'BUY', actionClass: 'badge-buy', stock: 'BSRMSTEEL', risk: '', riskClass: '', desc: 'Pre-trend buildup detected — consider 5–8% allocation' },
];

export const riskExposure = [
  { label: 'Overall Risk', value: 64, barClass: 'amber', valueClass: 'amber' },
  { label: 'Market Risk', value: 72, barClass: 'red', valueClass: 'red' },
  { label: 'Liquidity', value: 45, barClass: 'green', valueClass: '' },
  { label: 'Sector Concentration', value: 58, barClass: 'amber', valueClass: 'amber' },
];
