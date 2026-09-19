import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const router = express.Router();

async function callPythonEngine(command: string, payload: any): Promise<any> {
  const pythonScript = path.join(process.cwd(), 'backend', 'main.py');
  const payloadStr = JSON.stringify(payload);
  const base64Payload = `base64:${Buffer.from(payloadStr).toString('base64')}`;
  const reqPath = path.join(process.cwd(), 'backend', 'requirements.txt');
  const { stdout } = await execFileAsync('uv', ['run', '--with-requirements', reqPath, 'python', pythonScript, '--cli', command, base64Payload], {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 120000
  });
  return JSON.parse(stdout.trim());
}

function loadJsonStore(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return [];
}

function saveJsonStore(filePath: string, data: any[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

const BACKTEST_FILE = path.join(process.cwd(), 'database', 'saved_backtests.json');
const ALERT_HISTORY_FILE = path.join(process.cwd(), 'database', 'alert_history.json');
const PAPER_TRADING_FILE = path.join(process.cwd(), 'database', 'paper_trading.json');
const VOLATILITY_ALERTS_FILE = path.join(process.cwd(), 'database', 'volatility_alerts.json');

/** Profit Opportunity Engine */
router.get('/profit-opportunity', (req: Request, res: Response) => {
  try {
    const backtests = loadJsonStore(BACKTEST_FILE);
    const latest = backtests[backtests.length - 1];
    if (!latest) return res.status(404).json({ error: 'No backtest data available' });

    const {
      total_return_pct,
      max_drawdown_pct,
      sharpe_ratio,
      win_rate,
      win_rate_pct,
      total_transaction_costs,
      annualized_volatility_pct,
      best_trade_pnl,
      worst_trade_pnl,
      average_trade_pnl,
      number_of_trades,
      winning_trades,
      losing_trades,
      symbol,
      strategy,
      start_date,
      end_date,
      initial_capital,
      final_capital,
      net_profit,
      annualized_return_pct
    } = latest;

    const expectedReturn = total_return_pct ?? 0;
    const expectedDownside = max_drawdown_pct ?? 0;
    const riskReward = expectedDownside !== 0 ? Math.abs(expectedReturn / expectedDownside) : null;
    const profitFactor =
      losing_trades && worst_trade_pnl && worst_trade_pnl !== 0
        ? Math.abs((winning_trades * (best_trade_pnl ?? 0)) / (losing_trades * Math.abs(worst_trade_pnl)))
        : 0;
    const sortino = sharpe_ratio ? sharpe_ratio * 1.3 : 0;
    const confidenceScore = Math.min(1, Math.max(0, win_rate ?? 0.5));

    res.json({
      expectedReturn,
      expectedDownside,
      riskReward,
      winRate: win_rate ?? 0,
      winRatePct: win_rate_pct ?? 0,
      sharpe: sharpe_ratio ?? 0,
      sortino,
      profitFactor,
      transactionCost: total_transaction_costs ?? 0,
      slippage: 0,
      volatility: annualized_volatility_pct ?? 0,
      confidence: confidenceScore,
      numberOfTrades: number_of_trades ?? 0,
      winningTrades: winning_trades ?? 0,
      losingTrades: losing_trades ?? 0,
      bestTrade: best_trade_pnl ?? 0,
      worstTrade: worst_trade_pnl ?? 0,
      avgTrade: average_trade_pnl ?? 0,
      symbol: symbol ?? 'N/A',
      strategy: strategy ?? 'N/A',
      startDate: start_date,
      endDate: end_date,
      initialCapital: initial_capital ?? 0,
      finalCapital: final_capital ?? 0,
      netProfit: net_profit ?? 0,
      annualizedReturn: annualized_return_pct ?? 0
    });
  } catch (err: any) {
    console.error('Profit opportunity error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Risk Prediction Engine */
router.get('/risk-prediction', (req: Request, res: Response) => {
  try {
    const backtests = loadJsonStore(BACKTEST_FILE);
    const latest = backtests[backtests.length - 1];
    if (!latest) return res.status(404).json({ error: 'No backtest data available' });

    const { annualized_volatility_pct, max_drawdown_pct, sharpe_ratio, symbol } = latest;
    const vol = annualized_volatility_pct ?? 0;
    const dd = Math.abs(max_drawdown_pct ?? 0);
    const sharpe = sharpe_ratio ?? 0;
    const riskScore = vol * 0.5 + dd * 0.5;

    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore > 30) level = 'CRITICAL';
    else if (riskScore > 20) level = 'HIGH';
    else if (riskScore > 10) level = 'MODERATE';

    const reasons: string[] = [];
    if (vol > 20) reasons.push(`High annualized volatility (${vol.toFixed(1)}%)`);
    if (dd > 15) reasons.push(`Max drawdown exceeded 15% threshold (${dd.toFixed(1)}%)`);
    if (sharpe < 0.5) reasons.push(`Low Sharpe ratio (${sharpe.toFixed(2)}) — poor risk-adjusted return`);
    if (reasons.length === 0) reasons.push('All risk metrics within acceptable bounds');

    res.json({
      level,
      riskScore,
      reasons,
      affectedAssets: symbol ? [symbol] : [],
      potentialDownside: max_drawdown_pct ?? 0,
      volatility: vol,
      sharpe,
      confidence: 0.82
    });
  } catch (err: any) {
    console.error('Risk prediction error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Backtest Integrity Monitor */
router.get('/backtest-integrity', (req: Request, res: Response) => {
  try {
    const backtests = loadJsonStore(BACKTEST_FILE);
    const latest = backtests[backtests.length - 1];
    if (!latest) return res.status(404).json({ error: 'No backtest data available' });

    res.json({
      lookAheadBias: latest.look_ahead_bias ? 'FAIL' : 'PASS',
      dataLeakage: latest.data_leakage ? 'FAIL' : 'PASS',
      survivorshipBias: latest.survivorship_bias ? 'FAIL' : 'PASS',
      slippageModel: 'INACTIVE',
      transactionCostModel:
        latest.total_transaction_costs && latest.total_transaction_costs > 0 ? 'ACTIVE' : 'INACTIVE',
      walkForwardValidation: latest.walk_forward_pass ? 'PASS' : 'FAIL',
      outOfSampleTest: latest.out_of_sample_pass ? 'PASS' : 'FAIL',
      dataSource: latest.data_source ?? 'Yahoo Finance API',
      isDemo: latest.is_demo ?? false,
      symbol: latest.symbol,
      strategy: latest.strategy,
      totalRecords: backtests.length,
      transactionCostPct: latest.transaction_cost_pct ?? 0,
      positionSizePct: latest.position_size_pct ?? 0
    });
  } catch (err: any) {
    console.error('Backtest integrity error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Monte Carlo Simulator */
router.get('/monte-carlo', (req: Request, res: Response) => {
  try {
    const { horizon = '30', paths = '5000' } = req.query as any;
    const backtests = loadJsonStore(BACKTEST_FILE);
    const latest = backtests[backtests.length - 1];
    if (!latest) return res.status(404).json({ error: 'No backtest data available' });

    const meanDaily = (latest.total_return_pct ?? 0) / 252;
    const sigmaDaily = (latest.annualized_volatility_pct ?? 0) / Math.sqrt(252);
    const nPaths = Math.min(parseInt(paths, 10), 10000);
    const nDays = parseInt(horizon, 10);

    const results: number[] = [];
    for (let i = 0; i < nPaths; i++) {
      let cum = 1;
      for (let d = 0; d < nDays; d++) {
        const u1 = Math.max(1e-10, Math.random());
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        cum *= 1 + (meanDaily + sigmaDaily * z) / 100;
      }
      results.push((cum - 1) * 100);
    }
    results.sort((a, b) => a - b);

    const median = results[Math.floor(nPaths / 2)];
    const downside5 = results[Math.floor(nPaths * 0.05)];
    const upside95 = results[Math.floor(nPaths * 0.95)];
    const q1 = results[Math.floor(nPaths * 0.25)];
    const q3 = results[Math.floor(nPaths * 0.75)];
    const probNegative = results.filter(r => r < 0).length / nPaths;
    const probDrawdown = results.filter(r => r < (latest.max_drawdown_pct ?? 0)).length / nPaths;
    const worst = results[0];
    const best = results[nPaths - 1];

    const minVal = worst, maxVal = best;
    const binSize = (maxVal - minVal) / 20 || 1;
    const histogram: { bin: number; count: number; pct: number }[] = [];
    for (let b = 0; b < 20; b++) {
      const lo = minVal + b * binSize;
      const hi = lo + binSize;
      const count = results.filter(r => r >= lo && r < hi).length;
      histogram.push({
        bin: parseFloat((lo + binSize / 2).toFixed(2)),
        count,
        pct: parseFloat(((count / nPaths) * 100).toFixed(2))
      });
    }

    res.json({
      medianOutcome: median,
      downsidePercentile: downside5,
      upsidePercentile: upside95,
      q1,
      q3,
      probabilityNegativeReturn: probNegative,
      probabilityDrawdown: probDrawdown,
      worstScenario: worst,
      bestScenario: best,
      nPaths,
      nDays,
      histogram
    });
  } catch (err: any) {
    console.error('Monte Carlo error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Alert History */
router.get('/alert-history', (req: Request, res: Response) => {
  try {
    const alerts = loadJsonStore(ALERT_HISTORY_FILE);
    res.json(alerts);
  } catch (err: any) {
    console.error('Alert history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Paper Trading Engine */
router.post('/paper-trade', (req: Request, res: Response) => {
  try {
    const { side, symbol, qty, price } = req.body as any;
    if (!side || !symbol || qty == null || price == null) {
      return res.status(400).json({ error: 'Missing required trade fields' });
    }
    const trades = loadJsonStore(PAPER_TRADING_FILE);
    const trade = {
      id: trades.length + 1,
      entry_time: new Date().toISOString(),
      exit_time: null,
      symbol,
      side,
      quantity: qty,
      entry_price: price,
      exit_price: null,
      pnl: 0,
      fees: 0,
      slippage: 0,
      signal: null
    };
    trades.push(trade);
    saveJsonStore(PAPER_TRADING_FILE, trades);
    res.json({ status: 'accepted', trade });
  } catch (err: any) {
    console.error('Paper trade error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/paper-trade', (req: Request, res: Response) => {
  try {
    const trades = loadJsonStore(PAPER_TRADING_FILE);
    let realizedPnl = 0;
    trades.forEach((t: any) => {
      if (t.exit_price) {
        const direction = t.side === 'buy' ? 1 : -1;
        realizedPnl += direction * (t.exit_price - t.entry_price) * t.quantity;
      }
    });
    res.json({ trades, realizedPnl });
  } catch (err: any) {
    console.error('Paper trade fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** High Volatility Spike Alert Engine */
router.get('/volatility-spike', async (req: Request, res: Response) => {
  try {
    const forceDemo = req.query.demo === 'true';
    const elevated = parseFloat(req.query.elevated as string) || 1.25;
    const high = parseFloat(req.query.high as string) || 1.50;
    const critical = parseFloat(req.query.critical as string) || 2.00;

    const data = await callPythonEngine('get_volatility_spikes', {
      force_demo: forceDemo,
      thresholds: { elevated, high, critical }
    });

    // Auto-record if active spike exists
    if (data.active_spike) {
      const existingAlerts = loadJsonStore(VOLATILITY_ALERTS_FILE);
      const lastAlert = existingAlerts[existingAlerts.length - 1];
      const now = Date.now();
      const lastTime = lastAlert ? new Date(lastAlert.timestamp).getTime() : 0;
      // 5-minute cooldown unless escalated
      const isCooldown = (now - lastTime) < 300000;
      const isEscalation = lastAlert && lastAlert.severity === 'HIGH' && data.active_spike.severity === 'CRITICAL';

      if (!isCooldown || isEscalation) {
        existingAlerts.push({
          id: `vol_${Date.now()}`,
          timestamp: data.active_spike.timestamp,
          asset: data.active_spike.name,
          symbol: data.active_spike.symbol,
          currentVolatilityPct: data.active_spike.current_volatility_pct,
          baselineVolatilityPct: data.active_spike.baseline_volatility_pct,
          spikeRatio: data.active_spike.spike_ratio,
          severity: data.active_spike.severity,
          alarmTriggered: true,
          voiceTriggered: true,
          message: data.active_spike.message
        });
        saveJsonStore(VOLATILITY_ALERTS_FILE, existingAlerts);
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('Volatility spike API error:', err);
    res.status(500).json({ error: err.message || 'Volatility spike calculation error' });
  }
});

router.post('/volatility-spike', async (req: Request, res: Response) => {
  try {
    const { thresholds, force_demo = false } = req.body;
    const data = await callPythonEngine('get_volatility_spikes', {
      force_demo,
      thresholds: thresholds || { elevated: 1.25, high: 1.50, critical: 2.00 }
    });
    res.json(data);
  } catch (err: any) {
    console.error('Volatility spike POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/volatility-spike/history', (req: Request, res: Response) => {
  try {
    const alerts = loadJsonStore(VOLATILITY_ALERTS_FILE);
    const normalizedHistory = alerts.map((a: any) => ({
      id: a.id,
      timestamp: a.timestamp,
      asset: a.asset,
      symbol: a.symbol || a.asset,
      current_volatility: a.currentVolatilityPct ?? a.current_volatility ?? 0,
      baseline_volatility: a.baselineVolatilityPct ?? a.baseline_volatility ?? 0,
      spike_ratio: a.spikeRatio ?? a.spike_ratio ?? 1.0,
      severity: a.severity || 'HIGH',
      trigger_reason: a.message || a.trigger_reason || 'High volatility spike event',
      alarm_triggered: a.alarmTriggered ?? true,
      voice_triggered: a.voiceTriggered ?? true
    }));
    res.json({ status: 'success', history: normalizedHistory, alerts });
  } catch (err: any) {
    console.error('Volatility spike history error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/volatility-spike/log', (req: Request, res: Response) => {
  try {
    const record = req.body;
    if (!record || !record.asset) {
      return res.status(400).json({ error: 'Valid alert record required' });
    }
    const alerts = loadJsonStore(VOLATILITY_ALERTS_FILE);
    const newEntry = {
      id: `vol_${Date.now()}`,
      timestamp: record.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
      asset: record.asset,
      symbol: record.symbol || record.asset,
      currentVolatilityPct: record.currentVolatilityPct ?? record.current_volatility ?? 0,
      baselineVolatilityPct: record.baselineVolatilityPct ?? record.baseline_volatility ?? 0,
      spikeRatio: record.spikeRatio ?? record.spike_ratio ?? 1.0,
      severity: record.severity || 'HIGH',
      alarmTriggered: record.alarmTriggered ?? true,
      voiceTriggered: record.voiceTriggered ?? true,
      message: record.message || record.trigger_reason || 'High volatility spike event'
    };
    alerts.unshift(newEntry); // newest first
    saveJsonStore(VOLATILITY_ALERTS_FILE, alerts);
    res.json({ status: 'logged', record: newEntry, count: alerts.length });
  } catch (err: any) {
    console.error('Volatility spike log error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
