/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Line Charts (Chart.js)
   Scenario Simulation, Drift Timeline, Portfolio Performance
   ═══════════════════════════════════════════════════════════════ */

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Shared dark theme defaults
const darkTheme = {
  color: '#7A8599',
  borderColor: '#1A2340',
  font: { family: "'JetBrains Mono', monospace", size: 10 },
};

function getScaleDefaults() {
  return {
    grid: { color: 'rgba(26, 35, 64, 0.5)', drawBorder: false },
    ticks: { ...darkTheme.font, color: '#7A8599', padding: 6 },
    border: { color: '#1A2340' },
  };
}

// ─── SCENARIO SIMULATION CHART ──────────────────────────────────
export function initScenarioChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['Feb 1', 'Feb 3', 'Feb 5', 'Feb 7', 'Feb 9', 'Feb 11', 'Feb 13', 'Feb 15'];

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Optimistic',
          data: [222.84, 226, 232, 240, 248, 255, 262, 270],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          fill: true,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Neutral',
          data: [222.84, 223, 224, 225, 226, 226.5, 227, 228],
          borderColor: '#00D4FF',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
        {
          label: 'Pessimistic',
          data: [222.84, 221, 219, 217, 216, 215, 213, 210],
          borderColor: '#EF4444',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { titleFont: darkTheme.font, bodyFont: darkTheme.font, backgroundColor: '#0F1629', borderColor: '#1E2A45', borderWidth: 1 } },
      scales: {
        x: { ...getScaleDefaults() },
        y: { ...getScaleDefaults(), min: 205, max: 275 },
      },
    },
  });
}

// ─── DRIFT SCORE TIMELINE ───────────────────────────────────────
export function initDriftTimelineChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['Jan 1', '', 'Jan 11', '', 'Jan 21', '', 'Jan 31', '', 'Feb 10', '', 'Feb 20', '', '', '', '', '', '', ''];
  const data = [22, 28, 35, 30, 42, 38, 45, 50, 55, 48, 52, 60, 58, 65, 72, 68, 75, 79.3];

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Drift Score',
          data,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          fill: false,
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { titleFont: darkTheme.font, bodyFont: darkTheme.font, backgroundColor: '#0F1629', borderColor: '#1E2A45', borderWidth: 1 },
        annotation: undefined,
      },
      scales: {
        x: { ...getScaleDefaults() },
        y: {
          ...getScaleDefaults(),
          min: 0,
          max: 90,
        },
      },
    },
    plugins: [{
      id: 'thresholdLine',
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const ctx = chart.ctx;
        const y = yScale.getPixelForValue(60);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#7A8599';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, y);
        ctx.lineTo(chart.chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      },
    }],
  });
}

// ─── PORTFOLIO PERFORMANCE CHART ────────────────────────────────
export function initPortfolioChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['Jan 1', 'Jan 5', 'Jan 9', 'Jan 13', 'Jan 17', 'Jan 19', 'Jan 21', 'Jan 25'];
  const portfolioData = [252000, 258000, 260000, 262000, 265000, 268000, 272000, 277909];
  const benchmarkData = [250000, 253000, 254000, 256000, 258000, 259000, 261000, 264000];

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Portfolio',
          data: portfolioData,
          borderColor: '#14B8A6',
          backgroundColor: 'rgba(20, 184, 166, 0.08)',
          fill: true,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'DSE-30 Benchmark',
          data: benchmarkData,
          borderColor: '#4A5568',
          borderDash: [5, 3],
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { titleFont: darkTheme.font, bodyFont: darkTheme.font, backgroundColor: '#0F1629', borderColor: '#1E2A45', borderWidth: 1, callbacks: { label: (c) => `${c.dataset.label}: ৳${c.parsed.y.toLocaleString()}` } } },
      scales: {
        x: { ...getScaleDefaults() },
        y: {
          ...getScaleDefaults(),
          ticks: {
            ...darkTheme.font,
            color: '#7A8599',
            padding: 6,
            callback: (v) => (v / 1000) + 'K',
          },
        },
      },
    },
  });
}

export function updateScenarioChartData(chartInstance, currentPrice) {
  if (!chartInstance || isNaN(currentPrice)) return;

  const p = currentPrice;
  chartInstance.data.datasets[0].data = [p, p * 1.01, p * 1.03, p * 1.05, p * 1.08, p * 1.11, p * 1.14, p * 1.17];
  chartInstance.data.datasets[1].data = [p, p * 1.002, p * 1.005, p * 1.008, p * 1.01, p * 1.012, p * 1.015, p * 1.018];
  chartInstance.data.datasets[2].data = [p, p * 0.99, p * 0.98, p * 0.97, p * 0.96, p * 0.95, p * 0.94, p * 0.93];

  chartInstance.options.scales.y.min = Math.floor(p * 0.9);
  chartInstance.options.scales.y.max = Math.ceil(p * 1.25);

  chartInstance.update();
}
