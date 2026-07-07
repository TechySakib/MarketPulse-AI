/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Main Application Entry Point
   Navigation, view switching, and chart initialization
   ═══════════════════════════════════════════════════════════════ */

import { initTicker } from './components/ticker.js';
import { initHeatmap, initTopPicks, initFeatureImportance } from './components/heatmap.js';
import { initCandlestickChart, updateCandlestickChartData } from './charts/candlestick.js';
import { initScenarioChart, initDriftTimelineChart, initPortfolioChart, updateScenarioChartData } from './charts/line-charts.js';
import { initVolumeChart, initDonutChart, initReturnDistChart, updateVolumeChartData } from './charts/other-charts.js';
import { narratorMessages } from './data/mock-data.js';
import { fetchTickers, fetchStockMetrics, fetchStockHistory } from './data/dse-service.js';

// ─── STATE ──────────────────────────────────────────────────────
let currentView = 'market-intelligence';
const chartInstances = {};
let activeStock = 'SQURPHARMA';

// ─── NAVIGATION ─────────────────────────────────────────────────
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view;
      if (viewId === currentView) return;

      // Update nav active state
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Switch views
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const targetView = document.getElementById(`view-${viewId}`);
      if (targetView) {
        targetView.classList.add('active');
        // Re-trigger animation
        targetView.style.animation = 'none';
        targetView.offsetHeight; // Force reflow
        targetView.style.animation = '';
      }

      // Update narrator
      updateNarrator(viewId);

      // Initialize charts for this view (lazy)
      initViewCharts(viewId);

      currentView = viewId;
    });
  });
}

// ─── NARRATOR ───────────────────────────────────────────────────
function updateNarrator(viewId) {
  const narratorText = document.getElementById('narratorText');
  const narratorTime = document.getElementById('narratorTime');
  
  if (narratorText) {
    if (viewId === 'stock-analysis' || viewId === 'ai-prediction') {
      narratorText.textContent = `${activeStock} live analysis stream — AI confidence verified under volatile regime.`;
    } else if (narratorMessages[viewId]) {
      narratorText.textContent = narratorMessages[viewId];
    }
  }
  
  if (narratorTime) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    narratorTime.textContent = `${h}:${m}:${s} DHK`;
  }
}

// ─── LAZY CHART INITIALIZATION ──────────────────────────────────
function initViewCharts(viewId) {
  switch (viewId) {
    case 'stock-analysis':
      if (!chartInstances.candlestick) {
        chartInstances.candlestick = initCandlestickChart('candlestickChart');
        loadActiveCharts();
      }
      if (!chartInstances.volume) {
        chartInstances.volume = initVolumeChart('volumeChart');
        loadActiveCharts();
      }
      if (!chartInstances.featureImportance) {
        initFeatureImportance();
        chartInstances.featureImportance = true;
      }
      break;

    case 'ai-prediction':
      if (!chartInstances.scenario) {
        chartInstances.scenario = initScenarioChart('scenarioChart');
        loadActiveCharts();
      }
      break;

    case 'drift-monitor':
      if (!chartInstances.driftTimeline) {
        chartInstances.driftTimeline = initDriftTimelineChart('driftTimelineChart');
      }
      if (!chartInstances.returnDist) {
        chartInstances.returnDist = initReturnDistChart('returnDistChart');
      }
      break;

    case 'my-portfolio':
      if (!chartInstances.portfolio) {
        chartInstances.portfolio = initPortfolioChart('portfolioChart');
      }
      if (!chartInstances.donut) {
        chartInstances.donut = initDonutChart('donutChart');
      }
      break;
  }
}

// ─── LOAD & UPDATE DSE ACTIVE STOCK ─────────────────────────────
async function loadActiveCharts() {
  try {
    const history = await fetchStockHistory(activeStock);
    
    // 1. Update lightweight candlestick chart if ready
    if (chartInstances.candlestick && history.length > 0) {
      updateCandlestickChartData(chartInstances.candlestick, history);
      
      // Update OHLC legend values from last point
      const lastPoint = history[history.length - 1];
      document.getElementById('ohlcOpen').textContent = lastPoint.open.toFixed(2);
      document.getElementById('ohlcHigh').textContent = lastPoint.high.toFixed(2);
      document.getElementById('ohlcLow').textContent = lastPoint.low.toFixed(2);
      document.getElementById('ohlcClose').textContent = lastPoint.close.toFixed(2);
    }
    
    // 2. Update stand-alone volume bar chart if ready
    if (chartInstances.volume && history.length > 0) {
      updateVolumeChartData(chartInstances.volume, history);
    }
    
    // 3. Update scenario projection chart if ready
    if (chartInstances.scenario && history.length > 0) {
      const lastPoint = history[history.length - 1];
      updateScenarioChartData(chartInstances.scenario, lastPoint.close);
    }
  } catch (err) {
    console.error('Failed to load active stock charts:', err);
  }
}

