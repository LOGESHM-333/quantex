"""
QUANTX Quantitative Analysis Engine
Pure deterministic implementation of financial mathematics:
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Daily & Cumulative Returns
- Historical & Annualized Volatility
- Sharpe Ratio (configurable risk-free rate)
- Maximum Drawdown (peak-to-trough) & Underwater Curve
- Rolling Returns, Rolling Volatility, Rolling Sharpe
- Pearson Correlation & Rolling Correlation
"""

import math
from typing import List, Dict, Optional, Tuple, Any

def calculate_sma(prices: List[float], period: int) -> List[Optional[float]]:
    """
    Calculates Simple Moving Average over n periods.
    Returns None for indices < period - 1 to prevent look-ahead and incomplete periods.
    """
    if period <= 0:
        raise ValueError("SMA period must be greater than 0")

    result: List[Optional[float]] = []
    window_sum = 0.0

    for i, p in enumerate(prices):
        window_sum += p
        if i >= period:
            window_sum -= prices[i - period]
        if i >= period - 1:
            result.append(round(window_sum / period, 4))
        else:
            result.append(None)

    return result

def calculate_ema(prices: List[float], period: int) -> List[Optional[float]]:
    """
    Calculates Exponentially Weighted Moving Average (EMA).
    Multiplier alpha = 2 / (period + 1)
    Initial EMA is seeded with the SMA of the first 'period' elements.
    """
    if period <= 0:
        raise ValueError("EMA period must be greater than 0")
    if len(prices) < period:
        return [None] * len(prices)

    result: List[Optional[float]] = [None] * (period - 1)
    # Seed with SMA of first 'period' elements
    initial_sma = sum(prices[:period]) / period
    result.append(round(initial_sma, 4))

    alpha = 2.0 / (period + 1.0)
    current_ema = initial_sma

    for i in range(period, len(prices)):
        current_ema = (prices[i] * alpha) + (current_ema * (1.0 - alpha))
        result.append(round(current_ema, 4))

    return result

def calculate_daily_returns(prices: List[float]) -> List[float]:
    """
    Daily Return: R_t = Price_t / Price_{t-1} - 1
    The first element is 0.0 by definition.
    """
    if len(prices) <= 1:
        return [0.0] * len(prices)

    returns = [0.0]
    for i in range(1, len(prices)):
        prev = prices[i - 1]
        if prev > 0:
            returns.append((prices[i] / prev) - 1.0)
        else:
            returns.append(0.0)
    return returns

def calculate_cumulative_returns(prices: List[float]) -> List[float]:
    """
    Cumulative return from inception: (Price_t - Price_0) / Price_0
    """
    if not prices or prices[0] == 0:
        return [0.0] * len(prices)
    base = prices[0]
    return [round((p / base) - 1.0, 6) for p in prices]

def calculate_sample_std(values: List[float]) -> float:
    """Calculates sample standard deviation (ddof=1)."""
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    return math.sqrt(max(0.0, variance))

def calculate_annualized_volatility(daily_returns: List[float], trading_days: int = 252) -> float:
    """
    Annualized Volatility = daily_std * sqrt(trading_days)
    Standard equity convention: 252 days
    Crypto convention: 365 days
    """
    # Exclude initial 0.0 if present and count actual return days
    non_zero_returns = daily_returns[1:] if len(daily_returns) > 1 else daily_returns
    daily_std = calculate_sample_std(non_zero_returns)
    return round(daily_std * math.sqrt(trading_days), 4)

def calculate_annualized_return(prices: List[float], trading_days: int = 252) -> float:
    """
    Compound Annual Growth Rate (CAGR) / Annualized Return:
    CAGR = (Price_end / Price_start) ** (trading_days / num_trading_days) - 1
    """
    if len(prices) < 2 or prices[0] <= 0:
        return 0.0
    total_return = (prices[-1] / prices[0]) - 1.0
    num_days = len(prices) - 1
    if num_days == 0:
        return 0.0

    years = num_days / trading_days
    if years <= 0:
        return total_return

    try:
        # (1 + TotalReturn) ** (1 / years) - 1
        val = prices[-1] / prices[0]
        if val > 0:
            cagr = (val ** (1.0 / years)) - 1.0
            return round(cagr, 4)
        return -1.0
    except (ValueError, OverflowError):
        return round(total_return, 4)

def calculate_sharpe_ratio(annualized_return: float, annualized_volatility: float, risk_free_rate: float = 0.0) -> float:
    """
    Sharpe Ratio: (Annualized Return - Risk Free Rate) / Annualized Volatility
    Returns 0.0 if volatility is zero.
    """
    if annualized_volatility <= 0:
        return 0.0
    return round((annualized_return - risk_free_rate) / annualized_volatility, 4)

def calculate_max_drawdown(prices: List[float]) -> Tuple[float, List[float]]:
    """
    Calculates historical maximum drawdown from previous peak:
    DD_t = (Peak_t - Price_t) / Peak_t
    Returns (max_drawdown, list_of_drawdowns_at_each_step)
    """
    if not prices:
        return 0.0, []

    drawdowns: List[float] = []
    peak = prices[0]
    max_dd = 0.0

    for p in prices:
        if p > peak:
            peak = p
        dd = (peak - p) / peak if peak > 0 else 0.0
        drawdowns.append(round(dd, 4))
        if dd > max_dd:
            max_dd = dd

    return round(max_dd, 4), drawdowns

