import { fetchTickers } from '../data/dse-service.js';

/**
 * Initializes the infinite scrolling ticker bar with live DSE data
 */
export async function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const data = await fetchTickers();

  const buildItems = (items) => items.map(item => {
    const arrow = item.dir === 'up' ? '▲' : (item.dir === 'down' ? '▼' : '■');
    return `
      <span class="ticker-item" data-symbol="${item.symbol}" style="cursor: pointer;" title="Click to analyze ${item.symbol}">
        <span class="symbol">${item.symbol}</span>
        <span class="price">${item.price}</span>
        <span class="change ${item.dir}"><span class="arrow">${arrow}</span>${item.changePct || item.change}</span>
      </span>
    `;
  }).join('');

  track.innerHTML = buildItems(data) + buildItems(data);

  // Add click listeners to items
  track.querySelectorAll('.ticker-item').forEach(el => {
    el.addEventListener('click', () => {
      const symbol = el.dataset.symbol;
      if (window.onTickerSelect) {
        window.onTickerSelect(symbol);
      }
    });
  });
}
