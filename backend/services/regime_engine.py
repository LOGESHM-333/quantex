"""
QUANTX Market Regime Engine
Deterministic classification of market environments:
- BULL: Price above Long-Term Moving Average (default SMA 200 / 50)
- BEAR: Price below Long-Term Moving Average
- HIGH VOLATILITY: Rolling volatility >= 75th percentile
- LOW VOLATILITY: Rolling volatility <= 25th percentile

Calculates performance attribution across each detected regime.
"""

import math
from typing import List, Dict, Any, Optional
from .quant_engine import calculate_sma, calculate_daily_returns, calculate_sample_std

def _percentile(values: List[float], pct: float) -> float:
    """Calculates empirical percentile (0 to 100)."""
    if not values:
        return 0.0
    sorted_v = sorted(values)
    k = (len(sorted_v) - 1) * (pct / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_v[int(k)]
    d0 = sorted_v[int(f)] * (c - k)
    d1 = sorted_v[int(c)] * (k - f)
    return d0 + d1

def detect_regimes(
    history: List[Dict[str, Any]],
    symbol: str,
    ma_period: int = 200,
    vol_window: int = 30,
    high_vol_percentile: float = 75.0,
    low_vol_percentile: float = 25.0
) -> Dict[str, Any]:
    """
    Classifies every trading period into regimes and generates attribution metrics.
    """
    n = len(history)
    closes = [item["close"] for item in history]
    dates = [item["date"] for item in history]

    # Adjust MA period if history is shorter than 200
    actual_ma_period = ma_period if n >= ma_period else max(20, n // 3)
    sma_lt = calculate_sma(closes, actual_ma_period)

    daily_returns = calculate_daily_returns(closes)
    trading_days = 365 if "BTC" in symbol else 252
    sqrt_factor = math.sqrt(trading_days)

    # Compute rolling volatilities
    rolling_vols: List[Optional[float]] = []
    valid_vols: List[float] = []

    for i in range(n):
        if i < vol_window:
            rolling_vols.append(None)
        else:
            w = daily_returns[i - vol_window + 1 : i + 1]
            ann_vol = calculate_sample_std(w) * sqrt_factor
            rolling_vols.append(ann_vol)
            valid_vols.append(ann_vol)

    high_vol_threshold = _percentile(valid_vols, high_vol_percentile) if valid_vols else 0.30
    low_vol_threshold = _percentile(valid_vols, low_vol_percentile) if valid_vols else 0.15

    regime_series: List[Dict[str, Any]] = []

    regime_buckets = {
        "BULL": {"returns": [], "dates": [], "close_prices": []},
        "BEAR": {"returns": [], "dates": [], "close_prices": []},
        "HIGH_VOLATILITY": {"returns": [], "dates": [], "close_prices": []},
        "LOW_VOLATILITY": {"returns": [], "dates": [], "close_prices": []},
    }

    for i in range(n):
        p = closes[i]
        d_ret = daily_returns[i]
        date_str = dates[i]
        ma_val = sma_lt[i]
        vol_val = rolling_vols[i]

        trend_regime = "NEUTRAL"
        if ma_val is not None:
            trend_regime = "BULL" if p >= ma_val else "BEAR"

        vol_regime = "NORMAL_VOL"
        if vol_val is not None:
            if vol_val >= high_vol_threshold:
                vol_regime = "HIGH_VOLATILITY"
            elif vol_val <= low_vol_threshold:
                vol_regime = "LOW_VOLATILITY"

        # Record to buckets
        if trend_regime in regime_buckets:
            regime_buckets[trend_regime]["returns"].append(d_ret)
            regime_buckets[trend_regime]["dates"].append(date_str)
            regime_buckets[trend_regime]["close_prices"].append(p)

        if vol_regime in regime_buckets:
            regime_buckets[vol_regime]["returns"].append(d_ret)
            regime_buckets[vol_regime]["dates"].append(date_str)
            regime_buckets[vol_regime]["close_prices"].append(p)

        regime_series.append({
            "date": date_str,
            "timestamp": history[i]["timestamp"],
            "price": p,
            "trend_regime": trend_regime,
            "vol_regime": vol_regime,
            "ma_value": ma_val,
            "rolling_vol": round(vol_val * 100, 2) if vol_val is not None else None
        })

    # Regime performance attribution
    performance_by_regime = {}
    for r_name, data in regime_buckets.items():
        ret_list = data["returns"]
        count = len(ret_list)
        pct_of_time = (count / n) * 100 if n > 0 else 0.0

        if count > 0:
            # Cumulative return during this regime: product(1 + r) - 1
            cum_ret = 1.0
            for r in ret_list:
                cum_ret *= (1.0 + r)
            total_ret_pct = round((cum_ret - 1.0) * 100, 2)

            # Volatility in regime
            daily_std = calculate_sample_std(ret_list)
            ann_vol = round(daily_std * sqrt_factor * 100, 2)

            # Mean daily return
            mean_ret = sum(ret_list) / count
            ann_ret = (cum_ret ** (trading_days / max(1, count))) - 1.0 if cum_ret > 0 else -1.0
            ann_ret_pct = round(ann_ret * 100, 2)

            sharpe = round((ann_ret / (daily_std * sqrt_factor)), 2) if (daily_std * sqrt_factor) > 0 else 0.0

            # Max drawdown inside regime series
            prices = data["close_prices"]
            peak = prices[0] if prices else 1.0
            max_dd = 0.0
            for px in prices:
                if px > peak:
                    peak = px
                dd = (peak - px) / peak if peak > 0 else 0.0
                if dd > max_dd:
                    max_dd = dd

            performance_by_regime[r_name] = {
                "regime": r_name,
                "days_count": count,
                "pct_of_time": round(pct_of_time, 1),
                "total_return_pct": total_ret_pct,
                "annualized_return_pct": ann_ret_pct,
                "annualized_volatility_pct": ann_vol,
                "sharpe_ratio": sharpe,
                "max_drawdown_pct": round(max_dd * 100, 2)
            }
        else:
            performance_by_regime[r_name] = {
                "regime": r_name,
                "days_count": 0,
                "pct_of_time": 0.0,
                "total_return_pct": 0.0,
                "annualized_return_pct": 0.0,
                "annualized_volatility_pct": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown_pct": 0.0
            }

    return {
        "symbol": symbol,
        "ma_period_used": actual_ma_period,
        "high_vol_threshold_pct": round(high_vol_threshold * 100, 2),
        "low_vol_threshold_pct": round(low_vol_threshold * 100, 2),
        "performance_by_regime": performance_by_regime,
        "timeline": regime_series
    }
