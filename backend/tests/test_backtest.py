"""
Automated unit tests for QUANTX Backtesting Engine
"""

import unittest
from backend.services.backtest_engine import run_backtest
from backend.services.portfolio_engine import calculate_portfolio_performance

class TestBacktestEngine(unittest.TestCase):

    def setUp(self):
        # Deterministic 40-day trend with a reversal
        # Day 0 to 20: rising trend 100 -> 140
        # Day 21 to 39: falling trend 140 -> 90
        self.history = []
        for i in range(40):
            if i <= 20:
                p = 100.0 + i * 2.0
            else:
                p = 140.0 - (i - 20) * 2.5
            self.history.append({
                "date": f"2025-01-{(i+1):02d}" if i < 31 else f"2025-02-{(i-30):02d}",
                "timestamp": 1704067200 + i * 86400,
                "open": p - 0.5,
                "high": p + 1.0,
                "low": p - 1.0,
                "close": p,
                "adjusted_close": p,
                "volume": 100000,
                "symbol": "TEST"
            })

    def test_sma_crossover_execution(self):
        res = run_backtest(
            history=self.history,
            symbol="TEST",
            strategy="SMA_CROSSOVER",
            parameters={"fast_period": 5, "slow_period": 10},
            initial_capital=100000.0,
            transaction_cost_pct=0.001,  # 0.1%
            position_size_pct=1.0
        )
        self.assertIn("total_return", res)
        self.assertIn("benchmark", res)
        self.assertIn("trades", res)
        self.assertIn("equity_curve", res)
        self.assertGreater(len(res["trades"]), 0)
        # Check transaction cost was charged
        self.assertGreater(res["total_transaction_costs"], 0.0)

    def test_position_sizing(self):
        # 50% position sizing should deploy roughly half cash
        res50 = run_backtest(
            history=self.history,
            symbol="TEST",
            strategy="SMA_CROSSOVER",
            parameters={"fast_period": 5, "slow_period": 10},
            initial_capital=100000.0,
            transaction_cost_pct=0.001,
            position_size_pct=0.5
        )
        first_buy = [t for t in res50["trades"] if t["side"] == "BUY"][0]
        # First buy gross value should be around 50k
        self.assertAlmostEqual(first_buy["gross_value"], 50000.0, delta=2000.0)

    def test_momentum_strategy(self):
        res = run_backtest(
            history=self.history,
            symbol="TEST",
            strategy="MOMENTUM",
            parameters={"lookback_period": 5, "threshold_pct": 0.02},
            initial_capital=100000.0
        )
        self.assertIn("sharpe_ratio", res)
        self.assertIn("max_drawdown", res)

    def test_portfolio_weights_validation(self):
        hist_a = self.history
        hist_b = self.history
        # Invalid weights (sum != 100%)
        with self.assertRaises(ValueError):
            calculate_portfolio_performance(
                asset_histories={"A": hist_a, "B": hist_b},
                weights={"A": 0.4, "B": 0.4} # sums to 0.8
            )

        # Valid weights
        res = calculate_portfolio_performance(
            asset_histories={"A": hist_a, "B": hist_b},
            weights={"A": 0.5, "B": 0.5}
        )
        self.assertEqual(res["weights"]["A"], 50.0)
        self.assertIn("correlation_matrix", res)

if __name__ == "__main__":
    unittest.main()
