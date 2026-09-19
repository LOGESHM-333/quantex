import React, { useState, useEffect } from 'react';
import {
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { AssetMeta, AssetMetrics, OHLCVRecord } from '../types';
import { fetchAssetHistory, fetchAssetMetrics } from '../services/api';

interface QuantAnalysisViewProps {
  assets: AssetMeta[];
  demoMode: boolean;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const QuantAnalysisView: React.FC<QuantAnalysisViewProps> = ({
  assets,
  demoMode,
  selectedSymbol,
  onSelectSymbol
}) => {
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [history, setHistory] = useState<OHLCVRecord[]>([]);
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Indicator Toggles
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [showSMA50, setShowSMA50] = useState<boolean>(true);
  const [showSMA200, setShowSMA200] = useState<boolean>(false);
  const [showEMA20, setShowEMA20] = useState<boolean>(false);
  const [showEMA50, setShowEMA50] = useState<boolean>(false);

  // Sub-chart mode
  const [subChartMode, setSubChartMode] = useState<'returns' | 'volatility' | 'drawdown'>('drawdown');

  useEffect(() => {
    let isMounted = true;
    async function loadQuantData() {
      setLoading(true);
      try {
        const [histRes, metRes] = await Promise.all([
          fetchAssetHistory(selectedSymbol, timeRange, demoMode),
          fetchAssetMetrics(selectedSymbol, timeRange, demoMode)
        ]);
        if (!isMounted) return;
        setHistory(histRes.history || []);
        setMetrics(metRes.metrics || null);
      } catch (err) {
        console.error('Failed to load quant analysis data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadQuantData();
    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, timeRange, demoMode]);

  const ranges = ['1m', '3m', '6m', '1y', '3y', '5y', 'max'];

  // Combine history with calculated indicator series for charting
  const combinedChartData = history.map((pt, idx) => ({
    date: pt.date,
    close: pt.close,
    sma20: metrics?.sma_20?.[idx] ?? null,
    sma50: metrics?.sma_50?.[idx] ?? null,
    sma200: metrics?.sma_200?.[idx] ?? null,
    ema20: metrics?.ema_20?.[idx] ?? null,
    ema50: metrics?.ema_50?.[idx] ?? null,
    daily_return_pct: metrics?.daily_returns?.[idx] ? parseFloat((metrics.daily_returns[idx] * 100).toFixed(2)) : 0,
    rolling_vol: metrics?.rolling_vol_30?.[idx] ? parseFloat((metrics.rolling_vol_30[idx] * 100).toFixed(2)) : null,
    drawdown_pct: metrics?.drawdown_curve?.[idx] ? parseFloat((-metrics.drawdown_curve[idx] * 100).toFixed(2)) : 0
  }));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {assets.map((asset) => {
            const isActive = asset.symbol === selectedSymbol;
            return (
              <button
                key={asset.symbol}
                onClick={() => onSelectSymbol(asset.symbol)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#124B55] text-[#00E5A3] border border-[#00E5A3]/40 shadow-[0_0_12px_rgba(0,229,163,0.15)]'
                    : 'bg-[#09252D] text-[#7A9EA7] hover:text-white border border-[#133F4A]'
                }`}
              >
                {asset.symbol}
              </button>
            );
          })}
        </div>

        {/* Range Selector */}
        <div className="flex items-center rounded-xl bg-[#09252D] p-1 border border-[#133F4A]">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-mono rounded-lg uppercase transition cursor-pointer font-bold ${
                timeRange === r
                  ? 'bg-[#00E5A3] text-[#051518] shadow-xs'
                  : 'text-[#7A9EA7] hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator Toggles Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl bg-[#071F26] border border-[#0F353E] text-xs font-mono shadow-lg">
        <span className="text-[#7A9EA7] font-semibold flex items-center gap-1.5 mr-1">
          <Sliders className="w-3.5 h-3.5 text-[#00E5A3]" />
          INDICATORS:
        </span>

        <button
          onClick={() => setShowSMA20(!showSMA20)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition cursor-pointer ${
            showSMA20
              ? 'bg-[#FEF3C7]/15 border-[#FBBF24]/50 text-[#FBBF24] font-bold'
              : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#FBBF24]"></span>
          SMA 20
        </button>

        <button
          onClick={() => setShowSMA50(!showSMA50)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition cursor-pointer ${
            showSMA50
              ? 'bg-[#124B55] border-[#00E5A3]/50 text-[#00E5A3] font-bold'
              : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#00E5A3]"></span>
          SMA 50
        </button>

        <button
          onClick={() => setShowSMA200(!showSMA200)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition cursor-pointer ${
            showSMA200
              ? 'bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] font-bold'
              : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span>
          SMA 200
        </button>

        <button
          onClick={() => setShowEMA20(!showEMA20)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition cursor-pointer ${
            showEMA20
              ? 'bg-[#FF5C5C]/20 border-[#FF5C5C]/50 text-[#FF5C5C] font-bold'
              : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#FF5C5C]"></span>
          EMA 20
        </button>

        <button
          onClick={() => setShowEMA50(!showEMA50)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition cursor-pointer ${
            showEMA50
              ? 'bg-[#A78BFA]/20 border-[#A78BFA]/50 text-[#A78BFA] font-bold'
              : 'bg-[#09252D] border-[#133F4A] text-[#7A9EA7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#A78BFA]"></span>
          EMA 50
        </button>
      </div>

      {/* Main Quantitative Price Chart with Overlays */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-sm font-bold text-white">
            {selectedSymbol} — Price & Technical Moving Averages
          </div>
          <div className="text-xs font-mono text-[#58818B]">
            {combinedChartData.length} observation days
          </div>
        </div>

        <div className="h-80 w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-[#58818B] font-mono text-xs">
              Computing deterministic moving averages...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  tickFormatter={(v) => `$${v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(2)}`}
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
                  formatter={(v: any, name: any) => [v ? `$${parseFloat(v).toFixed(2)}` : '—', name]}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    paddingTop: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  name="Close Price"
                  stroke="#00E5A3"
                  strokeWidth={2.5}
                  dot={false}
                />
                {showSMA20 && (
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    name="SMA 20"
                    stroke="#FBBF24"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                )}
                {showSMA50 && (
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    name="SMA 50"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                )}
                {showSMA200 && (
                  <Line
                    type="monotone"
                    dataKey="sma200"
                    name="SMA 200"
                    stroke="#FB923C"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                )}
                {showEMA20 && (
                  <Line
                    type="monotone"
                    dataKey="ema20"
                    name="EMA 20"
                    stroke="#FF5C5C"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    connectNulls
                  />
                )}
                {showEMA50 && (
                  <Line
                    type="monotone"
                    dataKey="ema50"
                    name="EMA 50"
                    stroke="#A78BFA"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sub-Chart Selector & Component */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSubChartMode('drawdown')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                subChartMode === 'drawdown'
                  ? 'bg-[#FF5C5C]/20 text-[#FF5C5C] border border-[#FF5C5C]/40'
                  : 'bg-[#09252D] text-[#7A9EA7] hover:text-white border border-[#133F4A]'
              }`}
            >
              Underwater Drawdown (%)
            </button>
            <button
              onClick={() => setSubChartMode('volatility')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                subChartMode === 'volatility'
                  ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40'
                  : 'bg-[#09252D] text-[#7A9EA7] hover:text-white border border-[#133F4A]'
              }`}
            >
              Rolling 30D Volatility (Ann.)
            </button>
            <button
              onClick={() => setSubChartMode('returns')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                subChartMode === 'returns'
                  ? 'bg-[#124B55] text-[#00E5A3] border border-[#00E5A3]/40'
                  : 'bg-[#09252D] text-[#7A9EA7] hover:text-white border border-[#133F4A]'
              }`}
            >
              Daily Returns (%)
            </button>
          </div>

          <div className="text-xs font-mono text-[#58818B]">
            {subChartMode === 'drawdown' && 'Peak-to-trough historical drawdown'}
            {subChartMode === 'volatility' && 'Sample standard deviation scaled by sqrt(N)'}
            {subChartMode === 'returns' && 'R_t = Close_t / Close_{t-1} - 1'}
          </div>
        </div>

        <div className="h-56 w-full">
          {subChartMode === 'drawdown' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  stroke="#58818B"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
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
                  formatter={(v: any) => [`${v}%`, 'Drawdown']}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown_pct"
                  name="Drawdown"
                  stroke="#FF5C5C"
                  fill="#FF5C5C"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {subChartMode === 'volatility' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  stroke="#58818B"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
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
                  formatter={(v: any) => [`${v}%`, 'Ann. Volatility (30D)']}
                />
                <Line
                  type="monotone"
                  dataKey="rolling_vol"
                  name="Rolling Vol"
                  stroke="#FBBF24"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {subChartMode === 'returns' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  stroke="#58818B"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
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
                  formatter={(v: any) => [`${v}%`, 'Daily Return']}
                />
                <Bar
                  dataKey="daily_return_pct"
                  name="Daily Return"
                  fill="#00E5A3"
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Complete Quantitative Statistics Matrix */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
        <h3 className="text-sm font-mono font-bold text-white">
          Quantitative Statistics & Risk Summary Profile
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-center">
          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Total Return</div>
            <div
              className={`text-sm font-bold mt-1 ${
                (metrics?.total_return_pct ?? 0) >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
              }`}
            >
              {metrics ? `${metrics.total_return_pct >= 0 ? '+' : ''}${metrics.total_return_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">CAGR (Ann.)</div>
            <div
              className={`text-sm font-bold mt-1 ${
                (metrics?.annualized_return_pct ?? 0) >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
              }`}
            >
              {metrics ? `${metrics.annualized_return_pct >= 0 ? '+' : ''}${metrics.annualized_return_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Ann. Volatility</div>
            <div className="text-sm font-bold text-white mt-1">
              {metrics ? `${metrics.annualized_volatility_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Sharpe Ratio</div>
            <div className="text-sm font-bold text-[#00E5A3] mt-1">
              {metrics ? metrics.sharpe_ratio : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Max Drawdown</div>
            <div className="text-sm font-bold text-[#FF5C5C] mt-1">
              {metrics ? `-${metrics.max_drawdown_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Best Day</div>
            <div className="text-sm font-bold text-[#00E5A3] mt-1">
              {metrics ? `+${metrics.best_day_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Worst Day</div>
            <div className="text-sm font-bold text-[#FF5C5C] mt-1">
              {metrics ? `${metrics.worst_day_pct}%` : '...'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09252D] border border-[#133F4A]">
            <div className="text-[10px] text-[#6A96A0]">Avg Daily Return</div>
            <div className="text-sm font-bold text-white mt-1">
              {metrics ? `${metrics.avg_daily_return_pct}%` : '...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
