import React, { useState, useEffect } from 'react';
import {
  PlaySquare,
  RefreshCw,
  Download,
  Bot,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { AssetMeta, BacktestResult, NavTab } from '../types';
import { runBacktestApi, saveResearchApi } from '../services/api';

interface BacktestingViewProps {
  assets: AssetMeta[];
  demoMode: boolean;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenAIExplainer: (result: BacktestResult) => void;
  onNavigate: (tab: NavTab) => void;
}

export const BacktestingView: React.FC<BacktestingViewProps> = ({
  assets,
  demoMode,
  selectedSymbol,
  onSelectSymbol,
  onOpenAIExplainer,
  onNavigate
}) => {
  const [strategy, setStrategy] = useState<string>('SMA_CROSSOVER');
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [transactionCostPct, setTransactionCostPct] = useState<number>(0.001); // 0.10%
  const [positionSizePct, setPositionSizePct] = useState<number>(1.0); // 100%
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);

  // Strategy Parameters
  const [fastPeriod, setFastPeriod] = useState<number>(20);
  const [slowPeriod, setSlowPeriod] = useState<number>(50);
  const [momentumLookback, setMomentumLookback] = useState<number>(20);
  const [momentumThreshold, setMomentumThreshold] = useState<number>(0.02);
  const [mrLookback, setMrLookback] = useState<number>(20);
  const [mrZEntry, setMrZEntry] = useState<number>(-1.5);
  const [mrZExit, setMrZExit] = useState<number>(0.5);

  // Results & States
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'WIN' | 'LOSS'>('ALL');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const ranges = ['3m', '6m', '1y', '3y', '5y', 'max'];

  // Execute Backtest
  const executeBacktest = async () => {
    setLoading(true);
    setError(null);

    let params: Record<string, any> = {};
    if (strategy === 'SMA_CROSSOVER' || strategy === 'EMA_TREND') {
      if (fastPeriod >= slowPeriod) {
        setError('Fast Moving Average period must be strictly less than Slow Moving Average period.');
        setLoading(false);
        return;
      }
      params = { fast_period: fastPeriod, slow_period: slowPeriod };
    } else if (strategy === 'MOMENTUM') {
      params = { lookback_period: momentumLookback, threshold: momentumThreshold };
    } else if (strategy === 'MEAN_REVERSION') {
      if (mrZEntry >= mrZExit) {
        setError('Z-score entry threshold must be strictly below exit threshold.');
        setLoading(false);
        return;
      }
      params = { lookback_period: mrLookback, entry_z: mrZEntry, exit_z: mrZExit };
    }

    try {
      const res = await runBacktestApi({
        symbol: selectedSymbol,
        strategy,
        time_range: timeRange,
        initial_capital: initialCapital,
        transaction_cost_pct: transactionCostPct,
        position_size_pct: positionSizePct,
        stop_loss_pct: stopLoss,
        take_profit_pct: takeProfit,
        parameters: params,
        demo_mode: demoMode
      });
      setResult(res.result);
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err.message || 'Backtest execution failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeBacktest();
  }, [selectedSymbol, strategy, timeRange, demoMode]);

  // Filter Trades
  const filteredTrades = result?.trades.filter((t) => {
    if (tradeFilter === 'ALL') return true;
    if (tradeFilter === 'BUY') return t.side === 'BUY';
    if (tradeFilter === 'SELL') return t.side === 'SELL';
    if (tradeFilter === 'WIN') return t.side === 'SELL' && t.net_pnl > 0;
    if (tradeFilter === 'LOSS') return t.side === 'SELL' && t.net_pnl <= 0;
    return true;
  }) || [];

  const exportTradesCSV = () => {
    if (!result?.trades.length) return;
    const header = 'ID,Date,Side,Price,Quantity,Gross_Value,Cost,Net_PnL,Return_Pct,Holding_Days,Reason\n';
    const rows = result.trades
      .map(
        (t) =>
          `${t.id},${t.date},${t.side},${t.price},${t.quantity},${t.gross_value},${t.transaction_cost},${t.net_pnl},${t.return_pct},${t.holding_days},"${t.reason}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.symbol}_${result.strategy}_Trades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToResearch = async () => {
    if (!result) return;
    try {
      await saveResearchApi({
        title: `${result.symbol} ${result.strategy} Backtest (${timeRange})`,
        symbol: result.symbol,
        strategy: result.strategy,
        parameters: result.parameters,
        resultsSummary: {
          total_return_pct: result.total_return_pct,
          sharpe_ratio: result.sharpe_ratio,
          max_drawdown_pct: result.max_drawdown_pct,
          win_rate_pct: result.win_rate_pct,
          number_of_trades: result.number_of_trades
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save to research lab:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Control Panel */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#0F353E]">
          <div>
            <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
              <PlaySquare className="w-4 h-4 text-[#00E5A3]" />
              <span>Quantitative Strategy Execution & Backtesting Simulator</span>
            </h2>
            <p className="text-xs text-[#7A9EA7] mt-0.5">
              Deterministic historical simulation with next-session execution & exact transaction costs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executeBacktest}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00E5A3] hover:bg-[#1df5b7] text-[#051518] font-mono text-xs font-bold transition shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'SIMULATING...' : 'RUN BACKTEST'}</span>
            </button>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Asset & Strategy Selector */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Target Asset</label>
              <div className="grid grid-cols-3 gap-1.5">
                {assets.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => onSelectSymbol(a.symbol)}
                    className={`py-1.5 px-2 rounded-xl font-bold border transition cursor-pointer ${
                      selectedSymbol === a.symbol
                        ? 'bg-[#124B55] border-[#00E5A3]/40 text-[#00E5A3]'
                        : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7] hover:text-white'
                    }`}
                  >
                    {a.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Strategy Model</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full py-1.5 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white focus:outline-none focus:border-[#00E5A3] shadow-xs"
              >
                <option value="SMA_CROSSOVER">SMA Crossover (Fast/Slow)</option>
                <option value="EMA_TREND">EMA Exponential Trend</option>
                <option value="MOMENTUM">Lookback Momentum</option>
                <option value="MEAN_REVERSION">Statistical Mean Reversion (Z-Score)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Strategy Parameters */}
          <div className="space-y-3">
            {(strategy === 'SMA_CROSSOVER' || strategy === 'EMA_TREND') && (
              <>
                <div>
                  <label className="block text-[#6A96A0] mb-1 font-semibold">
                    Fast Period ({fastPeriod} days)
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00E5A3]"
                  />
                </div>
                <div>
                  <label className="block text-[#6A96A0] mb-1 font-semibold">
                    Slow Period ({slowPeriod} days)
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00E5A3]"
                  />
                </div>
              </>
            )}

            {strategy === 'MOMENTUM' && (
              <>
                <div>
                  <label className="block text-[#6A96A0] mb-1 font-semibold">
                    Lookback Period ({momentumLookback} days)
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={90}
                    value={momentumLookback}
                    onChange={(e) => setMomentumLookback(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00E5A3]"
                  />
                </div>
                <div>
                  <label className="block text-[#6A96A0] mb-1 font-semibold">
                    Threshold ({(momentumThreshold * 100).toFixed(1)}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={0.1}
                    step={0.005}
                    value={momentumThreshold}
                    onChange={(e) => setMomentumThreshold(parseFloat(e.target.value))}
                    className="w-full accent-[#00E5A3]"
                  />
                </div>
              </>
            )}

            {strategy === 'MEAN_REVERSION' && (
              <>
                <div>
                  <label className="block text-[#6A96A0] mb-1 font-semibold">
                    Lookback Period ({mrLookback} days)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={mrLookback}
                    onChange={(e) => setMrLookback(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00E5A3]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6A96A0] mb-1 font-semibold">Entry Z ({mrZEntry})</label>
                    <input
                      type="number"
                      step={0.1}
                      value={mrZEntry}
                      onChange={(e) => setMrZEntry(parseFloat(e.target.value))}
                      className="w-full py-1 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6A96A0] mb-1 font-semibold">Exit Z ({mrZExit})</label>
                    <input
                      type="number"
                      step={0.1}
                      value={mrZExit}
                      onChange={(e) => setMrZExit(parseFloat(e.target.value))}
                      className="w-full py-1 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Risk Management */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Stop Loss (%) <span className="text-xs font-normal opacity-70">(0 to disable)</span></label>
              <input
                type="number"
                step={0.5}
                value={stopLoss}
                onChange={(e) => setStopLoss(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full py-1.5 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
              />
            </div>

            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Take Profit (%) <span className="text-xs font-normal opacity-70">(0 to disable)</span></label>
              <input
                type="number"
                step={0.5}
                value={takeProfit}
                onChange={(e) => setTakeProfit(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full py-1.5 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
              />
            </div>
          </div>

          {/* Capital & Position Sizing */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Initial Capital ($)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(1000, parseFloat(e.target.value) || 100000))}
                className="w-full py-1.5 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
              />
            </div>

            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Position Sizing</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.25, 0.5, 0.75, 1.0].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPositionSizePct(sz)}
                    className={`py-1 rounded-xl font-bold border transition cursor-pointer ${
                      positionSizePct === sz
                        ? 'bg-[#124B55] border-[#00E5A3]/40 text-[#00E5A3]'
                        : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
                    }`}
                  >
                    {sz * 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction Costs & Range */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">
                Transaction Cost ({(transactionCostPct * 100).toFixed(2)}%)
              </label>
              <select
                value={transactionCostPct}
                onChange={(e) => setTransactionCostPct(parseFloat(e.target.value))}
                className="w-full py-1.5 px-2 rounded-xl bg-[#09252D] border border-[#133F4A] text-white"
              >
                <option value={0.0}>0.00% (Zero Friction)</option>
                <option value={0.0005}>0.05% (Institutional Tier)</option>
                <option value={0.001}>0.10% (Standard Retail / NASDAQ)</option>
                <option value={0.0025}>0.25% (Crypto Spot Exchange)</option>
                <option value={0.005}>0.50% (High Slippage Stress)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#6A96A0] mb-1 font-semibold">Time Horizon</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ranges.slice(1, 4).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`py-1 rounded-xl font-bold border uppercase transition cursor-pointer ${
                      timeRange === r
                        ? 'bg-[#124B55] border-[#00E5A3]/40 text-[#00E5A3]'
                        : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Model Assumptions Notice */}
        <div className="p-3 rounded-2xl bg-[#08232B] border border-[#103D47] flex items-center justify-between text-[11px] font-mono text-[#7A9EA7]">
          <div className="flex items-center gap-2 text-[#00E5A3] font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#00E5A3] shrink-0" />
            <span>Execution Assumption: Signal generated at Day T Close; Trade executed at Day T+1 Open.</span>
          </div>
          <span className="hidden md:inline-block text-[#5B828B]">
            Zero Look-Ahead Bias • Exact Entry & Exit Slippage Deduction
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#341618] border border-[#FF5C5C]/40 text-[#FF5C5C] text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Final Portfolio Value</div>
              <div className="text-base font-bold text-white mt-1">
                ${result.final_capital.toLocaleString()}
              </div>
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  result.net_profit >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
                }`}
              >
                {result.net_profit >= 0 ? '+' : ''}${result.net_profit.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Total Return (%)</div>
              <div
                className={`text-base font-bold mt-1 ${
                  result.total_return_pct >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
                }`}
              >
                {result.total_return_pct >= 0 ? '+' : ''}
                {result.total_return_pct}%
              </div>
              <div className="text-[11px] text-[#59838E] mt-0.5">
                CAGR: {result.annualized_return_pct}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Sharpe Ratio</div>
              <div className="text-base font-bold text-[#00E5A3] mt-1">
                {result.sharpe_ratio}
              </div>
              <div className="text-[11px] text-[#59838E] mt-0.5">
                Vol: {result.annualized_volatility_pct}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Max Drawdown</div>
              <div className="text-base font-bold text-[#FF5C5C] mt-1">
                -{result.max_drawdown_pct}%
              </div>
              <div className="text-[11px] text-[#59838E] mt-0.5">Peak-to-trough</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Win Rate</div>
              <div className="text-base font-bold text-[#00E5A3] mt-1">
                {result.win_rate_pct}%
              </div>
              <div className="text-[11px] text-[#59838E] mt-0.5">
                {result.winning_trades}W / {result.losing_trades}L ({result.number_of_trades} trades)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
              <div className="text-[10px] text-[#6A96A0]">Frictional Costs</div>
              <div className="text-base font-bold text-[#FBBF24] mt-1">
                ${result.total_transaction_costs.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#59838E] mt-0.5">
                {result.total_executions} order executions
              </div>
            </div>
          </div>

          {/* Equity Curve & Benchmark Comparison Chart */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <span>Portfolio Equity Curve vs Buy & Hold Benchmark</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#09252D] text-[#00E5A3] font-normal border border-[#00E5A3]/30">
                    {result.strategy} on {result.symbol}
                  </span>
                </h3>
                <p className="text-xs text-[#7A9EA7]">
                  {result.start_date} to {result.end_date} • Starting Capital: ${result.initial_capital.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAIExplainer(result)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#124B55] hover:bg-[#185e6a] text-[#00E5A3] text-xs font-mono border border-[#00E5A3]/30 transition cursor-pointer font-bold shadow-sm"
                >
                  <Bot className="w-3.5 h-3.5 text-[#00E5A3]" />
                  <span>EXPLAIN WITH AI</span>
                </button>
                <button
                  onClick={handleSaveToResearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09252D] hover:bg-[#0E303A] text-white text-xs font-mono border border-[#133F4A] transition cursor-pointer font-medium"
                >
                  <span>{saveSuccess ? 'SAVED TO LAB!' : 'SAVE EXPERIMENT'}</span>
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equity_curve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0E333C" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#58818B"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                    tickFormatter={(v) => {
                      const parts = v.split('-');
                      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v;
                    }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#58818B"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                    tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#082229',
                      borderColor: '#144754',
                      borderRadius: '12px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#FFFFFF',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                    }}
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="strategy_value"
                    name={`Strategy (${result.strategy})`}
                    stroke="#00E5A3"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark_value"
                    name={`Benchmark (Buy & Hold ${result.symbol})`}
                    stroke="#7A9EA7"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategy vs Benchmark Side-by-Side Comparison Table */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-3">
            <h3 className="text-sm font-mono font-bold text-white">
              Performance Attribution: Strategy vs Buy & Hold Benchmark
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0F353E] text-[#8DB4BE] bg-[#09272F]">
                    <th className="py-2.5 px-3">Quantitative Metric</th>
                    <th className="py-2.5 px-3 text-right text-[#00E5A3] font-bold">Strategy ({result.strategy})</th>
                    <th className="py-2.5 px-3 text-right text-white">Buy & Hold ({result.symbol})</th>
                    <th className="py-2.5 px-3 text-right text-white">Alpha / Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E333C] text-white">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Final Portfolio Capital</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#00E5A3]">${result.final_capital.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-[#7A9EA7]">${result.benchmark.final_capital.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      ${(result.final_capital - result.benchmark.final_capital).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Total Cumulative Return</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${result.total_return_pct >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                      {result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct}%
                    </td>
                    <td className={`py-2.5 px-3 text-right ${result.benchmark.total_return_pct >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'}`}>
                      {result.benchmark.total_return_pct >= 0 ? '+' : ''}{result.benchmark.total_return_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {(result.total_return_pct - result.benchmark.total_return_pct) >= 0 ? '+' : ''}
                      {(result.total_return_pct - result.benchmark.total_return_pct).toFixed(2)}%
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Annualized Volatility</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">{result.annualized_volatility_pct}%</td>
                    <td className="py-2.5 px-3 text-right text-[#7A9EA7]">{result.benchmark.annualized_volatility_pct}%</td>
                    <td className="py-2.5 px-3 text-right text-[#7A9EA7]">
                      {(result.annualized_volatility_pct - result.benchmark.annualized_volatility_pct).toFixed(2)}%
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Sharpe Ratio (Risk-Adjusted)</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#00E5A3]">{result.sharpe_ratio}</td>
                    <td className="py-2.5 px-3 text-right text-[#7A9EA7]">{result.benchmark.sharpe_ratio}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {(result.sharpe_ratio - result.benchmark.sharpe_ratio) >= 0 ? '+' : ''}
                      {(result.sharpe_ratio - result.benchmark.sharpe_ratio).toFixed(4)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Maximum Drawdown</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#FF5C5C]">-{result.max_drawdown_pct}%</td>
                    <td className="py-2.5 px-3 text-right text-[#FF5C5C]">-{result.benchmark.max_drawdown_pct}%</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#00E5A3]">
                      {result.max_drawdown_pct < result.benchmark.max_drawdown_pct ? 'Dampened Risk' : 'Elevated Risk'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Execution History Log */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono font-bold text-white">Trade History Log</h3>
                <span className="text-xs font-mono text-[#58818B]">
                  ({filteredTrades.length} of {result.trades.length} executions)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Trade Filters */}
                <div className="flex items-center rounded-xl bg-[#09252D] p-1 border border-[#133F4A] text-xs font-mono">
                  {(['ALL', 'BUY', 'SELL', 'WIN', 'LOSS'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTradeFilter(f)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                        tradeFilter === f
                          ? 'bg-[#00E5A3] text-[#051518] shadow-xs'
                          : 'text-[#7A9EA7] hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button
                  onClick={exportTradesCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09252D] hover:bg-[#0E303A] text-xs font-mono text-white border border-[#133F4A] transition cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-[#00E5A3]" />
                  <span>EXPORT CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 scrollbar-thin scrollbar-thumb-[#113842]">
              <table className="w-full font-mono text-xs text-left">
                <thead className="sticky top-0 bg-[#09272F] text-[#8DB4BE] border-b border-[#123E49]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Execution Date</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Gross Value</th>
                    <th className="py-2.5 px-3 text-right">Fee</th>
                    <th className="py-2.5 px-3 text-right">Net PnL</th>
                    <th className="py-2.5 px-3 text-right">Return %</th>
                    <th className="py-2.5 px-3 text-right">Days</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E333C] text-white">
                  {filteredTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#0A2931] transition">
                      <td className="py-2 px-3 text-[#58818B]">{t.id}</td>
                      <td className="py-2 px-3 text-white font-semibold">{t.date}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-[#00E5A3]/20 text-[#00E5A3] border border-[#00E5A3]/30'
                              : 'bg-[#FF5C5C]/20 text-[#FF5C5C] border border-[#FF5C5C]/30'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-white">${t.price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#7A9EA7]">{t.quantity}</td>
                      <td className="py-2 px-3 text-right text-white">${t.gross_value.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-[#FBBF24]">${t.transaction_cost.toFixed(2)}</td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          t.side === 'BUY'
                            ? 'text-[#58818B]'
                            : t.net_pnl >= 0
                            ? 'text-[#00E5A3]'
                            : 'text-[#FF5C5C]'
                        }`}
                      >
                        {t.side === 'BUY' ? '—' : `${t.net_pnl >= 0 ? '+' : ''}$${t.net_pnl.toFixed(2)}`}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          t.side === 'BUY'
                            ? 'text-[#58818B]'
                            : t.return_pct >= 0
                            ? 'text-[#00E5A3]'
                            : 'text-[#FF5C5C]'
                        }`}
                      >
                        {t.side === 'BUY' ? '—' : `${t.return_pct >= 0 ? '+' : ''}${t.return_pct}%`}
                      </td>
                      <td className="py-2 px-3 text-right text-[#58818B]">{t.holding_days > 0 ? t.holding_days : '—'}</td>
                      <td className="py-2 px-3 text-[#7A9EA7] truncate max-w-xs">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
