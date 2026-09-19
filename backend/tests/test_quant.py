"""
Automated unit tests for QUANTX Quantitative Analysis Engine
"""

import unittest
import math
from backend.services.quant_engine import (
    calculate_sma,
    calculate_ema,
    calculate_daily_returns,
    calculate_annualized_volatility,
    calculate_sharpe_ratio,
    calculate_max_drawdown,
    calculate_correlation,
    calculate_rolling_correlation
)

class TestQuantEngine(unittest.TestCase):

    def test_sma_calculation(self):
        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        sma3 = calculate_sma(prices, 3)
        self.assertIsNone(sma3[0])
        self.assertIsNone(sma3[1])
        self.assertEqual(sma3[2], 20.0)  # (10+20+30)/3
        self.assertEqual(sma3[3], 30.0)  # (20+30+40)/3
        self.assertEqual(sma3[4], 40.0)  # (30+40+50)/3

    def test_ema_calculation(self):
        prices = [10.0, 10.0, 10.0, 20.0]
        ema3 = calculate_ema(prices, 3)
        self.assertIsNone(ema3[0])
        self.assertIsNone(ema3[1])
        self.assertEqual(ema3[2], 10.0)
        # alpha = 2 / (3 + 1) = 0.5
        # EMA_3 = 20 * 0.5 + 10 * 0.5 = 15.0
        self.assertEqual(ema3[3], 15.0)

    def test_daily_returns(self):
        prices = [100.0, 110.0, 99.0]
        returns = calculate_daily_returns(prices)
        self.assertEqual(returns[0], 0.0)
        self.assertAlmostEqual(returns[1], 0.10, places=4)
        self.assertAlmostEqual(returns[2], -0.10, places=4)

    def test_max_drawdown(self):
        # 100 -> 120 (peak) -> 90 (drop 25%) -> 110 -> 84 (drop 30% from 120) -> 130
        prices = [100.0, 120.0, 90.0, 110.0, 84.0, 130.0]
        max_dd, dd_curve = calculate_max_drawdown(prices)
        # (120 - 84) / 120 = 36 / 120 = 0.30 (30%)
        self.assertEqual(max_dd, 0.30)
        self.assertEqual(dd_curve[1], 0.0)
        self.assertEqual(dd_curve[2], 0.25)
        self.assertEqual(dd_curve[4], 0.30)

    def test_sharpe_ratio(self):
        # Annual return 20%, Volatility 10%, Rf = 0
        sharpe = calculate_sharpe_ratio(0.20, 0.10, risk_free_rate=0.0)
        self.assertEqual(sharpe, 2.0)
        # With Rf = 5%
        sharpe_rf = calculate_sharpe_ratio(0.20, 0.10, risk_free_rate=0.05)
        self.assertEqual(sharpe_rf, 1.5)

    def test_correlation(self):
        # Perfect positive correlation
        a = [0.01, 0.02, 0.03, 0.04, 0.05]
        b = [0.02, 0.04, 0.06, 0.08, 0.10]
        corr = calculate_correlation(a, b)
        self.assertAlmostEqual(corr, 1.0, places=3)

        # Perfect negative correlation
        c = [-0.01, -0.02, -0.03, -0.04, -0.05]
        corr_neg = calculate_correlation(a, c)
        self.assertAlmostEqual(corr_neg, -1.0, places=3)

if __name__ == "__main__":
    unittest.main()
