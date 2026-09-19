"""
QUANTX High Volatility Spike Detection Engine
Pure deterministic quantitative comparison of short-term rolling volatility
against longer-term historical baseline volatility across all supported assets.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from backend.services.market_data import SUPPORTED_ASSETS, get_asset_history
from backend.services.quant_engine import (
    calculate_daily_returns,
    calculate_annualized_volatility
)

DEFAULT_THRESHOLDS = {
    "elevated": 1.25,
    "high": 1.50,
    "critical": 2.00
}

def analyze_asset_volatility_spike(
    symbol: str,
    short_window: int = 14,
    baseline_window: int = 120,
    thresholds: Optional[Dict[str, float]] = None,
    force_demo: bool = False
) -> Dict[str, Any]:
    """
    Calculates the real-time volatility spike ratio for a single asset:
    Spike Ratio = Current Short-Term Volatility / Historical Baseline Volatility
    """
    thresh = thresholds or DEFAULT_THRESHOLDS
    meta = SUPPORTED_ASSETS.get(symbol, {
        "symbol": symbol,
        "name": symbol,
        "trading_days_per_year": 252
    })
    trading_days = meta.get("trading_days_per_year", 252)

    data = get_asset_history(symbol, range_str="1y", force_demo=force_demo)
    history = data.get("history", [])
    is_demo = data.get("is_demo", False)

    if not history or len(history) < 20:
        return {
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "current_volatility_pct": 0.0,
            "baseline_volatility_pct": 0.0,
            "spike_ratio": 1.0,
            "severity": "NORMAL",
            "alert": False,
            "message": "Insufficient market data points for volatility calculation.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_demo": is_demo,
            "data_source": data.get("data_source", "Unknown")
        }

    prices = [h["close"] for h in history]
    daily_returns = calculate_daily_returns(prices)

    short_slice = daily_returns[-short_window:] if len(daily_returns) >= short_window else daily_returns
    current_vol = calculate_annualized_volatility(short_slice, trading_days=trading_days)

    baseline_slice = daily_returns[-baseline_window:] if len(daily_returns) >= baseline_window else daily_returns
    baseline_vol = calculate_annualized_volatility(baseline_slice, trading_days=trading_days)

    safe_baseline = max(baseline_vol, 0.001)
    spike_ratio = current_vol / safe_baseline

    elevated_t = thresh.get("elevated", 1.25)
    high_t = thresh.get("high", 1.50)
    critical_t = thresh.get("critical", 2.00)

    asset_name = meta.get("name", symbol)

    if spike_ratio >= critical_t:
        severity = "CRITICAL"
        alert = True
        message = f"Critical volatility spike detected for {asset_name}. Current volatility is {spike_ratio:.2f}x historical baseline."
    elif spike_ratio >= high_t:
        severity = "HIGH"
        alert = True
        message = f"High volatility spike detected for {asset_name}. Current volatility is {spike_ratio:.2f}x historical baseline."
    elif spike_ratio >= elevated_t:
        severity = "ELEVATED"
        alert = False
        message = f"Elevated market volatility observed for {asset_name}. Monitoring for potential spike escalation."
    else:
        severity = "NORMAL"
        alert = False
        message = f"Market volatility for {asset_name} is operating within normal historical boundaries."

    return {
        "symbol": symbol,
        "name": asset_name,
        "current_volatility_pct": round(current_vol * 100.0, 2),
        "baseline_volatility_pct": round(baseline_vol * 100.0, 2),
        "spike_ratio": round(spike_ratio, 2),
        "severity": severity,
        "alert": alert,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_demo": is_demo,
        "data_source": data.get("data_source", "Yahoo Finance")
    }

def detect_all_volatility_spikes(
    thresholds: Optional[Dict[str, float]] = None,
    force_demo: bool = False
) -> Dict[str, Any]:
    """
    Analyzes volatility spikes across all universe assets independently.
    """
    thresh = thresholds or DEFAULT_THRESHOLDS
    results = []
    highest_severity = "NORMAL"
    active_spike = None

    severity_order = {"NORMAL": 0, "ELEVATED": 1, "HIGH": 2, "CRITICAL": 3}

    for sym in SUPPORTED_ASSETS.keys():
        res = analyze_asset_volatility_spike(
            symbol=sym,
            thresholds=thresh,
            force_demo=force_demo
        )
        results.append(res)

        if severity_order.get(res["severity"], 0) > severity_order.get(highest_severity, 0):
            highest_severity = res["severity"]
            if res["alert"]:
                active_spike = res

    return {
        "status": "success",
        "assets": results,
        "active_spike": active_spike,
        "highest_severity": highest_severity,
        "has_active_alert": highest_severity in ("HIGH", "CRITICAL"),
        "last_update": datetime.now(timezone.utc).isoformat(),
        "thresholds": thresh
    }