async function loadStockData(symbol) {
  activeStock = symbol;
  
  // Set dropdown value if DOM has loaded
  const selector = document.getElementById('stockSelector');
  if (selector) selector.value = symbol;

  try {
    // 1. Fetch live metrics
    const metrics = await fetchStockMetrics(symbol);
    
    // 2. Update stock analysis panel text values
    const nameEl = document.getElementById('detailsStockName');
    if (nameEl) nameEl.textContent = symbol;
    
    const priceEl = document.getElementById('detailsStockPrice');
    if (priceEl) priceEl.textContent = metrics.price;
    
    const subtitleEl = document.getElementById('detailsStockSubtitle');
    if (subtitleEl) {
      const updateStr = metrics.lastUpdate ? ` · Last Update: ${metrics.lastUpdate}` : '';
      subtitleEl.textContent = `${symbol} Ltd · Dhaka Stock Exchange${updateStr}`;
    }

    const sectorBadge = document.getElementById('detailsStockSectorBadge');
    if (sectorBadge) {
      sectorBadge.textContent = metrics.sector.toUpperCase();
      sectorBadge.className = 'badge';
      sectorBadge.style.background = 'var(--accent-core)';
      sectorBadge.style.color = '#ffffff';
    }

    // Dynamic price change calculation
    const priceVal = parseFloat(metrics.price) || 0;
    const yesterdayClose = parseFloat(metrics.yesterdayClose) || priceVal;
    const diff = priceVal - yesterdayClose;
    const pct = yesterdayClose > 0 ? (diff / yesterdayClose) * 100 : 0;
    const sign = diff >= 0 ? '+' : '';
    const dir = diff >= 0 ? 'up' : 'down';
    
    const changeEl = document.getElementById('detailsStockChange');
    if (changeEl) {
      changeEl.className = `stock-change ${dir}`;
      changeEl.textContent = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
    }

    // 3. Update key value metrics table
    const highEl = document.getElementById('metric52WHigh');
    if (highEl) highEl.textContent = metrics.weeksRange.split(' - ')[1] || 'N/A';
    
    const lowEl = document.getElementById('metric52WLow');
    if (lowEl) lowEl.textContent = metrics.weeksRange.split(' - ')[0] || 'N/A';
    
    const volEl = document.getElementById('metricAvgVolume');
    if (volEl) volEl.textContent = metrics.volume;
    
    const capEl = document.getElementById('metricMarketCap');
    if (capEl) capEl.textContent = metrics.marketCap;
    
    const peEl = document.getElementById('metricPeRatio');
    if (peEl) peEl.textContent = metrics.pe;
    
    const sectorEl = document.getElementById('metricSector');
    if (sectorEl) sectorEl.textContent = metrics.sector;

    // 4. Update AI Prediction view text cards
    const predHeader = document.getElementById('predictCardHeaderSymbol');
    if (predHeader) predHeader.innerHTML = `<span class="icon">🟢</span> NEXT-DAY PRICE FORECAST — ${symbol}`;

    const predCurrent = document.getElementById('predictCurrentPrice');
    if (predCurrent) predCurrent.textContent = metrics.price;

    const forecastPrice = priceVal * 1.062; // 6.2% optimistic projection
    const predForecast = document.getElementById('predictForecastPrice');
    if (predForecast) predForecast.textContent = forecastPrice.toFixed(2);

    const predChange = document.getElementById('predictExpectedChange');
    if (predChange) predChange.textContent = `${sign}${pct.toFixed(2)}% EXPECTED`;

    // 5. Fetch and update chart historical vectors
    await loadActiveCharts();
    
    // 6. Update narrator state
    updateNarrator(currentView);
  } catch (err) {
    console.error('Error updating stock data:', err);
  }
}

// ─── STOCK SEARCH DROPDOWN POPULATION ───────────────────────────
async function populateStockSelector() {
  const selector = document.getElementById('stockSelector');
  if (!selector) return;

  try {
    const tickers = await fetchTickers();
    selector.innerHTML = tickers.map(t => 
      `<option value="${t.symbol}">${t.symbol} (${t.price} BDT) - ${t.changePct || t.change}</option>`
    ).join('');
    
    selector.value = activeStock;
    
    // Add change event listener
    selector.addEventListener('change', (e) => {
      loadStockData(e.target.value);
    });
  } catch (err) {
    console.error('Failed to populate stock selector:', err);
  }
}

// ─── CLOCK UPDATE ───────────────────────────────────────────────
function startClock() {
  setInterval(() => {
    updateNarrator(currentView);
  }, 1000);
}

// ─── DESKTOP SIDEBAR COLLAPSE TOGGLE ────────────────────────────
function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const appLayout = document.querySelector('.app-layout');

  if (!sidebar || !toggleBtn || !appLayout) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    appLayout.classList.toggle('sidebar-collapsed');
  });
}

// ─── MOBILE SIDEBAR TOGGLE ──────────────────────────────────────
function setupMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('mobileToggle');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (!sidebar || !toggle || !backdrop) return;

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('active');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  backdrop.addEventListener('click', closeSidebar);

  // Close sidebar when a nav item is clicked (mobile UX)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
}

// ─── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Bind global select callback (used by ticker, heatmap, top picks)
  window.onTickerSelect = (symbol) => {
    const tab = document.querySelector('[data-view="stock-analysis"]');
    if (tab) tab.click();
    loadStockData(symbol);
  };

  // Initialize ticker
  initTicker();

  // Initialize navigation
  setupNavigation();

  // Initialize desktop sidebar collapse toggle
  setupSidebarToggle();

  // Initialize mobile sidebar toggle
  setupMobileSidebar();

  // Populate stock selector dropdown
  populateStockSelector();

  // Initialize Market Intelligence components (default view)
  initTopPicks();
  initHeatmap();

  // Load the initial stock data
  loadStockData(activeStock);

  // Start clock
  startClock();

  // Set initial narrator time
  updateNarrator(currentView);
});
