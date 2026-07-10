import { fetchTickers } from '../data/dse-service.js';

// Color scale: low = deep navy, high = bright teal
function getHeatColor(value) {
  const t = value / 100;
  const r = Math.round(10 + t * 10);
  const g = Math.round(22 + t * 162);
  const b = Math.round(41 + t * 125);
  return `rgb(${r}, ${g}, ${b})`;
}

// Helper to attach select events to stock rows
function attachClickListeners(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.querySelectorAll('[data-symbol]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const symbol = el.dataset.symbol;
      if (window.onTickerSelect) {
        window.onTickerSelect(symbol);
      }
    });
  });
}

// ─── CONFIDENCE HEATMAP TABLE ───────────────────────────────────
export async function initHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  const tickers = await fetchTickers();
  
  // Sort by change percent to find top active stocks
  const sorted = [...tickers].sort((a, b) => {
    const pctA = parseFloat(a.changePct || a.change) || 0;
    const pctB = parseFloat(b.changePct || b.change) || 0;
    return pctB - pctA;
  });

  let heatmapData = [];
  try {
    const res = await fetch('/api/confidence');
    heatmapData = await res.json();
  } catch (err) {
    console.warn('Failed to fetch live confidence heatmap, using client fallback:', err);
    // client fallback based on tickers
    const top5 = sorted.slice(0, 5);
    heatmapData = top5.map(stock => {
      const pct = parseFloat(stock.changePct || stock.change) || 0;
      const base = Math.min(95, Math.max(60, Math.round(78 + pct * 2)));
      return {
        stock: stock.symbol,
        momentum: Math.min(99, Math.round(base + 8)),
        volume: Math.min(99, Math.round(base + (pct > 2 ? 10 : 2))),
        sentiment: Math.min(99, Math.round(base - 5)),
        trend: Math.min(99, Math.round(base + 6)),
        regime: Math.min(99, Math.round(base - 2))
      };
    });
  }

  const columns = ['Momentum', 'Volume', 'Sentiment', 'Trend', 'Regime'];
  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  columns.forEach(col => { html += `<th>${col}</th>`; });
  html += '</tr></thead><tbody>';

  heatmapData.forEach(row => {
    html += `<tr data-symbol="${row.stock}"><td><strong>${row.stock}</strong></td>`;
    ['momentum', 'volume', 'sentiment', 'trend', 'regime'].forEach(key => {
      const val = row[key];
      html += `<td style="background:${getHeatColor(val)};">${val}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  attachClickListeners('#heatmapContainer');
}

// ─── AI TOP PICKS LIST ──────────────────────────────────────────
export async function initTopPicks() {
  const container = document.getElementById('topPicksList');
  if (!container) return;

  const tickers = await fetchTickers();

  // Find top 5 gainers
  const sorted = [...tickers].sort((a, b) => {
    const pctA = parseFloat(a.changePct || a.change) || 0;
    const pctB = parseFloat(b.changePct || b.change) || 0;
    return pctB - pctA;
  });

  const top5 = sorted.slice(0, 5);

  const badgeClassMap = {
    'BULL': 'badge-bull',
    'VOLATILE': 'badge-volatile',
    'STABLE': 'badge-stable',
    'BEAR': 'badge-bear',
  };

  let html = '';
  top5.forEach((pick, index) => {
    const changeVal = parseFloat(pick.changePct || pick.change) || 0;
    const badge = changeVal > 2 ? 'BULL' : (changeVal < 0 ? 'BEAR' : 'STABLE');
    const confidence = Math.min(98, Math.max(55, Math.round(75 + changeVal * 3)));
    
    html += `
      <div class="pick-row" data-symbol="${pick.symbol}" title="Click to analyze ${pick.symbol}">
        <span class="pick-rank">${index + 1}</span>
        <span class="pick-name">${pick.symbol}</span>
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <span class="badge ${badgeClassMap[badge] || 'badge-bull'}">${badge}</span>
          <span class="pick-change ${pick.dir}">${pick.changePct || pick.change}</span>
          <div class="confidence-bar-wrapper" style="flex:1;">
            <div class="confidence-bar-track">
              <div class="confidence-bar-fill" style="width:${confidence}%;"></div>
            </div>
            <span class="confidence-bar-value">${confidence}%</span>
          </div>
        </div>
        <span class="pick-cap">${pick.price} BDT</span>
      </div>
    `;
  });

  container.innerHTML = html;

  attachClickListeners('#topPicksList');
}

// ─── FEATURE IMPORTANCE LIST ────────────────────────────────────
export async function initFeatureImportance(symbol = 'SQURPHARMA') {
  const container = document.getElementById('featureImportanceList');
  if (!container) return;

  let html = '';
  try {
    const res = await fetch(`/api/features?symbol=${symbol}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    data.forEach(item => {
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
  } catch (err) {
    console.error('Failed to fetch dynamic features:', err);
    // Static fallback if API fails
    const fallback = [
      { label: 'Price Momentum (14D)', value: 92, color: 'green' },
      { label: 'Volume Anomaly Score', value: 78, color: 'cyan' },
      { label: 'Regime State Vector', value: 84, color: 'green' },
      { label: 'Drift Coefficient', value: 71, color: 'amber' },
      { label: 'Sector Correlation', value: 65, color: 'cyan' },
      { label: 'Sentiment Index', value: 58, color: 'amber' },
    ];
    fallback.forEach(item => {
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
  }

  container.innerHTML = html;
}
