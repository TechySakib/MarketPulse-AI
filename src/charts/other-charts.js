/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Other Charts (Chart.js)
   Volume/Volatility, Donut, Return Distribution
   ═══════════════════════════════════════════════════════════════ */

import { Chart } from 'chart.js';

const darkTheme = {
  font: { family: "'JetBrains Mono', monospace", size: 10 },
};

function getScaleDefaults() {
  return {
    grid: { color: 'rgba(26, 35, 64, 0.5)', drawBorder: false },
    ticks: { ...darkTheme.font, color: '#7A8599', padding: 6 },
    border: { color: '#1A2340' },
  };
}

// ─── VOLUME + VOLATILITY OVERLAY ────────────────────────────────
export function initVolumeChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['Jan 16', '', 'Jan 20', '', 'Jan 23', '', 'Jan 27', '', 'Jan 30', '', 'Feb 2', '', 'Feb 5', '', 'Feb 9', '', 'Feb 12', '', 'Feb 13'];

  const volumeValues = [850, 620, 1800, 950, 780, 540, 680, 920, 1100, 890, 760, 640, 820, 1050, 980, 850, 720, 580, 1200];
  const volColors = volumeValues.map((v, i) => {
    const colors = ['#10B981', '#EF4444', '#10B981', '#EF4444', '#EF4444', '#EF4444', '#10B981', '#10B981', '#10B981', '#EF4444', '#EF4444', '#10B981', '#10B981', '#10B981', '#10B981', '#EF4444', '#EF4444', '#10B981', '#10B981'];
    return colors[i] || '#10B981';
  });

  const volatilityData = [0.5, 0.6, 1.2, 0.9, 0.8, 0.6, 0.5, 0.7, 0.8, 0.7, 0.6, 0.5, 0.6, 0.7, 0.8, 0.7, 0.5, 0.4, 1.1];

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Volume',
          data: volumeValues,
          backgroundColor: volColors.map(c => c + '99'),
          borderColor: volColors,
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: 'Volatility',
          data: volatilityData,
          type: 'line',
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          yAxisID: 'y1',
          order: 1,
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
        y: {
          ...getScaleDefaults(),
          position: 'left',
          ticks: {
            ...darkTheme.font,
            color: '#7A8599',
            padding: 6,
            callback: (v) => v + 'K',
          },
        },
        y1: {
          ...getScaleDefaults(),
          position: 'right',
          grid: { drawOnChartArea: false, color: 'rgba(26, 35, 64, 0.5)' },
          ticks: {
            ...darkTheme.font,
            color: '#7A8599',
            padding: 6,
            callback: (v) => v.toFixed(1) + '%',
          },
        },
      },
    },
  });
}

// ─── DONUT CHART (Asset Allocation) ─────────────────────────────
export function initDonutChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pharma', 'Banking', 'Industry', 'Telecom', 'Others'],
      datasets: [{
        data: [35, 25, 20, 12, 8],
        backgroundColor: ['#14B8A6', '#A855F7', '#F59E0B', '#10B981', '#6B7280'],
        borderColor: '#0F1629',
        borderWidth: 3,
        hoverBorderColor: '#1E2A45',
        spacing: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: darkTheme.font,
          bodyFont: darkTheme.font,
          backgroundColor: '#0F1629',
          borderColor: '#1E2A45',
          borderWidth: 1,
          callbacks: {
            label: (c) => `${c.label}: ${c.raw}%`,
          },
        },
      },
    },
  });
}

// ─── RETURN DISTRIBUTION (Dual histogram) ───────────────────────
export function initReturnDistChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['-30%', '-20%', '-10%', '0%', '10%', '20%', '30%'];
  const before = [2, 8, 25, 55, 30, 10, 3];
  const after = [5, 18, 35, 40, 28, 12, 8];

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Before Shift',
          data: before,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          fill: true,
          borderWidth: 2,
          tension: 0.45,
          pointRadius: 0,
        },
        {
          label: 'After Shift',
          data: after,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          fill: true,
          borderWidth: 2,
          tension: 0.45,
          pointRadius: 0,
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
        y: { ...getScaleDefaults(), display: false },
      },
    },
  });
}

export function updateVolumeChartData(chartInstance, historyData) {
  if (!chartInstance || !historyData || historyData.length === 0) return;

  const labels = historyData.map(d => {
    const date = new Date(d.time);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  });

  const volumeValues = historyData.map(d => Math.round(d.volume / 1000));
  const volColors = historyData.map(d => d.close >= d.open ? '#059669' : '#DC2626');
  
  const volatilityData = historyData.map(d => {
    const range = d.high - d.low;
    const pct = d.close > 0 ? (range / d.close) * 100 : 0.5;
    return parseFloat(pct.toFixed(2));
  });

  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = volumeValues;
  chartInstance.data.datasets[0].backgroundColor = volColors.map(c => c + '99');
  chartInstance.data.datasets[0].borderColor = volColors;
  chartInstance.data.datasets[1].data = volatilityData;

  chartInstance.update();
}
