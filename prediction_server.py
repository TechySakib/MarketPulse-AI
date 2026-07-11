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

from datetime import datetime
from drift_monitor.feature_engineering import create_features
from drift_monitor.wasserstein import calculate_drift
from drift_monitor.recommendation import get_status
from drift_monitor.drift_history import save_history

app = Flask(__name__)
CORS(app)

MODELS_BASE_DIR = r"G:\MarketPulse-AI\DSE_PatchTST_Adjusted_Models"

# Global memory caches for models and scalers to optimize inference latency
MODEL_CACHE = {}
SCALER_CACHE = {}

SCRAPED_CACHE_FILE = r"G:\MarketPulse-AI\scraped_cache.json"
PORTFOLIO_FILE = r"G:\MarketPulse-AI\portfolio.json"

def load_scraper_cache():
    if os.path.exists(SCRAPED_CACHE_FILE):
        try:
            with open(SCRAPED_CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Cache Storage] Error loading scraper cache: {e}")
    return {}

def save_scraper_cache(cache_data):
    try:
        with open(SCRAPED_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2)
    except Exception as e:
        print(f"[Cache Storage] Error saving scraper cache: {e}")

def load_portfolio():
    if os.path.exists(PORTFOLIO_FILE):
        try:
            with open(PORTFOLIO_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Portfolio Storage] Error loading portfolio: {e}")
    return {
        "SQURPHARMA": 500,
        "BRACBANK": 1000,
        "RENATA": 300,
        "BEXIMCO": 800
    }

def save_portfolio(data):
    try:
        with open(PORTFOLIO_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"[Portfolio Storage] Error saving portfolio: {e}")
        return False

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
        
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    model_dir = os.path.join(MODELS_BASE_DIR, normalized_symbol)
    
    if not os.path.exists(model_dir):
        print(f"[Model Loader] Directory not found for: {normalized_symbol}")
        return None, None
        
    pt_path = os.path.join(model_dir, f"{normalized_symbol}.pt")
    pkl_path = os.path.join(model_dir, f"{normalized_symbol}_scaler.pkl")
    
    if not os.path.exists(pt_path) or not os.path.exists(pkl_path):
        print(f"[Model Loader] Missing .pt or _scaler.pkl in {model_dir}")
        return None, None
        
    try:
        scaler = joblib.load(pkl_path)
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
        
        MODEL_CACHE[symbol] = model
        SCALER_CACHE[symbol] = scaler
        
        print(f"[Model Loader] Successfully cached model/scaler for {symbol} (Normalized: {normalized_symbol})")
        return model, scaler
    except Exception as e:
        print(f"[Model Loader] Failed to load assets for {symbol}: {e}")
        return None, None

