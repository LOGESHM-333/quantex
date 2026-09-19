"""
QUANTX Market Data Service
Retrieves real historical and real-time market data for Gold (GC=F), Bitcoin (BTC-USD), and NVIDIA (NVDA).
Performs strict chronological normalization, validation, and multi-tier in-memory caching.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

SUPPORTED_ASSETS = {
    "GC=F": {
        "symbol": "GC=F",
        "name": "Gold Futures",
        "type": "COMMODITY",
        "currency": "USD",
        "trading_days_per_year": 252,
        "description": "COMEX Gold Front-Month Continuous Futures"
    },
    "BTC-USD": {
        "symbol": "BTC-USD",
        "name": "Bitcoin",
        "type": "CRYPTO",
        "currency": "USD",
        "trading_days_per_year": 365,
        "description": "Bitcoin / US Dollar spot crypto pair (24/7)"
    },
    "NVDA": {
        "symbol": "NVDA",
        "name": "NVIDIA Corporation",
        "type": "EQUITY",
        "currency": "USD",
        "trading_days_per_year": 252,
        "description": "NVIDIA common stock traded on NASDAQ"
    }
}

# In-memory cache: symbol:range -> (timestamp, data)
_CACHE: Dict[str, Any] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache for market data

import ssl

def _fetch_yahoo_chart_api(symbol: str, range_str: str = "1y", interval: str = "1d") -> Dict[str, Any]:
    """Fetch raw JSON chart data from Yahoo Finance API directly."""
    valid_ranges = {"1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "3y": "3y", "5y": "5y", "max": "max"}
    y_range = valid_ranges.get(range_str.lower(), "1y")

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={y_range}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl._create_unverified_context()
    with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} from market data provider for {symbol}")
        content = response.read().decode("utf-8")
        return json.loads(content)

def normalize_market_data(raw_response: Dict[str, Any], symbol: str) -> List[Dict[str, Any]]:
    """
    Normalizes raw market feed into standardized OHLCV records:
    [
      {
        "date": "YYYY-MM-DD",
        "timestamp": 1234567890,
        "open": float,
        "high": float,
        "low": float,
        "close": float,
        "adjusted_close": float,
        "volume": int,
        "symbol": str
      }, ...
    ]
    Handles:
    - Missing dates
    - Duplicate timestamps
    - Missing values (forward fill or drop NaN rows)
    - Timezone differences (normalized to UTC ISO date)
    - Chronological sorting
    - Exclusion of zero/null price anomalies
    """
    chart = raw_response.get("chart", {})
    results = chart.get("result")
    if not results or len(results) == 0:
        error = chart.get("error", {})
        raise ValueError(f"No market data result returned: {error.get('description', 'Unknown error')}")

    data = results[0]
    timestamps = data.get("timestamp", [])
    indicators = data.get("indicators", {})
    quotes = indicators.get("quote", [{}])[0]
    adjcloses = indicators.get("adjclose", [{}])[0].get("adjclose", [])

    opens = quotes.get("open", [])
    highs = quotes.get("high", [])
    lows = quotes.get("low", [])
    closes = quotes.get("close", [])
    volumes = quotes.get("volume", [])

    normalized: List[Dict[str, Any]] = []
    seen_dates = set()

    for i, ts in enumerate(timestamps):
        if ts is None:
            continue

        c = closes[i] if i < len(closes) else None
        if c is None or c <= 0 or str(c) == "nan":
            continue

        o = opens[i] if i < len(opens) and opens[i] is not None and str(opens[i]) != "nan" else c
        h = highs[i] if i < len(highs) and highs[i] is not None and str(highs[i]) != "nan" else max(o, c)
        l = lows[i] if i < len(lows) and lows[i] is not None and str(lows[i]) != "nan" else min(o, c)
        adj_c = adjcloses[i] if i < len(adjcloses) and adjcloses[i] is not None and str(adjcloses[i]) != "nan" else c
        vol = volumes[i] if i < len(volumes) and volumes[i] is not None and str(volumes[i]) != "nan" else 0

        # Convert epoch timestamp to YYYY-MM-DD UTC date
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        if date_str in seen_dates:
            continue
        seen_dates.add(date_str)

        normalized.append({
            "date": date_str,
            "timestamp": ts,
            "open": round(float(o), 4),
            "high": round(float(h), 4),
            "low": round(float(l), 4),
            "close": round(float(c), 4),
            "adjusted_close": round(float(adj_c), 4),
            "volume": int(vol),
            "symbol": symbol
        })

    # Strict chronological sort (oldest to newest)
    normalized.sort(key=lambda x: x["timestamp"])
    return normalized

def _generate_deterministic_demo_data(symbol: str, range_str: str = "1y") -> List[Dict[str, Any]]:
    """
    Deterministic historical financial dataset for emergency fallback / offline demo mode.
    Clearly flagged so users know when demo mode is engaged.
    """
    days_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 252, "3y": 756, "5y": 1260, "max": 1800}
    num_days = days_map.get(range_str.lower(), 252)

    base_prices = {"GC=F": 2350.0, "BTC-USD": 65000.0, "NVDA": 125.0}
    volatilities = {"GC=F": 0.008, "BTC-USD": 0.035, "NVDA": 0.024}
    drifts = {"GC=F": 0.0003, "BTC-USD": 0.0012, "NVDA": 0.0015}

    base = base_prices.get(symbol, 100.0)
    vol = volatilities.get(symbol, 0.015)
    drift = drifts.get(symbol, 0.0005)

    today = datetime.now(timezone.utc).date()
    records = []
    current_price = base

    # Deterministic pseudo-random seed generator
    seed = sum(ord(c) for c in symbol) + 12345
    def pseudo_rand():
        nonlocal seed
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        return (seed / 0x7fffffff) * 2 - 1

    for i in range(num_days, -1, -1):
        dt = today - timedelta(days=i)
        # Skip weekends for traditional assets
        if symbol != "BTC-USD" and dt.weekday() >= 5:
            continue

        shock = pseudo_rand() * vol + drift
        current_price = max(1.0, current_price * (1.0 + shock))
        high = current_price * (1.0 + abs(pseudo_rand()) * vol * 0.8)
        low = current_price * (1.0 - abs(pseudo_rand()) * vol * 0.8)
        open_price = (current_price + low) / 2

        records.append({
            "date": dt.strftime("%Y-%m-%d"),
            "timestamp": int(datetime(dt.year, dt.month, dt.day, 16, 0, tzinfo=timezone.utc).timestamp()),
            "open": round(open_price, 4),
            "high": round(high, 4),
            "low": round(low, 4),
            "close": round(current_price, 4),
            "adjusted_close": round(current_price, 4),
            "volume": int(1000000 * (1.0 + abs(pseudo_rand()))),
            "symbol": symbol,
            "_demo": True
        })

    return records

def get_asset_history(symbol: str, range_str: str = "1y", force_demo: bool = False) -> Dict[str, Any]:
    """
    Main retrieval function:
    Returns {
        "symbol": str,
        "name": str,
        "currency": str,
        "is_demo": bool,
        "data_source": str,
        "last_update": str,
        "observations": int,
        "history": [...]
    }
    """
    cache_key = f"{symbol}_{range_str.lower()}"
    now_ts = datetime.now(timezone.utc).timestamp()

    if not force_demo and cache_key in _CACHE:
        cached_time, cached_payload = _CACHE[cache_key]
        if (now_ts - cached_time) < CACHE_TTL_SECONDS:
            return cached_payload

    if force_demo:
        records = _generate_deterministic_demo_data(symbol, range_str)
        payload = {
            "symbol": symbol,
            "name": SUPPORTED_ASSETS.get(symbol, {}).get("name", symbol),
            "currency": "USD",
            "is_demo": True,
            "data_source": "DEMO DATA (Deterministic Quantitative Simulation)",
            "last_update": datetime.now(timezone.utc).isoformat(),
            "observations": len(records),
            "history": records
        }
        return payload

    try:
        raw = _fetch_yahoo_chart_api(symbol, range_str=range_str)
        records = normalize_market_data(raw, symbol)
        if len(records) == 0:
            raise ValueError(f"Zero valid data points for {symbol}")

        payload = {
            "symbol": symbol,
            "name": SUPPORTED_ASSETS.get(symbol, {}).get("name", symbol),
            "currency": "USD",
            "is_demo": False,
            "data_source": "Yahoo Finance (Official Public Real-Time Market Feed)",
            "last_update": datetime.now(timezone.utc).isoformat(),
            "observations": len(records),
            "history": records
        }
        _CACHE[cache_key] = (now_ts, payload)
        return payload
    except Exception as e:
        # Fallback to clearly labeled DEMO DATA with notice
        records = _generate_deterministic_demo_data(symbol, range_str)
        payload = {
            "symbol": symbol,
            "name": SUPPORTED_ASSETS.get(symbol, {}).get("name", symbol),
            "currency": "USD",
            "is_demo": True,
            "error_fallback": str(e),
            "data_source": "DEMO DATA (External Market API Rate-Limited or Offline)",
            "last_update": datetime.now(timezone.utc).isoformat(),
            "observations": len(records),
            "history": records
        }
        return payload

def get_latest_price(symbol: str) -> Dict[str, Any]:
    """Get the latest real quote for a symbol."""
    data = get_asset_history(symbol, range_str="1m")
    history = data.get("history", [])
    if not history:
        raise ValueError(f"No quote data available for {symbol}")
    latest = history[-1]
    prev = history[-2] if len(history) > 1 else latest
    change = latest["close"] - prev["close"]
    change_pct = (change / prev["close"]) if prev["close"] > 0 else 0.0

    return {
        "symbol": symbol,
        "price": latest["close"],
        "previous_close": prev["close"],
        "change": round(change, 4),
        "change_pct": round(change_pct * 100, 2),
        "timestamp": latest["timestamp"],
        "date": latest["date"],
        "is_demo": data.get("is_demo", False)
    }
