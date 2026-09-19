import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Trash2,
  PlaySquare,
  ShieldAlert,
  RefreshCw,
  Clock
} from 'lucide-react';
import { SavedResearch, RobustnessGridResponse } from '../types';
import { fetchSavedResearch, deleteResearchApi, fetchRobustnessGrid } from '../services/api';

interface ResearchLabViewProps {
  demoMode: boolean;
  selectedSymbol: string;
  onLoadIntoBacktester: (saved: SavedResearch) => void;
}

export const ResearchLabView: React.FC<ResearchLabViewProps> = ({
  demoMode,
  selectedSymbol,
  onLoadIntoBacktester
}) => {
  const [savedRuns, setSavedRuns] = useState<SavedResearch[]>([]);
  const [gridData, setGridData] = useState<RobustnessGridResponse | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<'return' | 'sharpe' | 'drawdown'>('sharpe');
  const [loadingGrid, setLoadingGrid] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<string>('1y');

  const loadSaved = async () => {
    try {
      const res = await fetchSavedResearch();
      setSavedRuns(res.saved || []);
    } catch (err) {
      console.error('Failed to load saved research:', err);
    }
  };

  const loadHeatmap = async () => {
    setLoadingGrid(true);
    try {
      const res = await fetchRobustnessGrid(selectedSymbol, timeRange, demoMode);
      setGridData(res.grid);
    } catch (err) {
      console.error('Failed to compute parameter sensitivity heatmap:', err);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    loadSaved();
    loadHeatmap();
  }, [selectedSymbol, timeRange, demoMode]);

  const handleDelete = async (id: string) => {
    try {
      await deleteResearchApi(id);
      setSavedRuns((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete research run:', err);
    }
  };

  const getHeatmapCellColor = (val: number | null) => {
    if (val === null) return 'bg-[#F6F9FC] text-[#8A9AA5] border border-[#DCE7EE]';

    if (heatmapMetric === 'return') {
      if (val > 40) return 'bg-[#E6F4EA] text-[#2E8063] font-bold border border-[#2E8063]/30';
      if (val > 15) return 'bg-[#E6F4EA] text-[#2E8063] font-semibold border border-[#2E8063]/20';
      if (val > 0) return 'bg-[#EAF4FB] text-[#236B87] border border-[#236B87]/20';
      if (val > -10) return 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE]';
      return 'bg-[#FDE8E8] text-[#C65353] font-bold border border-[#C65353]/20';
    } else if (heatmapMetric === 'sharpe') {
      if (val > 1.5) return 'bg-[#E6F4EA] text-[#2E8063] font-bold border border-[#2E8063]/30';
      if (val > 1.0) return 'bg-[#E6F4EA] text-[#2E8063] font-semibold border border-[#2E8063]/20';
      if (val > 0.5) return 'bg-[#EAF4FB] text-[#236B87] border border-[#236B87]/20';
      if (val > 0.0) return 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE]';
      return 'bg-[#FDE8E8] text-[#C65353] font-bold border border-[#C65353]/20';
    } else {
      // drawdown
      if (val < 15) return 'bg-[#E6F4EA] text-[#2E8063] font-bold border border-[#2E8063]/20';
      if (val < 25) return 'bg-[#FEF3C7] text-[#B27A26] border border-[#B27A26]/20';
      return 'bg-[#FDE8E8] text-[#C65353] font-bold border border-[#C65353]/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] flex flex-wrap items-center justify-between gap-4 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div>
          <h2 className="text-base font-mono font-bold text-[#193B50] flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#236B87]" />
            <span>Quantitative Research Lab & Robustness Analysis</span>
          </h2>
          <p className="text-xs text-[#5E7382] mt-0.5">
            Parameter sensitivity surface grid & version-controlled historical backtest runs
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={loadHeatmap}
            disabled={loadingGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F6F9FC] text-[#193B50] border border-[#DCE7EE] transition cursor-pointer font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGrid ? 'animate-spin' : ''}`} />
            <span>RECOMPUTE GRID</span>
          </button>
        </div>
      </div>

      {/* Robustness / Parameter Sensitivity Heatmap */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-4 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold text-[#193B50] flex items-center gap-2">
              <span>SMA Crossover Parameter Sensitivity Surface on {selectedSymbol}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF4FB] text-[#236B87] font-normal border border-[#236B87]/20">
                Grid Search
              </span>
            </h3>
            <p className="text-xs text-[#5E7382]">
              Evaluates parameter stability to avoid overfitting (p-hacking)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#5E7382] font-semibold">METRIC:</span>
            <button
              onClick={() => setHeatmapMetric('sharpe')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                heatmapMetric === 'sharpe'
                  ? 'bg-[#236B87] text-white font-bold shadow-xs'
                  : 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE] hover:text-[#193B50]'
              }`}
            >
              Sharpe Ratio
            </button>
            <button
              onClick={() => setHeatmapMetric('return')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                heatmapMetric === 'return'
                  ? 'bg-[#236B87] text-white font-bold shadow-xs'
                  : 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE] hover:text-[#193B50]'
              }`}
            >
              Total Return %
            </button>
            <button
              onClick={() => setHeatmapMetric('drawdown')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                heatmapMetric === 'drawdown'
                  ? 'bg-[#236B87] text-white font-bold shadow-xs'
                  : 'bg-[#F6F9FC] text-[#5E7382] border border-[#DCE7EE] hover:text-[#193B50]'
              }`}
            >
              Max Drawdown %
            </button>
          </div>
        </div>

        {/* Heatmap Matrix Table */}
        <div className="overflow-x-auto">
          {loadingGrid ? (
            <div className="py-12 text-center text-[#8A9AA5] font-mono text-xs">
              Calculating 25 parameter simulations across historical sessions...
            </div>
          ) : gridData ? (
            <table className="w-full font-mono text-xs text-center border-collapse">
              <thead>
                <tr className="bg-[#F6F9FC]">
                  <th className="p-3 text-left text-[#5E7382] border-b border-[#DCE7EE]">
                    Fast \ Slow MA
                  </th>
                  {gridData.slow_mas.map((slow) => (
                    <th key={slow} className="p-3 text-[#193B50] border-b border-[#DCE7EE] font-bold">
                      Slow {slow}D
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7EE]">
                {gridData.fast_mas.map((fast, rowIdx) => (
                  <tr key={fast}>
                    <td className="p-3 text-left font-bold text-[#193B50] border-r border-[#DCE7EE]">
                      Fast {fast}D
                    </td>
                    {gridData.slow_mas.map((slow, colIdx) => {
                      let cellVal: number | null = null;
                      if (heatmapMetric === 'return') cellVal = gridData.return_matrix[rowIdx][colIdx];
                      else if (heatmapMetric === 'sharpe') cellVal = gridData.sharpe_matrix[rowIdx][colIdx];
                      else cellVal = gridData.drawdown_matrix[rowIdx][colIdx];

                      return (
                        <td key={slow} className="p-2">
                          <span
                            className={`inline-block w-full py-2 rounded-lg text-center ${getHeatmapCellColor(
                              cellVal
                            )}`}
                          >
                            {cellVal !== null
                              ? heatmapMetric === 'return'
                                ? `${cellVal >= 0 ? '+' : ''}${cellVal}%`
                                : heatmapMetric === 'sharpe'
                                ? cellVal.toFixed(2)
                                : `-${cellVal}%`
                              : 'N/A'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* Disclaimer */}
        <div className="p-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] text-[11px] font-mono text-[#5E7382] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#B27A26] shrink-0" />
          <span>
            {gridData?.disclaimer ||
              'Historical parameter sensitivity analysis only. Past performance does not guarantee future results.'}
          </span>
        </div>
      </div>

      {/* Saved Backtests & Research Runs */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-4 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-[#193B50] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#236B87]" />
            <span>Saved Quantitative Experiments ({savedRuns.length})</span>
          </h3>
        </div>

        {savedRuns.length === 0 ? (
          <div className="py-8 text-center text-[#8A9AA5] font-mono text-xs border border-dashed border-[#DCE7EE] rounded-lg bg-[#F6F9FC]">
            No saved experiments yet. Run a backtest in the Backtesting tab and click &quot;Save Experiment&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {savedRuns.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-xl bg-[#F6F9FC] border border-[#DCE7EE] flex flex-wrap items-center justify-between gap-4 font-mono text-xs hover:border-[#236B87]/40 transition"
              >
                <div>
                  <div className="font-bold text-[#193B50] text-sm flex items-center gap-2">
                    <span>{run.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF4FB] text-[#236B87] font-normal border border-[#236B87]/20">
                      {run.symbol} • {run.strategy}
                    </span>
                  </div>
                  <div className="text-[#5E7382] text-[11px] mt-1 flex items-center gap-4">
                    <span>Created: {new Date(run.createdAt).toLocaleString()}</span>
                    <span>Params: {JSON.stringify(run.parameters)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        (run.resultsSummary?.total_return_pct ?? 0) >= 0
                          ? 'text-[#2E8063]'
                          : 'text-[#C65353]'
                      }`}
                    >
                      Return: {(run.resultsSummary?.total_return_pct ?? 0) >= 0 ? '+' : ''}
                      {run.resultsSummary?.total_return_pct}%
                    </div>
                    <div className="text-[11px] text-[#5E7382]">
                      Sharpe: {run.resultsSummary?.sharpe_ratio} • Win: {run.resultsSummary?.win_rate_pct}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLoadIntoBacktester(run)}
                      className="p-2 rounded-lg bg-white hover:bg-[#EAF4FB] text-[#236B87] border border-[#DCE7EE] transition cursor-pointer"
                      title="Load into Backtester"
                    >
                      <PlaySquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(run.id)}
                      className="p-2 rounded-lg bg-white hover:bg-[#FDE8E8] text-[#5E7382] hover:text-[#C65353] border border-[#DCE7EE] transition cursor-pointer"
                      title="Delete Run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
