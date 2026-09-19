import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpDown,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { AssetMeta, OHLCVRecord } from '../types';
import { fetchAssetHistory } from '../services/api';

interface MarketsViewProps {
  assets: AssetMeta[];
  demoMode: boolean;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  assets,
  demoMode,
  selectedSymbol,
  onSelectSymbol
}) => {
  const [timeRange, setTimeRange] = useState<string>('1y');
  const [history, setHistory] = useState<OHLCVRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setLoading(true);
      try {
        const res = await fetchAssetHistory(selectedSymbol, timeRange, demoMode);
        if (!isMounted) return;
        setHistory(res.history || []);
        setDataSource(res.data_source || (res.is_demo ? 'Deterministic Simulator' : 'Yahoo Finance API'));
      } catch (err) {
        console.error('Failed to load asset history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, timeRange, demoMode]);

  const ranges = ['1m', '3m', '6m', '1y', '3y', '5y', 'max'];
  const activeAsset = assets.find((a) => a.symbol === selectedSymbol) ?? assets[0];

  // Guard: if assets haven't loaded yet, show a loader
  if (!activeAsset) {
    return (
      <div className="flex items-center justify-center h-64 text-[#58818B] font-mono text-sm">
        Loading market data…
      </div>
    );
  }

  // Highs / Lows / Volume calculation
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);
  const highest = highs.length ? Math.max(...highs) : 0;
  const lowest = lows.length ? Math.min(...lows) : 0;
  const avgVolume = history.length
    ? Math.round(history.reduce((acc, cur) => acc + cur.volume, 0) / history.length)
    : 0;

  // Filtered and sorted table records
  const filteredHistory = history.filter((h) =>
    h.date.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const displayedHistory = sortAsc ? [...filteredHistory] : [...filteredHistory].reverse();

  const exportCSV = () => {
    if (!history.length) return;
    const header = 'Date,Open,High,Low,Close,Adjusted_Close,Volume\n';
    const rows = history
      .map(
        (h) => `${h.date},${h.open},${h.high},${h.low},${h.close},${h.adjusted_close},${h.volume}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSymbol}_OHLCV_${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Asset Selector Tabs & Time Range */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {assets.map((asset) => {
            const isActive = asset.symbol === selectedSymbol;
            return (
              <button
                key={asset.symbol}
                onClick={() => onSelectSymbol(asset.symbol)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#124B55] text-[#00E5A3] border border-[#00E5A3]/40 shadow-[0_0_12px_rgba(0,229,163,0.15)]'
                    : 'bg-[#09252D] text-[#7A9EA7] hover:text-white border border-[#133F4A]'
                }`}
              >
                <span>{asset.symbol}</span>
                <span className="text-[10px] text-[#5F8993] font-normal">({asset.name})</span>
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
                  ? 'bg-[#00E5A3] text-[#051518] shadow-sm'
                  : 'text-[#7A9EA7] hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Specification Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Current Price</div>
          <div className="text-base font-bold text-white mt-1">
            ${activeAsset.quote?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
          </div>
          <div
            className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
              (activeAsset.quote?.change_pct ?? 0) >= 0 ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
            }`}
          >
            {(activeAsset.quote?.change_pct ?? 0) >= 0 ? '+' : ''}
            {activeAsset.quote?.change_pct?.toFixed(2) ?? '0.00'}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Period High</div>
          <div className="text-base font-bold text-[#00E5A3] mt-1">
            ${highest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#58818B] mt-0.5">Peak in range</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Period Low</div>
          <div className="text-base font-bold text-[#FF5C5C] mt-1">
            ${lowest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#58818B] mt-0.5">Trough in range</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Avg Daily Volume</div>
          <div className="text-base font-bold text-white mt-1">
            {avgVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#58818B] mt-0.5">Shares / contracts</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Trading Convention</div>
          <div className="text-base font-bold text-[#00E5A3] mt-1">
            {activeAsset.trading_days_per_year} Days
          </div>
          <div className="text-[11px] text-[#58818B] mt-0.5">
            {activeAsset.trading_days_per_year === 365 ? 'Crypto 24/7' : 'Standard Market'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#071F26] border border-[#0F353E] shadow-lg">
          <div className="text-[10px] text-[#6996A0]">Data Feed</div>
          <div className="text-xs font-bold text-[#00E5A3] mt-1 truncate">
            {dataSource}
          </div>
          <div className="text-[11px] text-[#58818B] mt-0.5">
            {history.length} records
          </div>
        </div>
      </div>

      {/* Primary Chart with Volume Sub-chart */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <span>{activeAsset.symbol} — Price Action & Daily Volume</span>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#09252D] text-[#7A9EA7] font-normal border border-[#133F4A]">
                {activeAsset.description}
              </span>
            </h3>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09252D] hover:bg-[#0E303A] text-xs font-mono text-white border border-[#133F4A] transition shadow-xs cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5 text-[#00E5A3]" />
            <span>EXPORT CSV</span>
          </button>
        </div>

        <div className="h-80 w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-[#58818B] font-mono text-xs">
              Loading market history...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  yAxisId="price"
                  domain={['auto', 'auto']}
                  stroke="#58818B"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  domain={[0, (dataMax: number) => dataMax * 4]}
                  stroke="#476D76"
                  fontSize={9}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}k`)}
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
                  formatter={(val: any, name: any) => {
                    if (name === 'Volume') return [val.toLocaleString(), name];
                    return [`$${parseFloat(val).toFixed(2)}`, name];
                  }}
                />
                <Bar yAxisId="volume" dataKey="volume" fill="#0C343D" opacity={0.7} />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  name="Close Price"
                  stroke="#00E5A3"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#071F26] border border-[#0F353E] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-mono font-bold text-white">OHLCV Normalized Records</h3>
            <span className="text-xs font-mono text-[#58818B]">({displayedHistory.length} trading days)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#58818B]" />
              <input
                type="text"
                placeholder="Search date (YYYY-MM)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#09252D] border border-[#133F4A] text-xs font-mono text-white placeholder-[#58818B] focus:outline-none focus:border-[#00E5A3] w-48 shadow-xs"
              />
            </div>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09252D] border border-[#133F4A] text-xs font-mono text-white hover:bg-[#0E303A] cursor-pointer shadow-xs"
            >
              <ArrowUpDown className="w-3 h-3 text-[#00E5A3]" />
              <span>{sortAsc ? 'Oldest First' : 'Newest First'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 scrollbar-thin scrollbar-thumb-[#113842]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-[#09272F] text-[#8DB4BE] border-b border-[#123E49]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 text-right font-semibold">Open</th>
                <th className="py-2.5 px-3 text-right font-semibold">High</th>
                <th className="py-2.5 px-3 text-right font-semibold">Low</th>
                <th className="py-2.5 px-3 text-right font-semibold">Close</th>
                <th className="py-2.5 px-3 text-right font-semibold">Adj Close</th>
                <th className="py-2.5 px-3 text-right font-semibold">Volume</th>
                <th className="py-2.5 px-3 text-right font-semibold">Daily Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E333C] text-white">
              {displayedHistory.slice(0, 100).map((row, idx) => {
                const prev = displayedHistory[idx + (sortAsc ? -1 : 1)];
                const changePct = prev && prev.close > 0 ? ((row.close - prev.close) / prev.close) * 100 : 0;
                const isPos = changePct >= 0;

                return (
                  <tr key={row.date} className="hover:bg-[#0A2931] transition">
                    <td className="py-2 px-3 font-semibold text-white">{row.date}</td>
                    <td className="py-2 px-3 text-right text-[#7A9EA7]">${row.open.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[#00E5A3]">${row.high.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[#FF5C5C]">${row.low.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold text-white">${row.close.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[#7A9EA7]">${row.adjusted_close.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[#7A9EA7]">{row.volume.toLocaleString()}</td>
                    <td
                      className={`py-2 px-3 text-right font-semibold ${
                        isPos ? 'text-[#00E5A3]' : 'text-[#FF5C5C]'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {changePct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
