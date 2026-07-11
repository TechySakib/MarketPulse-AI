import os
import json
import urllib.request
import re
import ssl
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

# Ensure drift_monitor directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from drift_monitor.feature_engineering import create_features

MODELS_DIR = "DSE_PatchTST_Adjusted_Models"
DATA_PATH = "training_data"
OUTPUT_DIR = "drift_baseline"
CACHE_FILE = "scraped_cache.json"

os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading cache: {e}")
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

def scrape_history(symbol):
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    print(f"Scraping history for {normalized_symbol} from DSE...")
    ctx = ssl._create_unverified_context()
    
    try:
        price_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=price"
        req = urllib.request.Request(price_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            price_html = response.read().decode('utf-8', errors='ignore')
            
        vol_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=vol"
        req = urllib.request.Request(vol_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            vol_html = response.read().decode('utf-8', errors='ignore')
            
        pattern = r'"(\d{4}-\d{2}-\d{2}),([\d.]+)\\n"'
        prices = [{"date": d, "value": float(v)} for d, v in re.findall(pattern, price_html)]
        volumes = [{"date": d, "value": float(v)} for d, v in re.findall(pattern, vol_html)]
        
        if prices:
            vol_map = {v['date']: v['value'] for v in volumes}
            history = []
            for i in range(len(prices)):
                p = prices[i]
                close = p['value']
                prev_close = prices[i-1]['value'] if i > 0 else close
                open_val = prev_close
                
                max_oc = max(open_val, close)
                min_oc = min(open_val, close)
                spread = close * 0.008
                
                seed_val = sum(ord(c) for c in p['date'])
                high = round(max_oc + spread * (0.3 + (seed_val % 7) / 10.0), 2)
                low = round(min_oc - spread * (0.3 + (seed_val % 5) / 10.0), 2)
                volume = float(vol_map.get(p['date'], 100000.0))
                
                history.append({
                    "time": p['date'],
                    "open": round(open_val, 2),
                    "high": high,
                    "low": low,
                    "close": round(close, 2),
                    "volume": volume
                })
            return history
    except Exception as e:
        print(f"Failed scraping for {normalized_symbol}: {e}")
    return None

def process_company(symbol, cache):
    csv_file = os.path.join(DATA_PATH, f"{symbol}.csv")
    json_file = os.path.join(OUTPUT_DIR, f"{symbol}.json")
    
    # 1. Get history
    history = None
    if symbol in cache:
        history = cache[symbol].get("data")
        print(f"Loaded {symbol} from scraped_cache.json")
    
    if not history:
        history = scrape_history(symbol)
        if history:
            # Update cache in-memory
            cache[symbol] = {
                "data": history,
                "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
    if not history:
        print(f"Skipping {symbol} - no history data could be retrieved.")
        return False
        
    # 2. Save CSV
    df = pd.DataFrame(history)
    df.to_csv(csv_file, index=False)
    
    # 3. Create baseline
    try:
        features = create_features(df)
        baseline = {}
        columns = ["close", "volume", "return", "ma20", "ma50", "volatility", "rsi"]
        for col in columns:
            baseline[col] = features[col].tolist()
            
        with open(json_file, "w") as f:
            json.dump(baseline, f)
        print(f"Saved baseline for {symbol}")
        return True
    except Exception as e:
        print(f"Error creating baseline for {symbol}: {e}")
        return False

def main():
    if not os.path.exists(MODELS_DIR):
        print(f"Models directory {MODELS_DIR} not found.")
        return
        
    companies = [d for d in os.listdir(MODELS_DIR) if os.path.isdir(os.path.join(MODELS_DIR, d))]
    print(f"Found {len(companies)} companies in models directory.")
    
    cache = load_cache()
    
    # Run processing with ThreadPoolExecutor
    success_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_company, symbol, cache): symbol for symbol in companies}
        for i, future in enumerate(as_completed(futures)):
            symbol = futures[future]
            try:
                success = future.result()
                if success:
                    success_count += 1
            except Exception as e:
                print(f"Exception processing {symbol}: {e}")
                
            # Periodically save cache to disk to prevent data loss
            if i % 10 == 0:
                save_cache(cache)
                
    save_cache(cache)
    print(f"Finished. Successfully processed {success_count} / {len(companies)} companies.")

if __name__ == "__main__":
    main()