def calculate_rolling_volatility(daily_returns: List[float], window: int = 30, trading_days: int = 252) -> List[Optional[float]]:
    """Rolling annualized volatility series."""
    result: List[Optional[float]] = []
    sqrt_factor = math.sqrt(trading_days)

    for i in range(len(daily_returns)):
        if i < window:
            result.append(None)
        else:
            w_returns = daily_returns[i - window + 1 : i + 1]
            std = calculate_sample_std(w_returns)
            result.append(round(std * sqrt_factor, 4))

    return result

def calculate_correlation(series_a: List[float], series_b: List[float]) -> float:
    """
    Calculates Pearson correlation coefficient between two numeric return series:
    r = sum((x - mx)*(y - my)) / (sqrt(sum((x - mx)^2)) * sqrt(sum((y - my)^2)))
    """
    if len(series_a) != len(series_b) or len(series_a) < 2:
        return 0.0

    n = len(series_a)
    mean_a = sum(series_a) / n
    mean_b = sum(series_b) / n

    cov = sum((series_a[i] - mean_a) * (series_b[i] - mean_b) for i in range(n))
    var_a = sum((x - mean_a) ** 2 for x in series_a)
    var_b = sum((y - mean_b) ** 2 for y in series_b)

    denominator = math.sqrt(var_a * var_b)
    if denominator <= 1e-12:
        return 0.0

    corr = cov / denominator
    # Bound to [-1.0, 1.0] to eliminate floating rounding errors
    return round(max(-1.0, min(1.0, corr)), 4)

def calculate_rolling_correlation(series_a: List[float], series_b: List[float], window: int = 60) -> List[Optional[float]]:
    """Rolling correlation between two return series over a rolling window."""
    min_len = min(len(series_a), len(series_b))
    result: List[Optional[float]] = []

    for i in range(min_len):
        if i < window - 1:
            result.append(None)
        else:
            w_a = series_a[i - window + 1 : i + 1]
            w_b = series_b[i - window + 1 : i + 1]
            r = calculate_correlation(w_a, w_b)
            result.append(r)

    return result

def calculate_comprehensive_metrics(history: List[Dict[str, Any]], symbol: str, risk_free_rate: float = 0.0) -> Dict[str, Any]:
    """
    Calculates full statistical profile for an asset over historical records.
    """
    if not history:
        raise ValueError(f"No history provided for {symbol}")

    closes = [item["close"] for item in history]
    dates = [item["date"] for item in history]
    daily_returns = calculate_daily_returns(closes)

    # Determine trading days convention: 365 for BTC, 252 for Gold and Equities
    trading_days = 365 if "BTC" in symbol else 252

    total_return = (closes[-1] / closes[0]) - 1.0 if closes[0] > 0 else 0.0
    ann_return = calculate_annualized_return(closes, trading_days=trading_days)
    ann_vol = calculate_annualized_volatility(daily_returns, trading_days=trading_days)
    sharpe = calculate_sharpe_ratio(ann_return, ann_vol, risk_free_rate=risk_free_rate)
    max_dd, dd_curve = calculate_max_drawdown(closes)

    # Daily return stats
    valid_returns = daily_returns[1:] if len(daily_returns) > 1 else daily_returns
    best_day = max(valid_returns) if valid_returns else 0.0
    worst_day = min(valid_returns) if valid_returns else 0.0
    avg_daily_return = sum(valid_returns) / len(valid_returns) if valid_returns else 0.0

    # Moving Averages
    sma_20 = calculate_sma(closes, 20)
    sma_50 = calculate_sma(closes, 50)
    sma_200 = calculate_sma(closes, 200)
    ema_20 = calculate_ema(closes, 20)
    ema_50 = calculate_ema(closes, 50)

    # Rolling 30D volatility
    rolling_vol_30 = calculate_rolling_volatility(daily_returns, window=30, trading_days=trading_days)

    return {
        "symbol": symbol,
        "observations": len(history),
        "start_date": dates[0],
        "end_date": dates[-1],
        "current_price": closes[-1],
        "total_return": round(total_return, 4),
        "total_return_pct": round(total_return * 100, 2),
        "annualized_return": ann_return,
        "annualized_return_pct": round(ann_return * 100, 2),
        "annualized_volatility": ann_vol,
        "annualized_volatility_pct": round(ann_vol * 100, 2),
        "sharpe_ratio": sharpe,
        "max_drawdown": max_dd,
        "max_drawdown_pct": round(max_dd * 100, 2),
        "best_day_pct": round(best_day * 100, 2),
        "worst_day_pct": round(worst_day * 100, 2),
        "avg_daily_return_pct": round(avg_daily_return * 100, 3),
        "trading_days_convention": trading_days,
        "sma_20": sma_20,
        "sma_50": sma_50,
        "sma_200": sma_200,
        "ema_20": ema_20,
        "ema_50": ema_50,
        "drawdown_curve": dd_curve,
        "rolling_vol_30": rolling_vol_30,
        "daily_returns": [round(r, 6) for r in daily_returns]
    }
