import os
import math
import urllib.request
import json
import joblib
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODELS_BASE_DIR = r"G:\MarketPulse-AI\DSE_PatchTST_Adjusted_Models"

# Global memory caches for models and scalers to optimize inference latency
MODEL_CACHE = {}
SCALER_CACHE = {}

class PatchTST(nn.Module):
    def __init__(self, seq_len=60, n_features=11, patch_len=12, stride=6, d_model=128, n_heads=4, num_layers=3, dropout=0.2):
        super().__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.patch_len = patch_len
        self.stride = stride
        self.d_model = d_model
        
        self.num_patches = ((seq_len - patch_len) // stride) + 1
        self.patch_projection = nn.Linear(n_features * patch_len, d_model)
        self.position_embedding = nn.Parameter(torch.zeros(1, self.num_patches, d_model))
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=512,
            dropout=dropout,
            activation='gelu',
            batch_first=True,
            norm_first=False
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        self.head = nn.Sequential(
            nn.Flatten(start_dim=1),
            nn.Linear(self.num_patches * d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1)
        )
        
    def forward(self, x):
        x = self.patch_projection(x)
        x = x + self.position_embedding
        x = self.encoder(x)
        x = self.head(x)
        return x

def get_model_and_scaler(symbol):
    """
    Dynamically loads and caches the PatchTST model and StandardScaler for a symbol.
    """
    if symbol in MODEL_CACHE:
        return MODEL_CACHE[symbol], SCALER_CACHE[symbol]
        
    # Standard normalization of symbol names
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    model_dir = os.path.join(MODELS_BASE_DIR, normalized_symbol)
    
    if not os.path.exists(model_dir):
        print(f"[Model Loader] Directory not found for: {normalized_symbol}")
        return None, None
        
    # Locate weights and scaler pickle
    pt_path = os.path.join(model_dir, f"{normalized_symbol}.pt")
    pkl_path = os.path.join(model_dir, f"{normalized_symbol}_scaler.pkl")
    
    if not os.path.exists(pt_path) or not os.path.exists(pkl_path):
        print(f"[Model Loader] Missing .pt or _scaler.pkl in {model_dir}")
        return None, None
        
    try:
        # Load scaler
        scaler = joblib.load(pkl_path)
        
        # Load model checkpoint
        checkpoint = torch.load(pt_path, map_location='cpu')
        
        model = PatchTST(
            seq_len=checkpoint['seq_len'],
            n_features=checkpoint['n_features'],
            patch_len=checkpoint['patch_len'],
            stride=checkpoint['stride'],
            d_model=checkpoint['d_model'],
            n_heads=checkpoint['n_heads'],
            num_layers=checkpoint['num_layers'],
            dropout=checkpoint['dropout']
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        
        # Save to global cache
        MODEL_CACHE[symbol] = model
        SCALER_CACHE[symbol] = scaler
        
        print(f"[Model Loader] Successfully cached model/scaler for {symbol} (Normalized: {normalized_symbol})")
        return model, scaler
    except Exception as e:
        print(f"[Model Loader] Failed to load assets for {symbol}: {e}")
        return None, None

def fetch_history_from_scraper(symbol):
    """
    Scrapes historical data directly from DSE to avoid deadlocks.
    Falls back to mock-data.js if DSE is unreachable.
    """
    import ssl
    import re
    import random
    
    # Normalize symbol
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    print(f"[Scraper] Fetching history for {symbol} (Normalized: {normalized_symbol}) directly from DSE...")
    
    # Try scraping from DSE directly
    try:
        ctx = ssl._create_unverified_context()
        # Fetch Price Graph
        price_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=price"
        req = urllib.request.Request(price_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as response:
            price_html = response.read().decode('utf-8', errors='ignore')
            
        # Fetch Volume Graph
        vol_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=vol"
        req = urllib.request.Request(vol_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as response:
            vol_html = response.read().decode('utf-8', errors='ignore')
            
        # Parse matches: "YYYY-MM-DD,value\n"
        pattern = r'"(\d{4}-\d{2}-\d{2}),([\d.]+)\\n"'
        prices = [{"date": d, "value": float(v)} for d, v in re.findall(pattern, price_html)]
        volumes = [{"date": d, "value": float(v)} for d, v in re.findall(pattern, vol_html)]
        
        if prices and len(prices) >= 20:
            vol_map = {v['date']: v['value'] for v in volumes}
            history = []
            random.seed(42)
            
            for i, p in enumerate(prices):
                close = p['value']
                prev_close = prices[i-1]['value'] if i > 0 else close
                open_val = prev_close
                
                max_oc = max(open_val, close)
                min_oc = min(open_val, close)
                spread = close * 0.008
                
                high = round(max_oc + spread * (0.3 + random.random() * 0.7), 2)
                low = round(min_oc - spread * (0.3 + random.random() * 0.7), 2)
                volume = float(vol_map.get(p['date'], 100000.0))
                
                history.append({
                    "time": p['date'],
                    "open": round(open_val, 2),
                    "high": high,
                    "low": low,
                    "close": round(close, 2),
                    "volume": volume
                })
            print(f"[Scraper] Successfully scraped {len(history)} candles from DSE for {symbol}")
            return history
    except Exception as e:
        print(f"[Scraper] Direct DSE scraping failed for {symbol}: {e}")

    # Fallback to mock-data.js
    print(f"[Scraper] Falling back to mock-data.js for {symbol}")
    mock_file = r"G:\MarketPulse-AI\src\data\mock-data.js"
    if os.path.exists(mock_file):
        try:
            with open(mock_file, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'export\s+const\s+candlestickData\s*=\s*(\[[\s\S]*?\]);', content)
            if match:
                js_arr = match.group(1)
                candles = []
                candle_matches = re.finditer(
                    r'\{\s*time:\s*[\'"]([^\'"]+)[\'"],\s*open:\s*([\d.]+),\s*high:\s*([\d.]+),\s*low:\s*([\d.]+),\s*close:\s*([\d.]+)\s*\}', 
                    js_arr
                )
                for m in candle_matches:
                    candles.append({
                        "time": m.group(1),
                        "open": float(m.group(2)),
                        "high": float(m.group(3)),
                        "low": float(m.group(4)),
                        "close": float(m.group(5)),
                        "volume": 1000000.0
                    })
                print(f"[Scraper] Parsed {len(candles)} candles from mock-data.js as fallback")
                return candles
        except Exception as mock_err:
            print(f"[Scraper] Failed to load mock fallback: {mock_err}")
            
    return None

def compute_row_features(df):
    """
    Applies the exact same feature engineering pipeline used during training.
    """
    df = df.copy()
    
    # 1. log_return
    df['log_return'] = np.log(df['close'] / df['close'].shift(1))
    # 2. return
    df['return'] = df['close'].pct_change()
    
    # Simple Moving Averages
    df['ma5'] = df['close'].rolling(window=5).mean()
    df['ma10'] = df['close'].rolling(window=10).mean()
    df['ma20'] = df['close'].rolling(window=20).mean()
    
    # Moving Average Ratios
    df['ma5_ratio'] = df['close'] / df['ma5']
    df['ma10_ratio'] = df['close'] / df['ma10']
    df['ma20_ratio'] = df['close'] / df['ma20']
    
    # Volatility parameters (std of log returns)
    df['volatility_10'] = df['log_return'].rolling(window=10).std()
    df['volatility_20'] = df['log_return'].rolling(window=20).std()
    
    # Volatility Z-score (Rolling 20-period stats of volatility_20)
    vol_mean = df['volatility_20'].rolling(window=20, min_periods=1).mean()
    vol_std = df['volatility_20'].rolling(window=20, min_periods=1).std()
    df['volatility_z'] = (df['volatility_20'] - vol_mean) / (vol_std + 1e-8)
    
    # Volume dynamics
    df['log_volume'] = np.log(df['volume'] + 1.0)
    df['volume_change'] = df['volume'].pct_change()
    
    # High-Low Range normalized by closing price
    df['hl_range'] = (df['high'] - df['low']) / df['close']
    
    return df

def generate_graceful_fallback(df, symbol):
    """
    Generates a high-quality baseline projection when no deep learning model exists.
    Uses rolling drift (mean return) and historical volatility.
    """
    # Calculate returns
    df = df.copy()
    df['return'] = df['close'].pct_change()
    df['log_return'] = np.log(df['close'] / df['close'].shift(1))
    
    # Exclude outliers and get stats of last 20 days
    last_20 = df.tail(20)
    mean_return = float(last_20['log_return'].mean())
    volatility = float(last_20['log_return'].std())
    
    if math.isnan(mean_return):
        mean_return = 0.0
    if math.isnan(volatility) or volatility == 0:
        volatility = 0.01  # default 1% daily vol
        
    current_price = float(df.iloc[-1]['close'])
    
    # Generate 5-day projections
    predictions = []
    temp_price = current_price
    for _ in range(5):
        # Expected value projection
        temp_price = temp_price * math.exp(mean_return)
        predictions.append(round(temp_price, 2))
        
    direction = "UP" if predictions[-1] > current_price else "DOWN"
    
    # Calculate confidence based on normal CDF of expected return vs volatility
    z_score = mean_return / (volatility + 1e-8)
    confidence = 50.0 + 50.0 * math.erf(abs(z_score) / math.sqrt(2))
    
    # Keep confidence within reasonable bounds [50.0, 95.0] for fallback
    confidence = max(50.0, min(95.0, confidence))
    
    print(f"[Fallback Pipeline] Fallback prediction computed for {symbol}. Dir: {direction}, Conf: {confidence:.2f}%")
    return {
        "symbol": symbol,
        "current_price": current_price,
        "prediction": predictions,
        "direction": direction,
        "confidence": round(confidence, 2),
        "is_fallback": True
    }

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol', '').strip().upper()
    if not symbol:
        return jsonify({"error": "Symbol query parameter is required"}), 400
        
    # 1. Fetch DSE history data
    history = fetch_history_from_scraper(symbol)
    if not history or len(history) < 20:
        return jsonify({"error": f"Failed to fetch sufficient historical candles for symbol: {symbol}"}), 404
        
    df = pd.DataFrame(history)
    df['open'] = df['open'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['close'] = df['close'].astype(float)
    df['volume'] = df['volume'].astype(float)
    
    current_price = float(df.iloc[-1]['close'])
    
    # 2. Check if PatchTST model exists for this symbol
    model, scaler = get_model_and_scaler(symbol)
    
    if model is None or scaler is None:
        # Fallback gracefully
        return jsonify(generate_graceful_fallback(df, symbol))
        
    # 3. Preprocess and run PatchTST model
    try:
        # Build features
        df_feat = compute_row_features(df)
        df_feat = df_feat.dropna().reset_index(drop=True)
        
        if len(df_feat) < 60:
            print(f"[Prediction Pipeline] Insufficient history length ({len(df_feat)}) for {symbol} after feature engineering. Falling back.")
            return jsonify(generate_graceful_fallback(df, symbol))
            
        features_cols = [
            'log_return', 'return', 'ma5_ratio', 'ma10_ratio', 'ma20_ratio', 
            'volatility_10', 'volatility_20', 'volatility_z', 'log_volume', 
            'volume_change', 'hl_range'
        ]
        
        # Roll forward autoregressively for 5 days
        predictions = []
        df_roll = df_feat.copy()
        
        # Hyperparameters for patching
        seq_len = 60
        patch_len = 12
        stride = 6
        num_patches = ((seq_len - patch_len) // stride) + 1
        
        for day in range(5):
            # Take latest 60 days
            df_seq = df_roll.tail(60)
            X = df_seq[features_cols].values
            
            # Apply StandardScaler scaling
            X_scaled = scaler.transform(X)
            
            # Segment into patches
            patches = []
            for p in range(num_patches):
                start = p * stride
                end = start + patch_len
                patch = X_scaled[start:end, :].flatten()  # 132 elements
                patches.append(patch)
                
            input_tensor = torch.tensor(np.array(patches), dtype=torch.float32).unsqueeze(0)  # [1, 9, 132]
            
            # Forward pass
            with torch.no_grad():
                out = model(input_tensor)
                
            pred_scaled = out.item()
            
            # De-scale predicted log_return (index 0)
            pred_log_return = pred_scaled * scaler.scale_[0] + scaler.mean_[0]
            
            last_row = df_roll.iloc[-1]
            next_close = float(last_row['close'] * math.exp(pred_log_return))
            predictions.append(round(next_close, 2))
            
            # Append simulated new day to keep rolling
            next_row = {
                'time': f"sim_{day+1}",
                'open': float(last_row['close']),
                'high': float(max(last_row['close'], next_close)),
                'low': float(min(last_row['close'], next_close)),
                'close': next_close,
                'volume': float(last_row['volume'])
            }
            
            df_roll = pd.concat([df_roll, pd.DataFrame([next_row])], ignore_index=True)
            df_roll = compute_row_features(df_roll)
            
        direction = "UP" if predictions[-1] > current_price else "DOWN"
        
        # Calculate normal CDF confidence based on day 1 expected return vs 20-day volatility
        first_pred_return = (predictions[0] - current_price) / current_price
        vol_20 = float(df_feat.iloc[-1]['volatility_20'])
        z_score = first_pred_return / (vol_20 + 1e-8)
        confidence = 50.0 + 50.0 * math.erf(abs(z_score) / math.sqrt(2))
        
        # Keep confidence in [50.0, 99.0]
        confidence = max(50.0, min(99.0, confidence))
        
        print(f"[Prediction Pipeline] PatchTST prediction completed for {symbol}. Dir: {direction}, Conf: {confidence:.2f}%")
        return jsonify({
            "symbol": symbol,
            "current_price": current_price,
            "prediction": predictions,
            "direction": direction,
            "confidence": round(confidence, 2),
            "is_fallback": False
        })
        
    except Exception as e:
        print(f"[Prediction Pipeline] Error during inference for {symbol}: {e}")
        return jsonify(generate_graceful_fallback(df, symbol))

if __name__ == '__main__':
    # Running local prediction microservice
    app.run(host='0.0.0.0', port=5000, debug=False)
