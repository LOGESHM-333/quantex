import React, { useState, useEffect } from 'react';
import { GitFork, Info, Shield, Zap } from 'lucide-react';
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
import { fetchCorrelation } from '../services/api';

interface CorrelationViewProps {
  demoMode: boolean;
}

export const CorrelationView: React.FC<CorrelationViewProps> = ({ demoMode }) => {
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [windowSize, setWindowSize] = useState<number>(60);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [rollingSeries, setRollingSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchCorrelation(timeRange, windowSize, demoMode);
        if (!isMounted) return;
        setMatrix(res.matrix || {});
        setRollingSeries(res.rolling_series || []);
      } catch (err) {
        console.error('Failed to load correlation analysis:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [timeRange, windowSize, demoMode]);

  const symbols = ['GC=F', 'BTC-USD', 'NVDA'];
  const labels: Record<string, string> = {
    'GC=F': 'Gold Futures',
    'BTC-USD': 'Bitcoin',
    NVDA: 'NVIDIA Corp'
  };

  const ranges = ['3m', '6m', '1y', '3y', 'max'];
  const windows = [30, 60, 90, 180];

  const getCellBg = (val: number | undefined) => {
    if (val === undefined) return 'bg-[#F6F9FC] text-[#8A9AA5] border border-[#DCE7EE]';
    if (val >= 0.99) return 'bg-[#EAF4FB] text-[#236B87] font-bold border border-[#236B87]/30';
    if (val > 0.5) return 'bg-[#E6F4EA] text-[#2E8063] font-bold border border-[#2E8063]/30';
    if (val > 0.2) return 'bg-[#E6F4EA] text-[#2E8063] border border-[#2E8063]/20';
    if (val > -0.2) return 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE]';
    if (val > -0.5) return 'bg-[#FDE8E8] text-[#C65353] border border-[#C65353]/20';
    return 'bg-[#FDE8E8] text-[#9B2C2C] font-bold border border-[#C65353]/30';
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div>
          <h2 className="text-base font-mono font-bold text-[#193B50] flex items-center gap-2">
            <GitFork className="w-4 h-4 text-[#236B87]" />
            <span>Cross-Asset Return Correlation & Rolling Dynamics</span>
          </h2>
          <p className="text-xs text-[#5E7382] mt-0.5">
            Pearson coefficient r on synchronized daily return streams
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range */}
          <div className="flex items-center rounded-lg bg-[#F6F9FC] p-1 border border-[#DCE7EE]">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-mono rounded uppercase transition cursor-pointer ${
                  timeRange === r
                    ? 'bg-[#236B87] text-white font-bold shadow-xs'
                    : 'text-[#5E7382] hover:text-[#193B50]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Rolling Window */}
          <div className="flex items-center rounded-lg bg-[#F6F9FC] p-1 border border-[#DCE7EE] text-xs font-mono">
            <span className="text-[#8A9AA5] px-2">WINDOW:</span>
            {windows.map((w) => (
              <button
                key={w}
                onClick={() => setWindowSize(w)}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  windowSize === w
                    ? 'bg-[#236B87] text-white font-bold shadow-xs'
                    : 'text-[#5E7382] hover:text-[#193B50]'
                }`}
              >
                {w}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Correlation Matrix & Quantitative Interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix Card */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] flex flex-col justify-between shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div>
            <div className="text-sm font-mono font-bold text-[#193B50] mb-3">
              Synchronized Pearson Correlation Matrix
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FC]">
                    <th className="p-3 text-left text-[#5E7382] border-b border-[#DCE7EE]">Asset</th>
                    {symbols.map((s) => (
                      <th key={s} className="p-3 text-[#193B50] border-b border-[#DCE7EE] font-bold">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE7EE]">
                  {symbols.map((rowSym) => (
                    <tr key={rowSym}>
                      <td className="p-3 text-left font-semibold text-[#193B50] border-r border-[#DCE7EE]">
                        <div>{rowSym}</div>
                        <div className="text-[10px] text-[#8A9AA5] font-normal">{labels[rowSym]}</div>
                      </td>
                      {symbols.map((colSym) => {
                        const val = matrix[rowSym]?.[colSym];
                        return (
                          <td key={colSym} className="p-3">
                            <span className={`inline-block px-3 py-1.5 rounded-lg ${getCellBg(val)}`}>
                              {val !== undefined ? (val >= 0 ? `+${val.toFixed(4)}` : val.toFixed(4)) : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#DCE7EE] flex items-center justify-between text-[11px] font-mono text-[#5E7382]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#E6F4EA] border border-[#2E8063]/40"></span> Pos Correlated (&gt;0.2)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#F6F9FC] border border-[#DCE7EE]"></span> Uncorrelated (~0.0)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#FDE8E8] border border-[#C65353]/40"></span> Safe-Haven (&lt;-0.2)
            </div>
          </div>
        </div>

        {/* Quant Insights Panel */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] flex flex-col justify-between shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div>
            <div className="text-sm font-mono font-bold text-[#193B50] mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#236B87]" />
              <span>Quantitative Diversification Findings</span>
            </div>

            <div className="space-y-3 font-mono text-xs text-[#193B50]">
              <div className="p-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE]">
                <div className="font-bold text-[#B27A26] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Gold (GC=F) Hedging Properties
                </div>
                <p className="mt-1 text-[#5E7382] leading-relaxed">
                  Gold exhibits historically weak correlation with both Bitcoin ({matrix['GC=F']?.['BTC-USD'] ?? '0.00'}) and NVIDIA ({matrix['GC=F']?.['NVDA'] ?? '0.00'}), demonstrating true non-correlated portfolio diversification benefit across economic cycles.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE]">
                <div className="font-bold text-[#236B87] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Bitcoin vs NVIDIA Tech Beta
                </div>
                <p className="mt-1 text-[#5E7382] leading-relaxed">
                  Bitcoin and NVIDIA return correlation ({matrix['BTC-USD']?.['NVDA'] ?? '0.00'}) reflects shared sensitivity to global dollar liquidity conditions, interest rate expectations, and risk-on sentiment in algorithmic trading books.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[#EAF4FB] border border-[#236B87]/30 text-xs font-mono text-[#236B87]">
            Portfolio Implications: Combining Gold with Bitcoin and NVIDIA lowers aggregate portfolio volatility and raises risk-adjusted Sharpe ratio significantly compared to pure equity or crypto holding.
          </div>
        </div>
      </div>

      {/* Rolling Correlation Chart */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-[#193B50]">
              Rolling {windowSize}-Day Pearson Correlation Trajectory
            </h3>
            <p className="text-xs text-[#5E7382]">
              Tracking time-varying co-movements across shifting macro regimes
            </p>
          </div>
          <div className="text-xs font-mono text-[#8A9AA5]">
            {rollingSeries.length} rolling windows
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-[#8A9AA5] font-mono text-xs">
              Calculating rolling correlations...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingSeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  domain={[-1, 1]}
                  stroke="#738591"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => v.toFixed(2)}
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
                  formatter={(v: any) => [typeof v === 'number' ? v.toFixed(4) : v, '']}
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
                  dataKey="btc_nvda"
                  name="BTC vs NVDA"
                  stroke="#236B87"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="gold_btc"
                  name="Gold vs BTC"
                  stroke="#B27A26"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="gold_nvda"
                  name="Gold vs NVDA"
                  stroke="#5E7382"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