def fetch_history_from_scraper(symbol):
    """
    Scrapes historical data directly from DSE.
    If scraping fails, returns cached last-known real data and its timestamp.
    """
    import ssl
    import re
    import datetime
    
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    print(f"[Scraper] Fetching history for {symbol} (Normalized: {normalized_symbol}) directly from DSE...")
    
    try:
        ctx = ssl._create_unverified_context()
        price_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=price"
        req = urllib.request.Request(price_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as response:
            price_html = response.read().decode('utf-8', errors='ignore')
            
        vol_url = f"https://www.dsebd.org/php_graph/monthly_graph.php?inst={normalized_symbol}&duration=12&type=vol"
        req = urllib.request.Request(vol_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as response:
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
            
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cache_data = load_scraper_cache()
            cache_data[normalized_symbol] = {
                "data": history,
                "timestamp": timestamp
            }
            save_scraper_cache(cache_data)
            
            print(f"[Scraper] Successfully scraped {len(history)} candles from DSE for {symbol}")
            return history, "Live"
    except Exception as e:
        print(f"[Scraper] Direct DSE scraping failed for {symbol}: {e}")
        
    cache_data = load_scraper_cache()
    if normalized_symbol in cache_data:
        entry = cache_data[normalized_symbol]
        print(f"[Scraper] Returning cached data for {normalized_symbol} (last scraped: {entry['timestamp']})")
        return entry['data'], entry['timestamp']
        
    print(f"[Scraper] No cached data found for {normalized_symbol}. Using blank list.")
    return [], None

def compute_row_features(df):
    """
    Applies the exact same feature engineering pipeline used during training.
    """
    df = df.copy()
    
    # 1. log_return
    df['log_return'] = np.log(df['close'] / (df['close'].shift(1) + 1e-8))
    # 2. return
    df['return'] = df['close'].pct_change()
    
    # Simple Moving Averages
    df['ma5'] = df['close'].rolling(window=5).mean()
    df['ma10'] = df['close'].rolling(window=10).mean()
    df['ma20'] = df['close'].rolling(window=20).mean()
    
    # Moving Average Ratios
    df['ma5_ratio'] = df['close'] / (df['ma5'] + 1e-8)
    df['ma10_ratio'] = df['close'] / (df['ma10'] + 1e-8)
    df['ma20_ratio'] = df['close'] / (df['ma20'] + 1e-8)
    
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
    
    # Replace infinities and NaNs
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.ffill().bfill()
    df = df.fillna(0.0)
    
    # High-Low Range normalized by closing price
    df['hl_range'] = (df['high'] - df['low']) / (df['close'] + 1e-8)
    
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

def calculate_wasserstein_drift(X_live, scaler):
    """
    Computes 1D Wasserstein Distance between empirical distribution of live features 
    and the target standard normal training distribution N(0, 1).
    """
    try:
        X_scaled = scaler.transform(X_live)
        means = np.mean(X_scaled, axis=0)
        stds = np.std(X_scaled, axis=0)
        
        w_distances = []
        for m, s in zip(means, stds):
            w_dist = math.sqrt(m**2 + (s - 1)**2)
            w_distances.append(w_dist)
            
        avg_w = float(np.mean(w_distances))
        drift_score = min(99.0, max(1.0, avg_w * 40.0))
        return drift_score
    except Exception as e:
        print(f"[Drift Engine] Failed to compute Wasserstein drift: {e}")
        return 45.0

def compute_gradient_saliency(model, X_scaled, scaler):
    """
    Computes model-based feature importance by calculating the average absolute gradient
    of the model forecast with respect to each feature channel.
    """
    try:
        seq_len = 60
        patch_len = 12
        stride = 6
        num_patches = ((seq_len - patch_len) // stride) + 1
        
        patches = []
        for p in range(num_patches):
            start = p * stride
            end = start + patch_len
            patch = X_scaled[start:end, :].flatten()
            patches.append(patch)
            
        input_tensor = torch.tensor(np.array(patches), dtype=torch.float32).unsqueeze(0)
        input_tensor.requires_grad = True
        
        out = model(input_tensor)
        
        model.zero_grad()
        out.backward()
        
        grads = input_tensor.grad.squeeze(0).abs().numpy()
        
        grads_reshaped = grads.reshape(num_patches, patch_len, 11)
        feature_saliency = np.mean(grads_reshaped, axis=(0, 1))
        
        total = np.sum(feature_saliency)
        if total > 0:
            feature_saliency_pct = (feature_saliency / total) * 100.0
        else:
            feature_saliency_pct = np.ones(11) * (100.0 / 11)
            
        momentum = float(feature_saliency_pct[0] + feature_saliency_pct[1])
        volume = float(feature_saliency_pct[8] + feature_saliency_pct[9])
        regime = float(feature_saliency_pct[7])
        drift = float(feature_saliency_pct[4])
        correlation = float(feature_saliency_pct[3])
        sentiment = float(feature_saliency_pct[10])
        
        salience_list = [momentum, volume, regime, drift, correlation, sentiment]
        max_val = max(salience_list) if max(salience_list) > 0 else 1.0
        scaled_values = [min(98.0, max(20.0, (v / max_val) * 75.0 + 15.0)) for v in salience_list]
        
        return {
            "momentum": int(round(scaled_values[0], 0)),
            "volume": int(round(scaled_values[1], 0)),
            "regime": int(round(scaled_values[2], 0)),
            "drift": int(round(scaled_values[3], 0)),
            "correlation": int(round(scaled_values[4], 0)),
            "sentiment": int(round(scaled_values[5], 0))
        }
    except Exception as e:
        print(f"[Saliency Engine] Failed to calculate gradient saliency: {e}")
        return None

def compute_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    seed = deltas[:period]
    up = seed[seed >= 0].sum() / period
    down = -seed[seed < 0].sum() / period
    if down == 0:
        rs = 1e8
    else:
        rs = up / down
    rsi = np.zeros_like(prices)
    rsi[:period] = 100. - 100. / (1. + rs)

    for i in range(period, len(prices)):
        delta = deltas[i - 1]
        if delta > 0:
            upval = delta
            downval = 0.
        else:
            upval = 0.
            downval = -delta
        up = (up * (period - 1) + upval) / period
        down = (down * (period - 1) + downval) / period
        if down == 0:
            rs = 1e8
        else:
            rs = up / down
        rsi[i] = 100. - 100. / (1. + rs)
    return float(rsi[-1])

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol', '').strip().upper()
    if not symbol:
        return jsonify({"error": "Symbol query parameter is required"}), 400
        
    history, last_scraped = fetch_history_from_scraper(symbol)
    if not history or len(history) < 20:
        return jsonify({"error": f"Failed to fetch sufficient historical candles for symbol: {symbol}"}), 404
        
    df = pd.DataFrame(history)
    df['open'] = df['open'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['close'] = df['close'].astype(float)
    df['volume'] = df['volume'].astype(float)
    
    current_price = float(df.iloc[-1]['close'])
    
    model, scaler = get_model_and_scaler(symbol)
    if model is None or scaler is None:
        fallback = generate_graceful_fallback(df, symbol)
        fallback["last_scraped"] = last_scraped
        return jsonify(fallback)
        
    try:
        df_feat = compute_row_features(df)
        df_feat = df_feat.dropna().reset_index(drop=True)
        
        if len(df_feat) < 60:
            print(f"[Prediction Pipeline] Insufficient history length ({len(df_feat)}) for {symbol} after feature engineering. Falling back.")
            fallback = generate_graceful_fallback(df, symbol)
            fallback["last_scraped"] = last_scraped
            return jsonify(fallback)
            
        features_cols = [
            'log_return', 'return', 'ma5_ratio', 'ma10_ratio', 'ma20_ratio', 
            'volatility_10', 'volatility_20', 'volatility_z', 'log_volume', 
            'volume_change', 'hl_range'
        ]
        
        predictions = []
        df_roll = df_feat.copy()
        seq_len = 60
        patch_len = 12
        stride = 6
        num_patches = ((seq_len - patch_len) // stride) + 1
        
        for day in range(5):
            df_seq = df_roll.tail(60)
            X = df_seq[features_cols].values
            X_scaled = scaler.transform(X)
            
            patches = []
            for p in range(num_patches):
                start = p * stride
                end = start + patch_len
                patch = X_scaled[start:end, :].flatten()
                patches.append(patch)
                
            input_tensor = torch.tensor(np.array(patches), dtype=torch.float32).unsqueeze(0)
            
            with torch.no_grad():
                out = model(input_tensor)
                
            pred_scaled = out.item()
            pred_log_return = pred_scaled * scaler.scale_[0] + scaler.mean_[0]
            
            last_row = df_roll.iloc[-1]
            next_close = float(last_row['close'] * math.exp(pred_log_return))
            predictions.append(round(next_close, 2))
            
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
        
        first_pred_return = (predictions[0] - current_price) / current_price
        vol_20 = float(df_feat.iloc[-1]['volatility_20'])
        z_score = first_pred_return / (vol_20 + 1e-8)
        confidence = 50.0 + 50.0 * math.erf(abs(z_score) / math.sqrt(2))
        confidence = max(50.0, min(99.0, confidence))
        
        print(f"[Prediction Pipeline] PatchTST prediction completed for {symbol}. Dir: {direction}, Conf: {confidence:.2f}%")
        return jsonify({
            "symbol": symbol,
            "current_price": current_price,
            "prediction": predictions,
            "direction": direction,
            "confidence": round(confidence, 2),
            "is_fallback": False,
            "last_scraped": last_scraped
        })
        
    except Exception as e:
        print(f"[Prediction Pipeline] Error during inference for {symbol}: {e}")
        fallback = generate_graceful_fallback(df, symbol)
        fallback["last_scraped"] = last_scraped
        return jsonify(fallback)

@app.route('/api/features', methods=['GET'])
def get_features():
    symbol = request.args.get('symbol', 'SQURPHARMA').strip().upper()
    history, last_scraped = fetch_history_from_scraper(symbol)
    if not history or len(history) < 20:
        return jsonify({"error": "Failed to fetch stock history"}), 404
        
    closes = [h['close'] for h in history]
    volumes = [h['volume'] for h in history]
    highs = [h['high'] for h in history]
    lows = [h['low'] for h in history]
    opens = [h['open'] for h in history]
    
    model, scaler = get_model_and_scaler(symbol)
    if model is not None and scaler is not None:
        df = pd.DataFrame(history)
        df_feat = compute_row_features(df)
        df_feat = df_feat.dropna().reset_index(drop=True)
        if len(df_feat) >= 60:
            features_cols = [
                'log_return', 'return', 'ma5_ratio', 'ma10_ratio', 'ma20_ratio', 
                'volatility_10', 'volatility_20', 'volatility_z', 'log_volume', 
                'volume_change', 'hl_range'
            ]
            X_live = df_feat.tail(60)[features_cols].values
            X_scaled = scaler.transform(X_live)
            saliency = compute_gradient_saliency(model, X_scaled, scaler)
            if saliency:
                return jsonify([
                    { "label": "Price Momentum (14D)", "value": saliency["momentum"], "color": "green" },
                    { "label": "Volume Anomaly Score", "value": saliency["volume"], "color": "cyan" },
                    { "label": "Regime State Vector", "value": saliency["regime"], "color": "green" },
                    { "label": "Drift Coefficient", "value": saliency["drift"], "color": "amber" },
                    { "label": "Sector Correlation", "value": saliency["correlation"], "color": "cyan" },
                    { "label": "Sentiment Index", "value": saliency["sentiment"], "color": "amber" }
                ])
                
    rsi_val = compute_rsi(closes, 14)
    vol_mean = np.mean(volumes[-20:])
    vol_anomaly = (volumes[-1] / (vol_mean + 1e-8)) * 50.0
    vol_anomaly = min(100.0, max(0.0, vol_anomaly))
    
    returns_20 = np.diff(closes[-21:]) / closes[-21:-1]
    vol_20 = np.std(returns_20)
    regime_state = 100.0 - min(100.0, vol_20 * 2000.0)
    
    mean_ret = np.mean(returns_20)
    std_ret = np.std(returns_20)
    drift_coef = 50.0 + (mean_ret / (std_ret + 1e-8)) * 25.0
    drift_coef = min(100.0, max(0.0, drift_coef))
    
    ref_symbols = ['GP', 'RENATA', 'BRACBANK']
    ref_returns = []
    for r_sym in ref_symbols:
        r_hist, _ = fetch_history_from_scraper(r_sym)
        if r_hist and len(r_hist) >= len(returns_20) + 1:
            r_closes = [h['close'] for h in r_hist[-21:]]
            ref_returns.append(np.diff(r_closes) / r_closes[:-1])
    if ref_returns:
        market_returns = np.mean(ref_returns, axis=0)
        corr = np.corrcoef(returns_20, market_returns)[0, 1]
        if np.isnan(corr): corr = 0.5
        correlation = (corr + 1.0) / 2.0 * 100.0
    else:
        correlation = 72.0
        
    sentiments = []
    for o, h, l, c in zip(opens[-14:], highs[-14:], lows[-14:], closes[-14:]):
        range_val = h - l
        if range_val > 0:
            sentiments.append(50.0 + ((c - o) / range_val) * 50.0)
        else:
            sentiments.append(50.0)
    sentiment_index = float(np.mean(sentiments))
    
    return jsonify([
        { "label": "Price Momentum (14D)", "value": int(round(rsi_val, 0)), "color": "green" },
        { "label": "Volume Anomaly Score", "value": int(round(vol_anomaly, 0)), "color": "cyan" },
        { "label": "Regime State Vector", "value": int(round(regime_state, 0)), "color": "green" },
        { "label": "Drift Coefficient", "value": int(round(drift_coef, 0)), "color": "amber" },
        { "label": "Sector Correlation", "value": int(round(correlation, 0)), "color": "cyan" },
        { "label": "Sentiment Index", "value": int(round(sentiment_index, 0)), "color": "amber" }
    ])

@app.route('/api/confidence', methods=['GET'])
def get_confidence_heatmap():
    symbols = ['SQURPHARMA', 'BEXIMCO', 'BSRMSTEEL', 'RENATA', 'BRACBANK']
    res = []
    
    for symbol in symbols:
        history, last_scraped = fetch_history_from_scraper(symbol)
        if not history or len(history) < 21:
            res.append({
                "stock": symbol,
                "momentum": 75, "volume": 70, "sentiment": 65, "trend": 80, "regime": 70
            })
            continue
            
        closes = [h['close'] for h in history]
        volumes = [h['volume'] for h in history]
        highs = [h['high'] for h in history]
        lows = [h['low'] for h in history]
        opens = [h['open'] for h in history]
        
        momentum = compute_rsi(closes, 14)
        
        vol_mean = np.mean(volumes[-20:])
        volume = min(99.0, max(10.0, (volumes[-1] / (vol_mean + 1e-8)) * 50.0))
        
        sentiments = []
        for o, h, l, c in zip(opens[-10:], highs[-10:], lows[-10:], closes[-10:]):
            r = h - l
            sentiments.append(50.0 + ((c - o) / (r + 1e-8)) * 50.0)
        sentiment = float(np.mean(sentiments))
        
        ma10 = np.mean(closes[-10:])
        ma20 = np.mean(closes[-20:])
        trend = 50.0 + ((ma10 - ma20) / ma20) * 1000.0
        trend = min(99.0, max(10.0, trend))
        
        returns = np.diff(closes[-21:]) / closes[-21:-1]
        vol = np.std(returns)
        regime = min(99.0, max(10.0, 100.0 - vol * 2000.0))
        
        res.append({
            "stock": symbol,
            "momentum": int(round(momentum, 0)),
            "volume": int(round(volume, 0)),
            "sentiment": int(round(sentiment, 0)),
            "trend": int(round(trend, 0)),
            "regime": int(round(regime, 0))
        })
        
    return jsonify(res)

@app.route('/api/drift/<symbol>', methods=['GET'])
@app.route('/api/drift', methods=['GET'])
def get_drift_details(symbol=None):
    if not symbol:
        symbol = request.args.get('symbol', 'SQURPHARMA').strip().upper()
        
    normalized_symbol = symbol.strip().upper()
    if normalized_symbol == 'SQPHARMA':
        normalized_symbol = 'SQURPHARMA'
        
    history, last_scraped = fetch_history_from_scraper(normalized_symbol)
    if not history or len(history) < 20:
        return jsonify({"error": "Failed to fetch stock history or history too short"}), 404
        
    baseline_file = f"drift_baseline/{normalized_symbol}.json"
    if not os.path.exists(baseline_file):
        try:
            df_temp = pd.DataFrame(history)
            features_temp = create_features(df_temp)
            baseline = {}
            columns = ["close", "volume", "return", "ma20", "ma50", "volatility", "rsi"]
            for col in columns:
                baseline[col] = features_temp[col].tolist()
            os.makedirs("drift_baseline", exist_ok=True)
            with open(baseline_file, "w") as f:
                json.dump(baseline, f)
        except Exception as e:
            return jsonify({"error": f"Failed to generate baseline: {str(e)}"}), 500
            
    with open(baseline_file, "r") as f:
        training = json.load(f)
        
    df_live = pd.DataFrame(history)
    live_features = create_features(df_live)
    
    live = {}
    for col in training:
        live[col] = live_features[col].tolist()
        
    result = calculate_drift(training, live)
    overall_drift = result["overall"]
    status = get_status(overall_drift)
    status_str = status["status"]
    
    # Save to daily history
    history_timeline = save_history(normalized_symbol, overall_drift)
    
    # Calculate regime age (consecutive days with the same drift status)
    regime_age = 1
    if len(history_timeline) > 1:
        for hist_item in reversed(history_timeline[:-1]):
            hist_status = get_status(hist_item["score"])["status"]
            if hist_status == status_str:
                regime_age += 1
            else:
                break
                
    # Map metrics and scale for UI (overall_drift * 240.0 translates to 0-100 UI scale)
    ui_drift_score = min(99.0, max(1.0, overall_drift * 240.0))
    ui_stability = int(100.0 - ui_drift_score)
    
    if status_str == 'Stable':
        alert_level = 1
        drift_tag = 'STABLE'
        drift_class = 'stable'
        stability_tag = 'HIGH'
        stability_class = 'stable'
        regime_tag = 'STABLE'
        regime_class = 'stable'
        alert_tag = 'LOW'
        alert_class = 'stable'
    elif status_str == 'Mild Drift':
        alert_level = 2
        drift_tag = 'MILD'
        drift_class = 'stable'
        stability_tag = 'HIGH'
        stability_class = 'stable'
        regime_tag = 'STABLE'
        regime_class = 'stable'
        alert_tag = 'MILD'
        alert_class = 'stable'
    elif status_str == 'Moderate Drift':
        alert_level = 3
        drift_tag = 'MODERATE'
        drift_class = 'warning'
        stability_tag = 'MED'
        stability_class = 'warning'
        regime_tag = 'WARNING'
        regime_class = 'warning'
        alert_tag = 'MED'
        alert_class = 'warning'
    else: # High Drift
        alert_level = 4
        drift_tag = 'CRITICAL'
        drift_class = 'critical'
        stability_tag = 'LOW'
        stability_class = 'low'
        regime_tag = 'VOLATILE'
        regime_class = 'volatile'
        alert_tag = 'HIGH'
        alert_class = 'volatile'
        
    alert_title = "Regime Intact" if ui_drift_score < 60.0 else "Structural Break Likely"
    alert_body = f"Market behavior matches training distribution. Current drift score is {ui_drift_score:.1f}, which is below the critical threshold." if ui_drift_score < 60.0 else f"Drift detection model flags high-confidence regime transition. Drift score {ui_drift_score:.1f} exceeds critical threshold of 60.0. Retraining recommended."
    
    # Calculate return distribution
    bins = [-0.03, -0.02, -0.01, 0.0, 0.01, 0.02, 0.03]
    labels_dist = ['-3%', '-2%', '-1%', '0%', '1%', '2%', '3%']
    
    train_returns = [r for r in training.get("return", []) if r is not None and not math.isnan(r)]
    live_returns = [r for r in live.get("return", []) if r is not None and not math.isnan(r)]
    
    hist_before, _ = np.histogram(train_returns, bins=[-np.inf] + bins + [np.inf])
    hist_after, _ = np.histogram(live_returns, bins=[-np.inf] + bins + [np.inf])
    
    before_list = [int(v) for v in hist_before]
    after_list = [int(v) for v in hist_after]
    
    # Warnings list
    warnings = []
    if ui_drift_score > 60.0:
        warnings.append({"icon": "⚠", "text": "High volatility regime detected"})
        warnings.append({"icon": "⚡", "text": f"Structural break likely (Alert Level {alert_level})"})
    else:
        warnings.append({"icon": "🟢", "text": "Market regime currently stable"})
        warnings.append({"icon": "ℹ", "text": "No significant structural drift detected"})
        
    feature_thresholds = {
        "volatility": 0.15,
        "volume": 0.20,
        "rsi": 0.15,
        "return": 0.15
    }
    for feat, thresh in feature_thresholds.items():
        feat_score = result["features"].get(feat, 0)
        if feat_score > thresh:
            warnings.append({"icon": "📉", "text": f"{feat.upper()} distribution drift: {feat_score:.3f}"})
            
    warnings = warnings[:3]
    
    # Calculate historical drift timeline for the last 18 trading days
    timeline_values = []
    timeline_labels = []
    
    num_points = 18
    if len(df_live) >= num_points + 20:
        for i in range(len(df_live) - num_points, len(df_live)):
            sub_df = df_live.iloc[:i+1]
            sub_features = create_features(sub_df)
            if len(sub_features) > 0:
                sub_live = {}
                for col in training:
                    sub_live[col] = sub_features[col].tolist()
                sub_result = calculate_drift(training, sub_live)
                # Scale the historical values too
                val_scaled = min(99.0, max(1.0, sub_result["overall"] * 240.0))
                timeline_values.append(val_scaled)
                try:
                    date_str = df_live.iloc[i]["time"]
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    formatted_date = date_obj.strftime("%b %d")
                    timeline_labels.append(formatted_date)
                except Exception:
                    timeline_labels.append(df_live.iloc[i]["time"])
    else:
        timeline_labels = [item["date"] for item in history_timeline]
        timeline_values = [min(99.0, max(1.0, item["score"] * 240.0)) for item in history_timeline]
        
    response_data = {
        # New API requirements
        "symbol": normalized_symbol,
        "drift_score": overall_drift,
        "status": status_str,
        "features": result["features"],
        "timeline": history_timeline,
        "recommendation": status["message"],
        
        # Existing UI compatibility fields
        "driftScore": { "value": f"{ui_drift_score:.1f}", "tag": drift_tag, "tagClass": drift_class },
        "stabilityIdx": { "value": f"{ui_stability}/100", "tag": stability_tag, "tagClass": stability_class },
        "regimeAge": { "value": f"{regime_age} days", "tag": regime_tag, "tagClass": regime_class },
        "alertLevel": { "value": f"LEVEL {alert_level}", "tag": "OF 5", "tagClass": alert_class },
        "alertTitle": alert_title,
        "alertBody": alert_body,
        "driftTimelineLabels": timeline_labels,
        "driftTimelineValues": timeline_values,
        "returnDistLabels": labels_dist,
        "returnDistBefore": before_list,
        "returnDistAfter": after_list,
        "warnings": warnings,
        "last_scraped": last_scraped
    }
    
    return jsonify(response_data)

@app.route('/api/market/regime', methods=['GET'])
def get_market_regime():
    symbols = ['SQURPHARMA', 'GP', 'RENATA']
    volatilities = []
    recent_returns = []
    
    advances = 0
    declines = 0
    
    try:
        ticker_url = "http://localhost:3000/api/dse/tickers"
        req = urllib.request.Request(ticker_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            tickers = json.loads(response.read().decode('utf-8'))
            for t in tickers:
                pct_str = t.get('changePct') or t.get('change') or ''
                if '+' in pct_str:
                    advances += 1
                elif '-' in pct_str:
                    declines += 1
    except Exception:
        advances = 18
        declines = 12
        
    for symbol in symbols:
        history, _ = fetch_history_from_scraper(symbol)
        if history and len(history) >= 21:
            closes = [h['close'] for h in history[-21:]]
            rets = np.diff(closes) / closes[:-1]
            volatilities.append(np.std(rets))
            recent_returns.append(rets[-1])
            
    avg_vol = np.mean(volatilities) if volatilities else 0.015
    avg_ret = np.mean(recent_returns) if recent_returns else 0.001
    
    rsis = []
    for symbol in symbols:
        history, _ = fetch_history_from_scraper(symbol)
        if history and len(history) >= 15:
            rsis.append(compute_rsi([h['close'] for h in history], 14))
    avg_rsi = np.mean(rsis) if rsis else 50.0
    
    drift_score = min(99.0, max(1.0, 50.0 + (avg_ret / (avg_vol + 1e-8)) * 25.0))
    stability_idx = min(99.0, max(1.0, 100.0 - avg_vol * 2000.0))
    
    if avg_vol > 0.014:
        status = "VOLATILE"
        label = "Stormy Market"
        desc = "High turbulence — elevated systemic risk"
        icon = "⛈"
        vis_liquidity = "Low"
    elif avg_ret > 0:
        status = "BULL"
        label = "Clear Skies"
        desc = "Low turbulence — bullish trends established"
        icon = "☀️"
        vis_liquidity = "High"
    else:
        status = "BEAR"
        label = "Crimson Slate"
        desc = "Negative returns — risk mitigation active"
        icon = "🌧"
        vis_liquidity = "Med"
        
    events = [
        { "date": "Jan 08", "text": "Structural break in financial sector", "color": "red" },
        { "date": "Jan 15", "text": "Volatility regime transition detected", "color": "amber" }
    ]
    
    return jsonify({
        "status": status,
        "label": label,
        "description": desc,
        "driftScore": round(drift_score, 1),
        "stabilityIdx": round(stability_idx, 0),
        "marketWeather": {
            "icon": icon,
            "label": label,
            "description": desc,
            "pressure": f"{avg_vol*100:.2f}%",
            "windSpeed": f"{avg_rsi:.1f}",
            "visibility": vis_liquidity,
            "humidity": f"{advances} : {declines}"
        },
        "regimeEvents": events
    })

@app.route('/api/portfolio/holdings', methods=['GET'])
def get_portfolio_holdings():
    return jsonify(load_portfolio())

@app.route('/api/portfolio/manage', methods=['POST'])
def manage_portfolio_holdings():
    try:
        req_data = request.get_json() or {}
        action = req_data.get('action')
        symbol = req_data.get('symbol', '').strip().upper()
        
        if symbol == 'SQPHARMA':
            symbol = 'SQURPHARMA'
            
        holdings = load_portfolio()
        
        if action == 'add':
            shares = int(req_data.get('shares', 0))
            if shares <= 0 or not symbol:
                return jsonify({"error": "Invalid symbol or shares quantity"}), 400
            holdings[symbol] = holdings.get(symbol, 0) + shares
        elif action == 'remove':
            if symbol in holdings:
                del holdings[symbol]
            else:
                return jsonify({"error": "Symbol not in portfolio"}), 404
        else:
            return jsonify({"error": "Invalid action. Use 'add' or 'remove'"}), 400
            
        if save_portfolio(holdings):
            return jsonify({"success": True, "holdings": holdings})
        else:
            return jsonify({"error": "Failed to save portfolio to database"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    holdings = load_portfolio()
    
    sectors = {
        "SQURPHARMA": "Pharma",
        "RENATA": "Pharma",
        "BRACBANK": "Banking",
        "BEXIMCO": "Others"
    }
    
    portfolio_history_sum = None
    time_labels = []
    current_value = 0.0
    yesterday_value = 0.0
    individual_valuations = {}
    
    for symbol, shares in holdings.items():
        history, _ = fetch_history_from_scraper(symbol)
        if history and len(history) >= 20:
            df = pd.DataFrame(history)
            df['close'] = df['close'].astype(float)
            
            c_price = df.iloc[-1]['close']
            y_price = df.iloc[-2]['close'] if len(df) > 1 else c_price
            
            current_value += c_price * shares
            yesterday_value += y_price * shares
            individual_valuations[symbol] = c_price * shares
            
            closes_hist = df.tail(8)['close'].values
            if len(closes_hist) == 8:
                if portfolio_history_sum is None:
                    portfolio_history_sum = closes_hist * shares
                    time_labels = df.tail(8)['time'].values.tolist()
                else:
                    portfolio_history_sum += closes_hist * shares
                    
    if portfolio_history_sum is None:
        if not holdings:
            return jsonify({
                "totalValue": "0",
                "dayPnl": "৳ 0",
                "riskScore": "0.0/10",
                "sharpe": "0.00",
                "returnPct": "+0.00% since inception",
                "portfolioChartLabels": ['Jan 1', 'Jan 5', 'Jan 9', 'Jan 13', 'Jan 17', 'Jan 19', 'Jan 21', 'Jan 25'],
                "portfolioChartValues": [0,0,0,0,0,0,0,0],
                "benchmarkValues": [0,0,0,0,0,0,0,0],
                "assetAllocation": [],
                "portfolioRecommendations": [],
                "riskExposure": []
            })
        portfolio_history_sum = np.array([252000, 258000, 260000, 262000, 265000, 268000, 272000, 277909])
        time_labels = ['Jan 1', 'Jan 5', 'Jan 9', 'Jan 13', 'Jan 17', 'Jan 19', 'Jan 21', 'Jan 25']
        current_value = 277909
        yesterday_value = 273629
        
    day_pnl = current_value - yesterday_value
    sign = "+" if day_pnl >= 0 else ""
    
    p_returns = np.diff(portfolio_history_sum) / portfolio_history_sum[:-1]
    p_vol = np.std(p_returns)
    p_mean = np.mean(p_returns)
    
    sharpe = (p_mean / (p_vol + 1e-8)) * math.sqrt(252) if p_vol > 0 else 1.84
    risk_score = min(10.0, max(1.0, p_vol * 100.0 * 2.0))
    
    sector_alloc = {}
    for sym, val in individual_valuations.items():
        sec = sectors.get(sym, "Others")
        sector_alloc[sec] = sector_alloc.get(sec, 0.0) + val
        
    allocations_list = []
    colors = {
        "Pharma": "#14B8A6",
        "Banking": "#A855F7",
        "Others": "#6B7280"
    }
    
    for sec, val in sector_alloc.items():
        pct = (val / current_value) * 100 if current_value > 0 else 0
        allocations_list.append({
            "name": sec,
            "pct": int(round(pct, 0)),
            "color": colors.get(sec, "#6B7280")
        })
        
    recommendations = []
    for symbol, shares in holdings.items():
        recommendations.append({
            "action": "HOLD" if symbol in ["SQURPHARMA", "RENATA"] else "REDUCE",
            "actionClass": "badge-hold" if symbol in ["SQURPHARMA", "RENATA"] else "badge-reduce",
            "stock": symbol,
            "risk": "LOW" if symbol == "SQURPHARMA" else "HIGH",
            "riskClass": "badge-risk-low" if symbol == "SQURPHARMA" else "badge-risk-high",
            "desc": "Strong momentum — maintain current position" if symbol in ["SQURPHARMA", "RENATA"] else "Elevated volatility — reduce position"
        })
        
    risk_exposure = [
        { "label": "Overall Risk", "value": int(risk_score * 10), "barClass": "amber" if risk_score < 7 else "red" },
        { "label": "Market Risk", "value": 72, "barClass": "red" },
        { "label": "Liquidity", "value": 45, "barClass": "green" },
        { "label": "Sector Concentration", "value": 58, "barClass": "amber" }
    ]
    
    benchmark_history_sum = portfolio_history_sum * 0.96
    
    return jsonify({
        "totalValue": f"{int(current_value):,}",
        "dayPnl": f"{sign}৳ {int(day_pnl):,}",
        "riskScore": f"{risk_score:.1f}/10",
        "sharpe": f"{sharpe:.2f}",
        "returnPct": f"+{((current_value - 250000) / 250000 * 100):.2f}% since inception",
        "portfolioChartLabels": time_labels,
        "portfolioChartValues": portfolio_history_sum.tolist(),
        "benchmarkValues": benchmark_history_sum.tolist(),
        "assetAllocation": allocations_list,
        "portfolioRecommendations": recommendations,
        "riskExposure": risk_exposure
    })

def prewarm_model_cache():
    print("[Cache Startup] Pre-warming memory cache for top stocks...")
    top_stocks = ['SQURPHARMA', 'GP', 'RENATA', 'BRACBANK', 'BEXIMCO']
    for sym in top_stocks:
        get_model_and_scaler(sym)

if __name__ == '__main__':
    prewarm_model_cache()
    app.run(host='0.0.0.0', port=5000, debug=False)
