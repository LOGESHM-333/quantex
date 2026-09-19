import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  Zap,
  Cpu
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
import { PortfolioResponse } from '../types';
import { analyzePortfolioApi } from '../services/api';

interface PortfolioViewProps {
  demoMode: boolean;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ demoMode }) => {
  const [goldWeight, setGoldWeight] = useState<number>(33.3);
  const [btcWeight, setBtcWeight] = useState<number>(33.3);
  const [nvdaWeight, setNvdaWeight] = useState<number>(33.4);
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [timeRange, setTimeRange] = useState<string>('1y');

  const [loading, setLoading] = useState<boolean>(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = parseFloat((goldWeight + btcWeight + nvdaWeight).toFixed(1));
  const isValid100 = Math.abs(totalWeight - 100.0) <= 0.2;

  const normalizeWeights = () => {
    const sum = goldWeight + btcWeight + nvdaWeight;
    if (sum <= 0) {
      setGoldWeight(33.3);
      setBtcWeight(33.3);
      setNvdaWeight(33.4);
      return { g: 33.3, b: 33.3, n: 33.4 };
    }
    const g = parseFloat(((goldWeight / sum) * 100).toFixed(1));
    const b = parseFloat(((btcWeight / sum) * 100).toFixed(1));
    const n = parseFloat((100.0 - g - b).toFixed(1));
    setGoldWeight(g);
    setBtcWeight(b);
    setNvdaWeight(n);
    return { g, b, n };
  };

  const runAnalysis = async () => {
    setError(null);
    setLoading(true);

    let activeG = goldWeight;
    let activeB = btcWeight;
    let activeN = nvdaWeight;

    // If sum is not 100%, automatically normalize for the user
    if (!isValid100) {
      const normalized = normalizeWeights();
      activeG = normalized.g;
      activeB = normalized.b;
      activeN = normalized.n;
    }

    try {
      const res = await analyzePortfolioApi({
        weights: {
          'GC=F': activeG,
          'BTC-USD': activeB,
          NVDA: activeN
        },
        range: timeRange,
        initial_capital: initialCapital,
        force_demo: demoMode
      });
      if (res && res.portfolio) {
        setPortfolioData(res.portfolio);
      } else {
        throw new Error('No portfolio data returned from server');
      }
    } catch (err: any) {
      console.error('Portfolio calculation error:', err);
      setError(err.message || 'Portfolio analysis calculation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [timeRange, demoMode]);

  const ranges = ['3m', '6m', '1y', '3y', '5y', 'max'];

  return (
    <div className="space-y-4">
      {/* Portfolio Allocator Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#061E23] border border-[#0E353D] space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#0C3238]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#00E5A3]" />
              <span>Multi-Asset Portfolio Allocator & Risk Synthesizer</span>
            </h2>
            <p className="text-xs text-[#6F9DA7] mt-0.5">
              Construct weighted combinations across Gold, Bitcoin, and NVIDIA to evaluate portfolio Sharpe & drawdown
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Time Range */}
            <div className="flex items-center rounded-xl bg-[#08252C] p-1 border border-[#0F3942]">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg uppercase transition cursor-pointer font-semibold ${
                    timeRange === r
                      ? 'bg-[#00E5A3] text-[#051518] font-bold shadow-sm'
                      : 'text-[#7CA2AB] hover:text-white hover:bg-[#0D343E]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#00E5A3] hover:bg-[#00c88e] text-[#051518] font-mono text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'COMPUTING...' : 'RECALCULATE'}</span>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          {/* Gold Slider */}
          <div className="p-3.5 rounded-xl bg-[#08262D] border border-[#0F3942] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#FBBF24] font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>Gold Futures (GC=F)</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">{goldWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={goldWeight}
              onChange={(e) => setGoldWeight(parseFloat(e.target.value))}
              className="w-full accent-[#FBBF24] cursor-pointer"
            />
            <div className="text-[10px] text-[#6E9CA6]">Safe-haven commodity ballast</div>
          </div>

          {/* Bitcoin Slider */}
          <div className="p-3.5 rounded-xl bg-[#08262D] border border-[#0F3942] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#FB923C] font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Bitcoin (BTC-USD)</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">{btcWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={btcWeight}
              onChange={(e) => setBtcWeight(parseFloat(e.target.value))}
              className="w-full accent-[#FB923C] cursor-pointer"
            />
            <div className="text-[10px] text-[#6E9CA6]">High-beta asymmetric digital asset</div>
          </div>

          {/* NVIDIA Slider */}
          <div className="p-3.5 rounded-xl bg-[#08262D] border border-[#0F3942] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#00E5A3] font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>NVIDIA (NVDA)</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">{nvdaWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={nvdaWeight}
              onChange={(e) => setNvdaWeight(parseFloat(e.target.value))}
              className="w-full accent-[#00E5A3] cursor-pointer"
            />
            <div className="text-[10px] text-[#6E9CA6]">AI compute equity growth driver</div>
          </div>
        </div>

        {/* Sum Indicator & Normalize Button */}
        <div className="p-2.5 rounded-xl bg-[#08262D] border border-[#0F3942] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#6E9CA6] font-semibold">ALLOCATION SUM:</span>
            <span
              className={`text-xs font-bold ${
                isValid100 ? 'text-[#00E5A3]' : 'text-[#FB923C]'
              }`}
            >
              {totalWeight}% / 100.0%
            </span>
            {isValid100 ? (
              <CheckCircle2 className="w-4 h-4 text-[#00E5A3]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#FB923C]" />
            )}
          </div>

          {!isValid100 && (
            <button
              onClick={normalizeWeights}
              className="px-3 py-1 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#FBBF24] border border-[#F59E0B]/40 transition text-xs font-bold cursor-pointer"
            >
              NORMALIZE TO 100%
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#2A1416] border border-[#FF5C5C]/40 text-[#FF5C5C] text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      {portfolioData && (
        <>
          {/* Portfolio Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">Final Value</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">
                ${portfolioData.final_capital.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">
                From ${portfolioData.initial_capital.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">Total Return</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  portfolioData.total_return_pct >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
                }`}
              >
                {portfolioData.total_return_pct >= 0 ? '+' : ''}{portfolioData.total_return_pct}%
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">Over period</div>
            </div>

            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">CAGR (Ann.)</div>
              <div className="text-sm font-bold text-[#00E5A3] mt-0.5">
                {portfolioData.annualized_return_pct}%
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">Compound annual</div>
            </div>

            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">Ann. Volatility</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {portfolioData.annualized_volatility_pct}%
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">Blended risk</div>
            </div>

            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">Sharpe Ratio</div>
              <div className="text-sm font-bold text-[#00E5A3] mt-0.5">
                {portfolioData.sharpe_ratio}
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">Rf = 0.0%</div>
            </div>

            <div className="p-3 rounded-xl bg-[#061E23] border border-[#0E353D] shadow-md">
              <div className="text-[10px] text-[#6E9CA6]">Max Drawdown</div>
              <div className="text-sm font-bold text-[#FF5C5C] mt-0.5">
                -{portfolioData.max_drawdown_pct}%
              </div>
              <div className="text-[10px] text-[#558089] mt-0.5">Peak-to-trough</div>
            </div>
          </div>

          {/* Equity Comparison Chart */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#061E23] border border-[#0E353D] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Blended Portfolio Equity vs Individual Assets ($100k Base)
                </h3>
                <p className="text-[11px] text-[#6E9CA6]">
                  Observe how diversification suppresses peak drawdown relative to single-asset holding
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#5E8B95]">
                {portfolioData.observations} trading days
              </div>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioData.equity_curve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0C2D35" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#5F8B96"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#0C2D35' }}
                    tickFormatter={(v) => {
                      const parts = v.split('-');
                      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v;
                    }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#5F8B96"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#0C2D35' }}
                    tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#082229',
                      borderColor: '#144754',
                      borderRadius: '12px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#E1F2F6',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                    }}
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    name={`Blended Portfolio (${goldWeight}% G / ${btcWeight}% B / ${nvdaWeight}% N)`}
                    stroke="#00E5A3"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="GC=F"
                    name="100% Gold"
                    stroke="#FBBF24"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="BTC-USD"
                    name="100% Bitcoin"
                    stroke="#FB923C"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="NVDA"
                    name="100% NVIDIA"
                    stroke="#06B6D4"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
