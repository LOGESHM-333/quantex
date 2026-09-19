import React, { useState, useEffect } from 'react';
import { Layers, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { AssetMeta, RegimeResponse } from '../types';
import { fetchMarketRegimes } from '../services/api';

interface RegimesViewProps {
  assets: AssetMeta[];
  demoMode: boolean;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const RegimesView: React.FC<RegimesViewProps> = ({
  assets,
  demoMode,
  selectedSymbol,
  onSelectSymbol
}) => {
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [maPeriod, setMaPeriod] = useState<number>(200);
  const [regimesData, setRegimesData] = useState<RegimeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRegimes() {
      setLoading(true);
      try {
        const res = await fetchMarketRegimes(selectedSymbol, timeRange, maPeriod, demoMode);
        if (!isMounted) return;
        setRegimesData(res.regimes);
      } catch (err) {
        console.error('Failed to load market regimes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRegimes();
    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, timeRange, maPeriod, demoMode]);

  const ranges = ['6m', '1y', '3y', '5y', 'max'];
  const maPeriods = [50, 100, 200];

  const regimeAttributions = regimesData?.performance_by_regime
    ? Object.values(regimesData.performance_by_regime)
    : [];

  const getRegimeColor = (name: string) => {
    if (name === 'BULL') return 'text-[#2E8063] bg-[#E6F4EA] border-[#2E8063]/30';
    if (name === 'BEAR') return 'text-[#C65353] bg-[#FDE8E8] border-[#C65353]/30';
    if (name === 'HIGH_VOLATILITY') return 'text-[#B27A26] bg-[#FEF3C7] border-[#B27A26]/30';
    return 'text-[#236B87] bg-[#EAF4FB] border-[#236B87]/30';
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div>
          <h2 className="text-base font-mono font-bold text-[#193B50] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#236B87]" />
            <span>Market Regime Classification & Performance Attribution</span>
          </h2>
          <p className="text-xs text-[#5E7382] mt-0.5">
            Deterministic segmentation into Bull, Bear, High Volatility, and Low Volatility environments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Asset Tabs */}
          <div className="flex items-center rounded-lg bg-[#F6F9FC] p-1 border border-[#DCE7EE]">
            {assets.map((a) => (
              <button
                key={a.symbol}
                onClick={() => onSelectSymbol(a.symbol)}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  selectedSymbol === a.symbol
                    ? 'bg-[#236B87] text-white shadow-xs'
                    : 'text-[#5E7382] hover:text-[#193B50]'
                }`}
              >
                {a.symbol}
              </button>
            ))}
          </div>

          {/* MA Period */}
          <div className="flex items-center rounded-lg bg-[#F6F9FC] p-1 border border-[#DCE7EE]">
            <span className="text-[#8A9AA5] px-2 font-semibold">MA FILTER:</span>
            {maPeriods.map((p) => (
              <button
                key={p}
                onClick={() => setMaPeriod(p)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  maPeriod === p
                    ? 'bg-[#236B87] text-white font-bold shadow-xs'
                    : 'text-[#5E7382] hover:text-[#193B50]'
                }`}
              >
                {p}D
              </button>
            ))}
          </div>

          {/* Time Range */}
          <div className="flex items-center rounded-lg bg-[#F6F9FC] p-1 border border-[#DCE7EE]">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded uppercase transition cursor-pointer ${
                  timeRange === r
                    ? 'bg-[#236B87] text-white font-bold shadow-xs'
                    : 'text-[#5E7382] hover:text-[#193B50]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regime Classification Timeline Chart */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-[#193B50]">
              {selectedSymbol} Price with {regimesData?.ma_period_used ?? maPeriod}-Day Moving Average Regime Baseline
            </h3>
            <p className="text-xs text-[#5E7382]">
              Price above MA = Bull regime • Price below MA = Bear regime
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#2E8063] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E8063]"></span> Bull (Above MA)
            </span>
            <span className="flex items-center gap-1.5 text-[#C65353] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C65353]"></span> Bear (Below MA)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-[#8A9AA5] font-mono text-xs">
              Segmenting market regimes...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={regimesData?.timeline || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7EDF2" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#738591"
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
                  stroke="#738591"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DCE7EE',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#193B50',
                    boxShadow: '0 4px 12px rgba(31,59,80,0.08)'
                  }}
                  formatter={(v: any, name: any) => [`$${parseFloat(v).toFixed(2)}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Close Price"
                  stroke="#193B50"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ma_value"
                  name={`SMA ${regimesData?.ma_period_used ?? maPeriod} Regime Line`}
                  stroke="#236B87"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Performance Attribution Breakdown Table */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <h3 className="text-sm font-mono font-bold text-[#193B50] mb-3">
          Performance Segmentation by Historical Regime
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DCE7EE] text-[#5E7382] bg-[#F6F9FC]">
                <th className="py-2.5 px-3">Regime</th>
                <th className="py-2.5 px-3 text-right">Observations</th>
                <th className="py-2.5 px-3 text-right">% of Horizon</th>
                <th className="py-2.5 px-3 text-right">Cumulative Return</th>
                <th className="py-2.5 px-3 text-right">Ann. Volatility</th>
                <th className="py-2.5 px-3 text-right">Sharpe Ratio</th>
                <th className="py-2.5 px-3 text-right">Max Drawdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7EE] text-[#193B50]">
              {regimeAttributions.map((r) => (
                <tr key={r.regime} className="hover:bg-[#F6F9FC] transition">
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getRegimeColor(r.regime)}`}>
                      {r.regime}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-[#193B50]">{r.days_count} days</td>
                  <td className="py-3 px-3 text-right text-[#5E7382]">{r.pct_of_time}%</td>
                  <td
                    className={`py-3 px-3 text-right font-bold ${
                      r.total_return_pct >= 0 ? 'text-[#2E8063]' : 'text-[#C65353]'
                    }`}
                  >
                    {r.total_return_pct >= 0 ? '+' : ''}{r.total_return_pct}%
                  </td>
                  <td className="py-3 px-3 text-right text-[#193B50]">{r.annualized_volatility_pct}%</td>
                  <td className="py-3 px-3 text-right font-bold text-[#236B87]">{r.sharpe_ratio}</td>
                  <td className="py-3 px-3 text-right text-[#C65353]">-{r.max_drawdown_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quant Regime Insights */}
      <div className="p-4 rounded-xl bg-[#F6F9FC] border border-[#DCE7EE] font-mono text-xs space-y-2">
        <div className="text-[#236B87] font-bold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>Macro Regime Attribution Takeaways</span>
        </div>
        <p className="text-[#5E7382] leading-relaxed">
          Trend-following strategies (SMA Crossover, EMA Trend) derive virtually all their positive expectancy from sustained BULL regimes while exiting during BEAR regimes. In contrast, High Volatility regimes generate elevated whipsaw risk for momentum systems, favoring statistical mean-reversion filters with tight risk limits.
        </p>
      </div>
    </div>
  );
};
