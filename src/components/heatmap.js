/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Heatmap & Feature Importance Components
   ═══════════════════════════════════════════════════════════════ */

import { heatmapData, aiTopPicks, featureImportance } from '../data/mock-data.js';

// ─── CONFIDENCE HEATMAP TABLE ───────────────────────────────────
export function initHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  const columns = ['Momentum', 'Volume', 'Sentiment', 'Trend', 'Regime'];

  // Color scale: low = deep navy, high = bright teal
  function getHeatColor(value) {
    const t = value / 100;
    const r = Math.round(10 + t * 10);
    const g = Math.round(22 + t * 162);
    const b = Math.round(41 + t * 125);
    return `rgb(${r}, ${g}, ${b})`;
  }

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  columns.forEach(col => { html += `<th>${col}</th>`; });
  html += '</tr></thead><tbody>';

  heatmapData.forEach(row => {
    html += `<tr><td>${row.stock}</td>`;
    ['momentum', 'volume', 'sentiment', 'trend', 'regime'].forEach(key => {
      const val = row[key];
      html += `<td style="background:${getHeatColor(val)};">${val}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ─── AI TOP PICKS LIST ──────────────────────────────────────────
export function initTopPicks() {
  const container = document.getElementById('topPicksList');
  if (!container) return;

  const badgeClassMap = {
    'BULL': 'badge-bull',
    'VOLATILE': 'badge-volatile',
    'STABLE': 'badge-stable',
    'BEAR': 'badge-bear',
  };

  let html = '';
  aiTopPicks.forEach(pick => {
    html += `
      <div class="pick-row">
        <span class="pick-rank">${pick.rank}</span>
        <span class="pick-name">${pick.name}</span>
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <span class="badge ${badgeClassMap[pick.badge] || 'badge-bull'}">${pick.badge}</span>
          <span class="pick-change ${pick.dir}">${pick.change}</span>
          <div class="confidence-bar-wrapper" style="flex:1;">
            <div class="confidence-bar-track">
              <div class="confidence-bar-fill" style="width:${pick.confidence}%;"></div>
            </div>
            <span class="confidence-bar-value">${pick.confidence}%</span>
          </div>
        </div>
        <span class="pick-cap">${pick.cap}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ─── FEATURE IMPORTANCE LIST ────────────────────────────────────
export function initFeatureImportance() {
  const container = document.getElementById('featureImportanceList');
  if (!container) return;

  let html = '';
  featureImportance.forEach(item => {
    html += `
      <div class="progress-row">
        <span class="progress-label">${item.label}</span>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${item.color}" style="width:${item.value}%;"></div>
        </div>
        <span class="progress-value ${item.color}">${item.value}%</span>
      </div>
    `;
  });

  container.innerHTML = html;
}
