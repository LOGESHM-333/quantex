import React from 'react';
import { RefreshCw, TrendingUp, ArrowUp, ArrowDown, ListFilter, RotateCcw } from 'lucide-react';
import { AssetMeta } from '../types';

interface LeftWidgetRailProps {
  assets: AssetMeta[];
  onSelectAsset?: (symbol: string) => void;
}

// Sparkline SVG generator with gradient fill under curve
const MiniSparkline: React.FC<{ data: number[]; isPositive: boolean; id: string }> = ({
  data,
  isPositive,
  id
}) => {
  if (!data || data.length < 2) {
    return <div className="w-20 h-7 bg-slate-100 rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 84;
  const height = 28;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = isPositive ? '#10B981' : '#EF4444';
  const fillGradientId = `spark-grad-${id}`;

  const firstX = 0;
  const lastX = width;
  const bottomY = height;
  const areaPath = `M ${points.split(' ')[0]} L ${points.replace(/ /g, ' L ')} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillGradientId})`} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const LeftWidgetRail: React.FC<LeftWidgetRailProps> = ({ assets, onSelectAsset }) => {
  // Compute top gainer and top loser from live assets or fallback
  const sorted = [...assets].sort((a, b) => (b.quote?.change_pct ?? 0) - (a.quote?.change_pct ?? 0));
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  // Calibrated sparkline series matching reference aesthetic
  const gainerPoints = [10, 11, 13, 12, 14, 15, 17, 16, 19, 21, 23, 26];
  const loserPoints = [26, 24, 25, 22, 20, 19, 17, 18, 15, 14, 12, 11];
  const portfolioGrowthPoints = [100, 101, 102, 104, 103, 105, 106, 108, 107, 109, 111];

  return (
    <div className="w-[210px] sm:w-[220px] 2xl:w-[230px] shrink-0 flex flex-col gap-3.5 select-none">
      {/* 1. Market Sentiment Card */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E1ECEF] shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
          <span>Market Sentiment</span>
        </div>

        <div className="flex items-center gap-3 pt-0.5">
          {/* Circular Donut Gauge in Coral/Orange */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-orange-500"
                strokeDasharray="42, 100"
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>

          <div>
            <div className="text-base font-bold text-[#E65100] font-mono leading-none tracking-tight">
              -12.26%
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-1 leading-tight">
              <span className="text-[#E65100] font-semibold">↓ 12.26%</span>
              <span>vs last 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Portfolio Growth Card */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E1ECEF] shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Portfolio Growth</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-lg font-bold text-emerald-600 font-mono leading-none tracking-tight">
              +8.45%
            </div>
            <div className="text-[10px] text-emerald-700 flex items-center gap-0.5 mt-1 font-semibold">
              <ArrowUp className="w-2.5 h-2.5" />
              <span>8.45%</span>
            </div>
          </div>
          <MiniSparkline data={portfolioGrowthPoints} isPositive={true} id="growth" />
        </div>
      </div>

      {/* 3. Top Gainers Card */}
      <div
        onClick={() => topGainer && onSelectAsset?.(topGainer.symbol)}
        className="p-3.5 rounded-2xl bg-white border border-[#E1ECEF] shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 space-y-1 hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ArrowUp className="w-2.5 h-2.5" />
          </div>
          <span>Top Gainers</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-slate-800 font-mono leading-none">
              SBI 12.48%
            </div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-1 font-semibold">
              <ArrowUp className="w-2.5 h-2.5" />
              <span>12.48%</span>
            </div>
          </div>
          <MiniSparkline data={gainerPoints} isPositive={true} id="gainers" />
        </div>
      </div>

      {/* 4. Top Losers Card */}
      <div
        onClick={() => topLoser && onSelectAsset?.(topLoser.symbol)}
        className="p-3.5 rounded-2xl bg-white border border-[#E1ECEF] shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 space-y-1 hover:border-red-300 transition cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-500">
            <ArrowDown className="w-2.5 h-2.5" />
          </div>
          <span>Top Losers</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-slate-800 font-mono leading-none">
              TCS -5.21%
            </div>
            <div className="text-[10px] text-red-500 flex items-center gap-0.5 mt-1 font-semibold">
              <ArrowDown className="w-2.5 h-2.5" />
              <span>5.21%</span>
            </div>
          </div>
          <MiniSparkline data={loserPoints} isPositive={false} id="losers" />
        </div>
      </div>

      {/* 5. Recent Activity Card */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E1ECEF] shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="w-3.5 h-0.5 bg-slate-400 rounded" />
            <div className="w-2.5 h-0.5 bg-slate-400 rounded" />
            <div className="w-3 h-0.5 bg-slate-400 rounded" />
          </div>
          <span>Recent Activity</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0 shadow-[0_0_4px_rgba(20,184,166,0.6)]" />
            <div>
              <div className="text-slate-800 text-[11px] font-medium leading-tight">Bought 10 shares of RELIANCE</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Apr 19, 2025</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0 shadow-[0_0_4px_rgba(20,184,166,0.6)]" />
            <div>
              <div className="text-slate-800 text-[11px] font-medium leading-tight">Sold 5 shares of HDFC</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Apr 18, 2025</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0 shadow-[0_0_4px_rgba(20,184,166,0.6)]" />
            <div>
              <div className="text-slate-800 text-[11px] font-medium leading-tight">Bought 20 shares of TCS</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Apr 18, 2025</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom VP circle avatar */}
      <div className="pt-1 flex items-center">
        <div className="w-8 h-8 rounded-full bg-[#FA6B6B] text-white font-bold flex items-center justify-center text-xs shadow-sm">
          VP
        </div>
      </div>
    </div>
  );
};

