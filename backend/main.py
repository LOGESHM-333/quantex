"""
QUANTX Backend Main Entry Point
Can be executed as:
1. Python REST API Server: python3 backend/main.py --server --port 8000
2. CLI Command Runner: python3 backend/main.py <command> <json_args>
"""

import sys
import os
import json
import argparse

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.market_data import (
    SUPPORTED_ASSETS,
    get_asset_history,
    get_latest_price
)
from backend.services.quant_engine import (
    calculate_comprehensive_metrics,
    calculate_correlation
)
from backend.services.backtest_engine import (
    run_backtest,
    run_robustness_grid
)
from backend.services.regime_engine import detect_regimes
from backend.services.portfolio_engine import calculate_portfolio_performance
from backend.services.volatility_spike import detect_all_volatility_spikes

STRATEGIES_CATALOG = [
    {
        "code": "SMA_CROSSOVER",
        "name": "SMA Crossover Trend Strategy",
        "description": "Dual Moving Average trend filter. Buys when Fast SMA crosses above Slow SMA; exits to cash when Fast SMA falls below Slow SMA.",
        "parameters": [
            {"name": "fast_period", "label": "Fast SMA Period", "type": "number", "default": 20, "min": 5, "max": 100},
            {"name": "slow_period", "label": "Slow SMA Period", "type": "number", "default": 50, "min": 10, "max": 250}
        ]
    },
    {
        "code": "EMA_TREND",
        "name": "EMA Exponential Trend Strategy",
        "description": "Fast Exponential Moving Average crossing Slow EMA. Gives higher weight to recent prices for faster trend identification.",
        "parameters": [
            {"name": "fast_period", "label": "Fast EMA Period", "type": "number", "default": 12, "min": 3, "max": 60},
            {"name": "slow_period", "label": "Slow EMA Period", "type": "number", "default": 26, "min": 10, "max": 150}
        ]
    },
    {
        "code": "MOMENTUM",
        "name": "Lookback Momentum Strategy",
        "description": "Calculates N-day price momentum. Goes long when rate of change exceeds threshold; closes position when momentum drops below threshold.",
        "parameters": [
            {"name": "lookback_period", "label": "Lookback (Days)", "type": "number", "default": 20, "min": 5, "max": 120},
            {"name": "threshold_pct", "label": "Entry Threshold (e.g. 0.02 = 2%)", "type": "number", "default": 0.02, "min": -0.05, "max": 0.20, "step": 0.005}
        ]
    },
    {
        "code": "MEAN_REVERSION",
        "name": "Statistical Mean Reversion (Z-Score)",
        "description": "Detects statistical overextensions using rolling standard deviation. Enters when price is oversold relative to rolling mean; exits as price mean-reverts.",
        "parameters": [
            {"name": "lookback_period", "label": "Lookback Period", "type": "number", "default": 20, "min": 5, "max": 60},
            {"name": "z_entry", "label": "Z-Score Entry (Oversold)", "type": "number", "default": -1.5, "min": -3.0, "max": -0.5, "step": 0.1},
            {"name": "z_exit", "label": "Z-Score Exit (Reversion Target)", "type": "number", "default": 0.5, "min": -0.5, "max": 2.0, "step": 0.1}
        ]
    }
]

