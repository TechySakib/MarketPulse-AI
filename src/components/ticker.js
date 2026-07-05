/* ═══════════════════════════════════════════════════════════════
   QUANTEDGE — Stock Ticker Component
   Infinite horizontal scrolling ticker bar
   ═══════════════════════════════════════════════════════════════ */

import { tickerData } from '../data/mock-data.js';

export function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  // Build ticker items HTML
  const buildItems = () => tickerData.map(item => {
    const arrow = item.dir === 'up' ? '▲' : '▼';
    return `
      <span class="ticker-item">
        <span class="symbol">${item.symbol}</span>
        <span class="price">${item.price}</span>
        <span class="change ${item.dir}"><span class="arrow">${arrow}</span>${item.change}</span>
      </span>
    `;
  }).join('');

  // Duplicate items for seamless infinite scroll
  track.innerHTML = buildItems() + buildItems();
}
