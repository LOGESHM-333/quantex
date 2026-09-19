"""
QUANTX Backtesting Engine
Provides institutional-grade simulation of quantitative trading strategies:
1. SMA Crossover
2. EMA Trend Strategy
3. Cross-Sectional Momentum
4. Statistical Mean Reversion (Z-Score)

Key Quantitative Rules:
- NO Look-ahead bias: Signal generated from Close price at day T. Trade executed at Day T+1 Open/Execution price.
- Exact Transaction Cost accounting on every Buy and Sell execution.
- Configurable Position Sizing (25%, 50%, 75%, 100%).
- Real Buy & Hold benchmark equity curve generated concurrently over identical date indices.
- Complete trade log with Net PnL, Return %, holding periods, and exit reasons.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from .quant_engine import (
    calculate_sma,
    calculate_ema,
    calculate_daily_returns,
    calculate_annualized_volatility,
    calculate_annualized_return,
    calculate_sharpe_ratio,
    calculate_max_drawdown
)

def _generate_signals(
    history: List[Dict[str, Any]],
    strategy: str,
    params: Dict[str, Any]
) -> List[int]:
    """
    Generates deterministic position signals:
    1 = LONG, 0 = CASH/EXIT
    Signals are based strictly on data available up to day i.
    """
    n = len(history)
    signals = [0] * n
    closes = [item["close"] for item in history]

    strategy_upper = strategy.upper()

    if strategy_upper == "SMA_CROSSOVER":
        fast_p = int(params.get("fast_period", params.get("fast_ma", 20)))
        slow_p = int(params.get("slow_period", params.get("slow_ma", 50)))
        if fast_p >= slow_p:
            raise ValueError(f"Fast SMA ({fast_p}) must be strictly less than Slow SMA ({slow_p})")

        sma_fast = calculate_sma(closes, fast_p)
        sma_slow = calculate_sma(closes, slow_p)

        for i in range(slow_p, n):
            f_val = sma_fast[i]
            s_val = sma_slow[i]
            if f_val is not None and s_val is not None:
                signals[i] = 1 if f_val > s_val else 0

    elif strategy_upper == "EMA_TREND":
        fast_p = int(params.get("fast_period", params.get("fast_ema", 12)))
        slow_p = int(params.get("slow_period", params.get("slow_ema", 26)))
        if fast_p >= slow_p:
            raise ValueError(f"Fast EMA ({fast_p}) must be strictly less than Slow EMA ({slow_p})")

        ema_fast = calculate_ema(closes, fast_p)
        ema_slow = calculate_ema(closes, slow_p)

        for i in range(slow_p, n):
            f_val = ema_fast[i]
            s_val = ema_slow[i]
            if f_val is not None and s_val is not None:
                signals[i] = 1 if f_val > s_val else 0

    elif strategy_upper == "MOMENTUM":
        lookback = int(params.get("lookback_period", params.get("lookback", 20)))
        threshold = float(params.get("threshold_pct", params.get("threshold", 0.02)))

        for i in range(lookback, n):
            prev_price = closes[i - lookback]
            if prev_price > 0:
                momentum = (closes[i] / prev_price) - 1.0
                signals[i] = 1 if momentum > threshold else 0

    elif strategy_upper == "MEAN_REVERSION":
        lookback = int(params.get("lookback_period", params.get("lookback", 20)))
        z_entry = float(params.get("z_entry", -1.5))
        z_exit = float(params.get("z_exit", 0.5))

        sma = calculate_sma(closes, lookback)
        for i in range(lookback, n):
            if sma[i] is None:
                continue
            window = closes[i - lookback + 1 : i + 1]
            mean = sum(window) / lookback
            variance = sum((x - mean) ** 2 for x in window) / (lookback - 1) if lookback > 1 else 0.0
            std = math.sqrt(variance)

            if std > 1e-6:
                z_score = (closes[i] - mean) / std
                # Enter when oversold (z < z_entry), exit when mean restored (z > z_exit)
                if z_score < z_entry:
                    signals[i] = 1
                elif z_score > z_exit:
                    signals[i] = 0
                else:
                    signals[i] = signals[i - 1]  # Hold prior state
    else:
        raise ValueError(f"Unsupported strategy: {strategy}")

    return signals

def run_backtest(
    history: List[Dict[str, Any]],
    symbol: str,
    strategy: str = "SMA_CROSSOVER",
    parameters: Optional[Dict[str, Any]] = None,
    initial_capital: float = 100000.0,
    transaction_cost_pct: float = 0.0010,  # 0.10%
    position_size_pct: float = 1.0,         # 100%
    risk_free_rate: float = 0.0,
    stop_loss_pct: float = 0.0,
    take_profit_pct: float = 0.0
) -> Dict[str, Any]:
    """
    Executes an un-biased, transaction-cost aware portfolio backtest.
    """
    if parameters is None:
        parameters = {"fast_period": 20, "slow_period": 50}

    if len(history) < 20:
        raise ValueError("Insufficient historical data for backtesting (minimum 20 periods required)")

    if initial_capital <= 0:
        raise ValueError("Initial capital must be greater than 0")

    if position_size_pct <= 0 or position_size_pct > 1.0:
        raise ValueError("Position size must be between 1% and 100% (0.01 to 1.0)")

    trading_days = 365 if "BTC" in symbol else 252

    # Step 1: Generate signals
    signals = _generate_signals(history, strategy, parameters)

    # Step 2: Simulate portfolio
    cash = initial_capital
    position_qty = 0.0
    current_position_cost_basis = 0.0
    entry_price = 0.0
    entry_date = ""
    entry_index = 0

    trades: List[Dict[str, Any]] = []
    equity_curve: List[Dict[str, Any]] = []
    portfolio_values: List[float] = []

    # Benchmark: Buy & Hold 100% allocation on day 0
    bh_initial_price = history[0]["open"] if history[0]["open"] > 0 else history[0]["close"]
    bh_initial_cost = initial_capital * transaction_cost_pct
    bh_shares = (initial_capital - bh_initial_cost) / bh_initial_price
    benchmark_values: List[float] = []

    for i in range(len(history)):
        item = history[i]
        date_str = item["date"]
        close_p = item["close"]
        open_p = item["open"] if item["open"] > 0 else close_p

        # Execution happens based on prior day's signal (no look-ahead)
        # Day 0 has no prior signal, so execution begins from Day 1
        if i > 0:
            target_signal = signals[i - 1]
            current_has_position = position_qty > 0

            # Signal indicates ENTER LONG
            if target_signal == 1 and not current_has_position:
                exec_price = open_p
                allocatable_cash = cash * position_size_pct
                # Account for transaction cost on purchase
                cost_estimate = allocatable_cash * transaction_cost_pct
                net_capital = allocatable_cash - cost_estimate

                qty = net_capital / exec_price if exec_price > 0 else 0.0
                actual_cost = (qty * exec_price) * transaction_cost_pct
                total_deducted = (qty * exec_price) + actual_cost

                cash -= total_deducted
                position_qty = qty
                entry_price = exec_price
                entry_date = date_str
                entry_index = i
                current_position_cost_basis = total_deducted

                trades.append({
                    "id": len(trades) + 1,
                    "timestamp": item["timestamp"],
                    "date": date_str,
                    "symbol": symbol,
                    "side": "BUY",
                    "price": round(exec_price, 4),
                    "quantity": round(qty, 6),
                    "gross_value": round(qty * exec_price, 2),
                    "transaction_cost": round(actual_cost, 2),
                    "net_pnl": 0.0,
                    "return_pct": 0.0,
                    "holding_days": 0,
                    "reason": f"{strategy} Entry Trigger"
                })

            # Signal indicates EXIT TO CASH
            elif target_signal == 0 and current_has_position:
                exec_price = open_p
                gross_proceeds = position_qty * exec_price
                exit_cost = gross_proceeds * transaction_cost_pct
                net_proceeds = gross_proceeds - exit_cost
                pnl = net_proceeds - current_position_cost_basis
                trade_return = (pnl / current_position_cost_basis) if current_position_cost_basis > 0 else 0.0
                holding_days = i - entry_index

                cash += net_proceeds

                trades.append({
                    "id": len(trades) + 1,
                    "timestamp": item["timestamp"],
                    "date": date_str,
                    "symbol": symbol,
                    "side": "SELL",
                    "price": round(exec_price, 4),
                    "quantity": round(position_qty, 6),
                    "gross_value": round(gross_proceeds, 2),
                    "transaction_cost": round(exit_cost, 2),
                    "net_pnl": round(pnl, 2),
                    "return_pct": round(trade_return * 100, 2),
                    "holding_days": holding_days,
                    "reason": f"{strategy} Exit Trigger"
                })

                position_qty = 0.0
                current_position_cost_basis = 0.0

        # Evaluate Intraday Stop Loss / Take Profit
        if position_qty > 0 and entry_price > 0:
            low_p = item.get("low", close_p)
            high_p = item.get("high", close_p)

            sl_price = entry_price * (1.0 - (stop_loss_pct / 100.0)) if stop_loss_pct > 0 else 0.0
            tp_price = entry_price * (1.0 + (take_profit_pct / 100.0)) if take_profit_pct > 0 else float('inf')

            forced_exit_price = 0.0
            reason = ""

            if sl_price > 0 and low_p <= sl_price:
                forced_exit_price = sl_price
                reason = "Stop Loss Triggered"
            elif tp_price < float('inf') and high_p >= tp_price:
                forced_exit_price = tp_price
                reason = "Take Profit Triggered"

            if forced_exit_price > 0:
                gross_proceeds = position_qty * forced_exit_price
                exit_cost = gross_proceeds * transaction_cost_pct
                net_proceeds = gross_proceeds - exit_cost
                pnl = net_proceeds - current_position_cost_basis
                trade_return = (pnl / current_position_cost_basis) if current_position_cost_basis > 0 else 0.0
                holding_days = i - entry_index

                cash += net_proceeds

                trades.append({
                    "id": len(trades) + 1,
                    "timestamp": item["timestamp"],
                    "date": date_str,
                    "symbol": symbol,
                    "side": "SELL",
                    "price": round(forced_exit_price, 4),
                    "quantity": round(position_qty, 6),
                    "gross_value": round(gross_proceeds, 2),
                    "transaction_cost": round(exit_cost, 2),
                    "net_pnl": round(pnl, 2),
                    "return_pct": round(trade_return * 100, 2),
                    "holding_days": holding_days,
                    "reason": reason
                })

                position_qty = 0.0
                current_position_cost_basis = 0.0

                # Override future '1' signals until a '0' is encountered to prevent immediate re-entry
                for j in range(i, len(signals)):
                    if signals[j] == 1:
                        signals[j] = 0
                    else:
                        break

        # Valuation at day's close
        pos_value = position_qty * close_p
        port_val = cash + pos_value
        portfolio_values.append(port_val)

        # Benchmark valuation
        bh_val = bh_shares * close_p
        benchmark_values.append(bh_val)

        equity_curve.append({
            "date": date_str,
            "timestamp": item["timestamp"],
            "strategy_value": round(port_val, 2),
            "benchmark_value": round(bh_val, 2),
            "cash": round(cash, 2),
            "position_value": round(pos_value, 2),
            "price": close_p,
            "signal": signals[i]
        })

    # Performance calculation
    final_capital = portfolio_values[-1]
    net_profit = final_capital - initial_capital
    total_return = (final_capital / initial_capital) - 1.0

    bh_final = benchmark_values[-1]
    bh_total_return = (bh_final / initial_capital) - 1.0

    # Daily returns of strategy equity
    strat_daily_returns = calculate_daily_returns(portfolio_values)
    strat_vol = calculate_annualized_volatility(strat_daily_returns, trading_days=trading_days)
    strat_ann_ret = calculate_annualized_return(portfolio_values, trading_days=trading_days)
    strat_sharpe = calculate_sharpe_ratio(strat_ann_ret, strat_vol, risk_free_rate=risk_free_rate)
    strat_max_dd, strat_dd_curve = calculate_max_drawdown(portfolio_values)

    # Benchmark metrics
    bh_daily_returns = calculate_daily_returns(benchmark_values)
    bh_vol = calculate_annualized_volatility(bh_daily_returns, trading_days=trading_days)
    bh_ann_ret = calculate_annualized_return(benchmark_values, trading_days=trading_days)
    bh_sharpe = calculate_sharpe_ratio(bh_ann_ret, bh_vol, risk_free_rate=risk_free_rate)
    bh_max_dd, _ = calculate_max_drawdown(benchmark_values)

    # Append drawdown to equity curve
    for idx, eq in enumerate(equity_curve):
        eq["drawdown_pct"] = round(strat_dd_curve[idx] * 100, 2)

    # Trade statistics
    closed_trades = [t for t in trades if t["side"] == "SELL"]
    winning_trades = [t for t in closed_trades if t["net_pnl"] > 0]
    losing_trades = [t for t in closed_trades if t["net_pnl"] <= 0]
    num_trades = len(closed_trades)
    win_rate = (len(winning_trades) / num_trades) if num_trades > 0 else 0.0

    avg_trade_pnl = (sum(t["net_pnl"] for t in closed_trades) / num_trades) if num_trades > 0 else 0.0
    best_trade = max(closed_trades, key=lambda x: x["net_pnl"])["net_pnl"] if closed_trades else 0.0
    worst_trade = min(closed_trades, key=lambda x: x["net_pnl"])["net_pnl"] if closed_trades else 0.0

    total_transaction_costs = sum(t["transaction_cost"] for t in trades)

    return {
        "symbol": symbol,
        "strategy": strategy,
        "parameters": parameters,
        "start_date": history[0]["date"],
        "end_date": history[-1]["date"],
        "initial_capital": initial_capital,
        "final_capital": round(final_capital, 2),
        "net_profit": round(net_profit, 2),
        "total_return": round(total_return, 4),
        "total_return_pct": round(total_return * 100, 2),
        "annualized_return": strat_ann_ret,
        "annualized_return_pct": round(strat_ann_ret * 100, 2),
        "annualized_volatility": strat_vol,
        "annualized_volatility_pct": round(strat_vol * 100, 2),
        "sharpe_ratio": strat_sharpe,
        "max_drawdown": strat_max_dd,
        "max_drawdown_pct": round(strat_max_dd * 100, 2),
        "transaction_cost_pct": transaction_cost_pct,
        "position_size_pct": position_size_pct,
        "total_transaction_costs": round(total_transaction_costs, 2),
        "number_of_trades": num_trades,
        "total_executions": len(trades),
        "winning_trades": len(winning_trades),
        "losing_trades": len(losing_trades),
        "win_rate": round(win_rate, 4),
        "win_rate_pct": round(win_rate * 100, 2),
        "average_trade_pnl": round(avg_trade_pnl, 2),
        "best_trade_pnl": round(best_trade, 2),
        "worst_trade_pnl": round(worst_trade, 2),
        "benchmark": {
            "name": f"Buy & Hold {symbol}",
            "initial_capital": initial_capital,
            "final_capital": round(bh_final, 2),
            "total_return": round(bh_total_return, 4),
            "total_return_pct": round(bh_total_return * 100, 2),
            "annualized_return": bh_ann_ret,
            "annualized_return_pct": round(bh_ann_ret * 100, 2),
            "annualized_volatility": bh_vol,
            "annualized_volatility_pct": round(bh_vol * 100, 2),
            "sharpe_ratio": bh_sharpe,
            "max_drawdown": bh_max_dd,
            "max_drawdown_pct": round(bh_max_dd * 100, 2)
        },
        "trades": trades,
        "equity_curve": equity_curve
    }

def run_robustness_grid(
    history: List[Dict[str, Any]],
    symbol: str,
    fast_mas: List[int] = [10, 15, 20, 25, 30],
    slow_mas: List[int] = [40, 50, 60, 80, 100],
    transaction_cost_pct: float = 0.0010,
    position_size_pct: float = 1.0
) -> Dict[str, Any]:
    """
    Computes 2D heatmap matrix across Fast MA and Slow MA combinations.
    """
    return_matrix = []
    sharpe_matrix = []
    drawdown_matrix = []

    for fast in fast_mas:
        ret_row = []
        shp_row = []
        dd_row = []
        for slow in slow_mas:
            if fast >= slow:
                ret_row.append(None)
                shp_row.append(None)
                dd_row.append(None)
            else:
                res = run_backtest(
                    history=history,
                    symbol=symbol,
                    strategy="SMA_CROSSOVER",
                    parameters={"fast_period": fast, "slow_period": slow},
                    transaction_cost_pct=transaction_cost_pct,
                    position_size_pct=position_size_pct
                )
                ret_row.append(res["total_return_pct"])
                shp_row.append(res["sharpe_ratio"])
                dd_row.append(res["max_drawdown_pct"])
        return_matrix.append(ret_row)
        sharpe_matrix.append(shp_row)
        drawdown_matrix.append(dd_row)

    return {
        "symbol": symbol,
        "fast_mas": fast_mas,
        "slow_mas": slow_mas,
        "return_matrix": return_matrix,
        "sharpe_matrix": sharpe_matrix,
        "drawdown_matrix": drawdown_matrix,
        "disclaimer": "Historical parameter sensitivity analysis only. Past performance does not guarantee future results."
    }
