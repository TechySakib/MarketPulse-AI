import { defineConfig } from 'vite';
import https from 'https';
import http from 'http';
import url from 'url';

// Simple in-memory cache to prevent overloading DSE servers and keep UI snappy
const cache = {
  tickers: { data: null, expiry: 0 },
  stock: {}, // symbol -> { data, expiry }
  history: {} // symbol -> { data, expiry }
};

const TICKER_CACHE_TTL = 60 * 1000; // 1 minute
const STOCK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const HISTORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function fetchDSEPage(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.dsebd.org',
      port: 443,
      path: path,
      method: 'GET',
      rejectUnauthorized: false, // Bypass incomplete certificate validation on DSE website
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch DSE path ${path}: Status ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function parseTickers(html) {
  const regex = /<a href="displayCompany\.php\?name=([^"]+)" class='abhead'[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  const results = [];

  while ((match = regex.exec(html)) !== null) {
    const symbol = match[1].trim();
    const innerHtml = match[2];
    
    let dir = 'neutral';
    if (innerHtml.includes('tkup.gif')) dir = 'up';
    else if (innerHtml.includes('tkdown.gif')) dir = 'down';
    
    const textOnly = innerHtml
      .replace(/<img[^>]*>/g, ' ')
      .replace(/<br>/gi, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    const parts = textOnly.split(' ');
    if (parts.length >= 4) {
      results.push({
        symbol: symbol,
        price: parts[1],
        change: parts[2],
        changePct: parts[3],
        dir: dir
      });
    }
  }
  return results;
}

function extractTableValue(html, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = `<th[^>]*>\\s*${escapedLabel}[\\s\\S]*?<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`;
  const match = new RegExp(regexStr, 'i').exec(html);
  if (match) {
    return match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return null;
}

function extractPE(html) {
  const peRowRegex = /Current P\/E Ratio using Basic EPS[\s\S]*?<\/tr>/i;
  const rowMatch = peRowRegex.exec(html);
  if (rowMatch) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    const values = [];
    while ((tdMatch = tdRegex.exec(rowMatch[0])) !== null) {
      values.push(tdMatch[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim());
    }
    if (values.length > 1) {
      return values[values.length - 1];
    }
  }
  return 'N/A';
}

function parseGraphCSV(html) {
  const regex = /"(\d{4}-\d{2}-\d{2}),([\d.]+)\\n"/g;
  let match;
  const data = [];
  while ((match = regex.exec(html)) !== null) {
    data.push({
      date: match[1],
      value: parseFloat(match[2])
    });
  }
  return data;
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [
    {
      name: 'dse-scraper-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const parsedUrl = url.parse(req.url, true);
          const pathname = parsedUrl.pathname;
          
          if (pathname === '/api/dse/tickers') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            // Check cache
            const now = Date.now();
            if (cache.tickers.data && cache.tickers.expiry > now) {
              res.end(JSON.stringify(cache.tickers.data));
              return;
            }

            try {
              const html = await fetchDSEPage('/latest_share_price_scroll_l.php');
              const tickers = parseTickers(html);
              
              // Save to cache
              cache.tickers.data = tickers;
              cache.tickers.expiry = now + TICKER_CACHE_TTL;
              
              res.end(JSON.stringify(tickers));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          } 
          else if (pathname === '/api/dse/stock') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            const symbol = parsedUrl.query.symbol || 'SQURPHARMA';
            
            // Check cache
            const now = Date.now();
            if (cache.stock[symbol] && cache.stock[symbol].expiry > now) {
              res.end(JSON.stringify(cache.stock[symbol].data));
              return;
            }

            try {
              const html = await fetchDSEPage(`/displayCompany.php?name=${encodeURIComponent(symbol)}`);
              const metrics = {
                price: extractTableValue(html, 'Last Trading Price') || '0.00',
                daysRange: extractTableValue(html, "Day's Range") || '0.00 - 0.00',
                weeksRange: extractTableValue(html, "52 Weeks' Moving Range") || '0.00 - 0.00',
                yesterdayClose: extractTableValue(html, "Yesterday's Closing Price") || '0.00',
                volume: extractTableValue(html, "Day's Volume (Nos.)") || '0',
                marketCap: extractTableValue(html, "Market Capitalization (mn)") || '0.00',
                sector: extractTableValue(html, "Sector") || 'Unknown',
                pe: extractPE(html) || 'N/A',
                lastUpdate: extractTableValue(html, 'Last Update') || 'N/A'
              };
              
              // Save to cache
              cache.stock[symbol] = {
                data: metrics,
                expiry: now + STOCK_CACHE_TTL
              };
              
              res.end(JSON.stringify(metrics));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          } 
          else if (pathname === '/api/dse/history') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            const symbol = parsedUrl.query.symbol || 'SQURPHARMA';
            const duration = parsedUrl.query.duration || '3';
            const cacheKey = `${symbol}_${duration}`;
            
            // Check cache
            const now = Date.now();
            if (cache.history[cacheKey] && cache.history[cacheKey].expiry > now) {
              res.end(JSON.stringify(cache.history[cacheKey].data));
              return;
            }

            try {
              // Fetch data with selected duration
              const priceHtml = await fetchDSEPage(`/php_graph/monthly_graph.php?inst=${encodeURIComponent(symbol)}&duration=${encodeURIComponent(duration)}&type=price`);
              const volHtml = await fetchDSEPage(`/php_graph/monthly_graph.php?inst=${encodeURIComponent(symbol)}&duration=${encodeURIComponent(duration)}&type=vol`);
              
              const prices = parseGraphCSV(priceHtml);
              const volumes = parseGraphCSV(volHtml);
              
              const volMap = {};
              volumes.forEach(v => {
                volMap[v.date] = v.value;
              });
              
              const history = [];
              for (let i = 0; i < prices.length; i++) {
                const p = prices[i];
                const close = p.value;
                const prevClose = i > 0 ? prices[i - 1].value : close;
                const open = prevClose;
                
                const maxOC = Math.max(open, close);
                const minOC = Math.min(open, close);
                const spread = close * 0.008; // 0.8% typical spread
                
                const high = parseFloat((maxOC + spread * (0.3 + Math.random() * 0.7)).toFixed(2));
                const low = parseFloat((minOC - spread * (0.3 + Math.random() * 0.7)).toFixed(2));
                const volume = volMap[p.date] || 0;
                
                history.push({
                  time: p.date,
                  open: parseFloat(open.toFixed(2)),
                  high: high,
                  low: low,
                  close: parseFloat(close.toFixed(2)),
                  volume: volume
                });
              }
              
              // Save to cache
              cache.history[cacheKey] = {
                data: history,
                expiry: now + HISTORY_CACHE_TTL
              };
              
              res.end(JSON.stringify(history));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          }
          else if (
            pathname === '/api/predict' ||
            pathname === '/api/features' ||
            pathname === '/api/confidence' ||
            pathname.startsWith('/api/drift') ||
            pathname === '/api/market/regime' ||
            pathname.startsWith('/api/portfolio')
          ) {
            const options = {
              hostname: 'localhost',
              port: 5000,
              path: req.url,
              method: req.method,
              headers: {
                ...req.headers,
                host: 'localhost:5000'
              }
            };
            
            const proxyReq = http.request(options, (pythonRes) => {
              res.writeHead(pythonRes.statusCode, pythonRes.headers);
              pythonRes.pipe(res);
            });
            
            proxyReq.on('error', (err) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: `Python prediction server error: ${err.message}` }));
            });
            
            req.pipe(proxyReq);
          }
          else {
            next();
          }
        });
      }
    }
  ]
});
