/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Main Application Entry Point
   Navigation, view switching, and chart initialization
   ═══════════════════════════════════════════════════════════════ */

import { initTicker } from './components/ticker.js';
import { initHeatmap, initTopPicks, initFeatureImportance } from './components/heatmap.js';
import { initCandlestickChart } from './charts/candlestick.js';
import { initScenarioChart, initDriftTimelineChart, initPortfolioChart } from './charts/line-charts.js';
import { initVolumeChart, initDonutChart, initReturnDistChart } from './charts/other-charts.js';
import { narratorMessages } from './data/mock-data.js';

// ─── STATE ──────────────────────────────────────────────────────
let currentView = 'market-intelligence';
const chartInstances = {};

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
  if (narratorText && narratorMessages[viewId]) {
    narratorText.textContent = narratorMessages[viewId];
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
      }
      if (!chartInstances.volume) {
        chartInstances.volume = initVolumeChart('volumeChart');
      }
      if (!chartInstances.featureImportance) {
        initFeatureImportance();
        chartInstances.featureImportance = true;
      }
      break;

    case 'ai-prediction':
      if (!chartInstances.scenario) {
        chartInstances.scenario = initScenarioChart('scenarioChart');
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

// ─── CLOCK UPDATE ───────────────────────────────────────────────
function startClock() {
  setInterval(() => {
    updateNarrator(currentView);
  }, 1000);
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
  // Initialize ticker
  initTicker();

  // Initialize navigation
  setupNavigation();

  // Initialize mobile sidebar toggle
  setupMobileSidebar();

  // Initialize Market Intelligence components (default view)
  initTopPicks();
  initHeatmap();

  // Start clock
  startClock();

  // Set initial narrator time
  updateNarrator(currentView);
});
