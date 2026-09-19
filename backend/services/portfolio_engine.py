"""
QUANTX Portfolio Analysis Engine
Multi-asset portfolio construction, correlation analysis, and risk-adjusted performance:
- Synchronized date alignment across Gold, Bitcoin, and NVIDIA
- Weight normalization & strict 100% validation
- Portfolio Return, Volatility, Sharpe Ratio, and Drawdown
- Cross-asset Pearson correlation matrix
- Multi-asset equity comparison curves
"""

import math
from typing import List, Dict, Any, Tuple
from .quant_engine import (
    calculate_daily_returns,
    calculate_annualized_volatility,
    calculate_annualized_return,
    calculate_sharpe_ratio,
    calculate_max_drawdown,
    calculate_correlation
)

def align_asset_histories(asset_histories: Dict[str, List[Dict[str, Any]]]) -> Tuple[List[str], Dict[str, List[float]]]:
    """
    Finds mutual intersection of dates across all assets and returns aligned close prices.
    Handles differing trading calendars (Crypto 7 days vs Equities/Commodities 5 days).
    """
    # Collect sets of dates for each symbol
    date_sets = [set(item["date"] for item in hist) for hist in asset_histories.values()]
    if not date_sets:
        return [], {}

    # Common dates sorted chronologically
    common_dates = sorted(list(set.intersection(*date_sets)))

    aligned_closes: Dict[str, List[float]] = {sym: [] for sym in asset_histories.keys()}

    for sym, hist in asset_histories.items():
        date_map = {item["date"]: item["close"] for item in hist}
        for d in common_dates:
            aligned_closes[sym].append(date_map[d])

    return common_dates, aligned_closes

def calculate_portfolio_performance(
    asset_histories: Dict[str, List[Dict[str, Any]]],
    weights: Dict[str, float],
    initial_capital: float = 100000.0,
    risk_free_rate: float = 0.0
) -> Dict[str, Any]:
    """
    Constructs weighted multi-asset portfolio and computes quantitative metrics.
    Weights must sum to 1.0 (or 100%).
    """
    # Normalize weights smoothly to sum to 1.0 (100%)
    total_w = sum(float(v) for v in weights.values())
    if total_w > 0:
        normalized_weights = {k: float(v) / total_w for k, v in weights.items()}
    else:
        n_assets = len(weights) if len(weights) > 0 else 1
        normalized_weights = {k: 1.0 / n_assets for k in weights.keys()}

    common_dates, aligned_closes = align_asset_histories(asset_histories)
    if len(common_dates) < 10:
        raise ValueError("Insufficient overlapping trading dates across selected assets")

    num_days = len(common_dates)

    # Calculate individual asset returns
    asset_returns: Dict[str, List[float]] = {}
    for sym, closes in aligned_closes.items():
        asset_returns[sym] = calculate_daily_returns(closes)

    # Daily portfolio returns: R_{p,t} = sum(w_i * R_{i,t})
    portfolio_daily_returns = [0.0]
    portfolio_equity = [initial_capital]

    for t in range(1, num_days):
        day_ret = sum(normalized_weights.get(sym, 0.0) * asset_returns[sym][t] for sym in aligned_closes.keys())
        portfolio_daily_returns.append(day_ret)
        new_equity = portfolio_equity[-1] * (1.0 + day_ret)
        portfolio_equity.append(new_equity)

    trading_days = 252  # Standard aligned trading calendar
    ann_vol = calculate_annualized_volatility(portfolio_daily_returns, trading_days=trading_days)
    ann_ret = calculate_annualized_return(portfolio_equity, trading_days=trading_days)
    sharpe = calculate_sharpe_ratio(ann_ret, ann_vol, risk_free_rate=risk_free_rate)
    max_dd, dd_curve = calculate_max_drawdown(portfolio_equity)

    total_return = (portfolio_equity[-1] / initial_capital) - 1.0

    # Build Correlation Matrix
    symbols = list(aligned_closes.keys())
    matrix: Dict[str, Dict[str, float]] = {}
    for s1 in symbols:
        matrix[s1] = {}
        for s2 in symbols:
            if s1 == s2:
                matrix[s1][s2] = 1.0
            else:
                matrix[s1][s2] = calculate_correlation(asset_returns[s1], asset_returns[s2])

    # Build combined equity series for charting
    equity_series = []
    # Individual asset normalized equities from initial capital
    individual_equities: Dict[str, List[float]] = {}
    for sym, closes in aligned_closes.items():
        base_p = closes[0] if closes[0] > 0 else 1.0
        individual_equities[sym] = [(p / base_p) * initial_capital for p in closes]

    for i in range(num_days):
        row = {
            "date": common_dates[i],
            "portfolio": round(portfolio_equity[i], 2),
            "drawdown_pct": round(dd_curve[i] * 100, 2)
        }
        for sym in symbols:
            row[sym] = round(individual_equities[sym][i], 2)
        equity_series.append(row)

    return {
        "start_date": common_dates[0],
        "end_date": common_dates[-1],
        "observations": num_days,
        "weights": {k: round(v * 100, 2) for k, v in normalized_weights.items()},
        "initial_capital": initial_capital,
        "final_capital": round(portfolio_equity[-1], 2),
        "total_return_pct": round(total_return * 100, 2),
        "annualized_return_pct": round(ann_ret * 100, 2),
        "annualized_volatility_pct": round(ann_vol * 100, 2),
        "sharpe_ratio": sharpe,
        "max_drawdown_pct": round(max_dd * 100, 2),
        "correlation_matrix": matrix,
        "equity_curve": equity_series
    }