def dispatch_command(cmd: str, payload: dict) -> dict:
    """Dispatches a quantitative finance API command and returns the calculated response."""
    if cmd == "get_assets":
        assets = []
        for sym, meta in SUPPORTED_ASSETS.items():
            quote = get_latest_price(sym)
            assets.append({**meta, "quote": quote})
        return {"status": "success", "assets": assets}

    elif cmd == "get_history":
        symbol = payload.get("symbol", "NVDA")
        range_str = payload.get("range", "1y")
        force_demo = payload.get("force_demo", False)
        return get_asset_history(symbol, range_str=range_str, force_demo=force_demo)

    elif cmd == "get_metrics":
        symbol = payload.get("symbol", "NVDA")
        range_str = payload.get("range", "1y")
        force_demo = payload.get("force_demo", False)
        data = get_asset_history(symbol, range_str=range_str, force_demo=force_demo)
        metrics = calculate_comprehensive_metrics(data["history"], symbol)
        return {
            "status": "success",
            "symbol": symbol,
            "is_demo": data.get("is_demo", False),
            "data_source": data.get("data_source"),
            "last_update": data.get("last_update"),
            "metrics": metrics
        }

    elif cmd == "get_correlation":
        range_str = payload.get("range", "1y")
        window = int(payload.get("window", 60))
        force_demo = payload.get("force_demo", False)

        symbols = ["GC=F", "BTC-USD", "NVDA"]
        histories = {s: get_asset_history(s, range_str=range_str, force_demo=force_demo)["history"] for s in symbols}

        # Date intersection
        date_sets = [set(x["date"] for x in h) for h in histories.values()]
        common_dates = sorted(list(set.intersection(*date_sets)))

        returns_by_sym = {}
        for s in symbols:
            d_map = {x["date"]: x["close"] for x in histories[s]}
            prices = [d_map[d] for d in common_dates]
            # daily returns
            rets = [0.0]
            for i in range(1, len(prices)):
                prev = prices[i-1]
                rets.append((prices[i]/prev - 1.0) if prev > 0 else 0.0)
            returns_by_sym[s] = rets

        matrix = {}
        for s1 in symbols:
            matrix[s1] = {}
            for s2 in symbols:
                if s1 == s2:
                    matrix[s1][s2] = 1.0
                else:
                    matrix[s1][s2] = calculate_correlation(returns_by_sym[s1], returns_by_sym[s2])

        # Rolling correlations between pairs
        rolling_series = []
        for i in range(len(common_dates)):
            if i < window:
                continue
            w_btc = returns_by_sym["BTC-USD"][i - window + 1 : i + 1]
            w_nvda = returns_by_sym["NVDA"][i - window + 1 : i + 1]
            w_gold = returns_by_sym["GC=F"][i - window + 1 : i + 1]

            rolling_series.append({
                "date": common_dates[i],
                "btc_nvda": calculate_correlation(w_btc, w_nvda),
                "gold_btc": calculate_correlation(w_gold, w_btc),
                "gold_nvda": calculate_correlation(w_gold, w_nvda)
            })

        return {
            "status": "success",
            "matrix": matrix,
            "rolling_series": rolling_series,
            "observations": len(common_dates),
            "start_date": common_dates[0] if common_dates else "",
            "end_date": common_dates[-1] if common_dates else ""
        }

    elif cmd == "get_strategies":
        return {"status": "success", "strategies": STRATEGIES_CATALOG}

    elif cmd == "run_backtest":
        symbol = payload.get("symbol", "NVDA")
        range_str = payload.get("range", "1y")
        strategy = payload.get("strategy", "SMA_CROSSOVER")
        parameters = payload.get("parameters", {"fast_period": 20, "slow_period": 50})
        initial_capital = float(payload.get("initial_capital", 100000.0))
        transaction_cost_pct = float(payload.get("transaction_cost", 0.0010)) # 0.1%
        position_size_pct = float(payload.get("position_size", 1.0)) # 100%
        stop_loss_pct = float(payload.get("stop_loss_pct", 0.0))
        take_profit_pct = float(payload.get("take_profit_pct", 0.0))
        force_demo = payload.get("force_demo", False)

        hist = get_asset_history(symbol, range_str=range_str, force_demo=force_demo)
        result = run_backtest(
            history=hist["history"],
            symbol=symbol,
            strategy=strategy,
            parameters=parameters,
            initial_capital=initial_capital,
            transaction_cost_pct=transaction_cost_pct,
            position_size_pct=position_size_pct,
            stop_loss_pct=stop_loss_pct,
            take_profit_pct=take_profit_pct
        )
        result["is_demo"] = hist.get("is_demo", False)
        result["data_source"] = hist.get("data_source")
        return {"status": "success", "result": result}

    elif cmd == "run_robustness":
        symbol = payload.get("symbol", "NVDA")
        range_str = payload.get("range", "1y")
        force_demo = payload.get("force_demo", False)

        hist = get_asset_history(symbol, range_str=range_str, force_demo=force_demo)
        grid = run_robustness_grid(
            history=hist["history"],
            symbol=symbol
        )
        return {"status": "success", "grid": grid}

    elif cmd == "get_regimes":
        symbol = payload.get("symbol", "NVDA")
        range_str = payload.get("range", "1y")
        ma_period = int(payload.get("ma_period", 200))
        force_demo = payload.get("force_demo", False)

        hist = get_asset_history(symbol, range_str=range_str, force_demo=force_demo)
        regimes = detect_regimes(hist["history"], symbol=symbol, ma_period=ma_period)
        return {"status": "success", "regimes": regimes}

    elif cmd == "analyze_portfolio":
        weights = payload.get("weights", {"GC=F": 33.3, "BTC-USD": 33.3, "NVDA": 33.4})
        range_str = payload.get("range", "1y")
        initial_capital = float(payload.get("initial_capital", 100000.0))
        force_demo = payload.get("force_demo", False)

        histories = {}
        for s in weights.keys():
            h = get_asset_history(s, range_str=range_str, force_demo=force_demo)
            histories[s] = h["history"]

        port = calculate_portfolio_performance(
            asset_histories=histories,
            weights=weights,
            initial_capital=initial_capital
        )
        return {"status": "success", "portfolio": port}

    elif cmd == "get_volatility_spikes":
        thresholds = payload.get("thresholds")
        force_demo = payload.get("force_demo", False)
        return detect_all_volatility_spikes(thresholds=thresholds, force_demo=force_demo)

    else:
        raise ValueError(f"Unknown command: {cmd}")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        cmd = sys.argv[2] if len(sys.argv) > 2 else ""
        payload_str = sys.argv[3] if len(sys.argv) > 3 else "{}"
        if payload_str == "-":
            payload_str = sys.stdin.read()
        elif payload_str.startswith("base64:"):
            import base64
            payload_str = base64.b64decode(payload_str[7:]).decode("utf-8")
        try:
            payload = json.loads(payload_str)
            res = dispatch_command(cmd, payload)
            print(json.dumps(res))
        except Exception as e:
            print(json.dumps({"status": "error", "error": str(e)}))
            sys.exit(1)
    else:
        print("QUANTX Quantitative Intelligence Backend ready.")

if __name__ == "__main__":
    main()
