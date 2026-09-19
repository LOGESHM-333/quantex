import React from 'react';
import { BookOpen, PlaySquare, ArrowRight } from 'lucide-react';

interface StrategiesViewProps {
  onSelectStrategyToBacktest: (strat: string) => void;
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({ onSelectStrategyToBacktest }) => {
  const strategies = [
    {
      code: 'SMA_CROSSOVER',
      name: 'Dual Simple Moving Average Crossover',
      category: 'Trend Following',
      difficulty: 'Introductory Quant',
      formula: 'SMA_n(t) = (1/n) * sum(P_{t-i}, i=0..n-1)',
      tradeRule: 'LONG if SMA_Fast > SMA_Slow; FLAT (Cash) if SMA_Fast <= SMA_Slow',
      description:
        'Classic trend-following system. Filtering short-term price fluctuations to capture persistent multi-month momentum while shedding drawdown during protracted bear markets.',
      strengths: ['Low trade churn', 'Capital preservation in severe bear markets', 'Simple parameter space'],
      limitations: ['Whipsaw losses in choppy sideways markets', 'Lagging entry at market bottoms']
    },
    {
      code: 'EMA_TREND',
      name: 'Exponential Moving Average Trend System',
      category: 'Momentum / Trend',
      difficulty: 'Intermediate Quant',
      formula: 'EMA(t) = alpha * P(t) + (1 - alpha) * EMA(t-1), where alpha = 2 / (N + 1)',
      tradeRule: 'LONG if EMA_Fast > EMA_Slow; FLAT if EMA_Fast <= EMA_Slow',
      description:
        'Applies exponential weighting to favor recent prices over distant history. Accelerates responsiveness to trend shifts while dampening tail noise.',
      strengths: ['Faster signal reaction than SMA', 'Captures early stages of sharp breakouts'],
      limitations: ['Higher sensitivity to false intraday/daily breakout spikes']
    },
    {
      code: 'MOMENTUM',
      name: 'Lookback Rate-of-Change Momentum',
      category: 'Cross-Sectional Factor',
      difficulty: 'Institutional Factor Model',
      formula: 'ROC(t, N) = (P_t - P_{t-N}) / P_{t-N}',
      tradeRule: 'LONG if ROC(t, N) > Threshold; FLAT if ROC(t, N) <= Threshold',
      description:
        'Exploits behavioral investor under-reaction to positive news and institutional fund flows. Rides assets exhibiting strong velocity relative to their trailing baseline.',
      strengths: ['Captures explosive speculative runs in high-beta assets (Bitcoin, NVDA)'],
      limitations: ['Severe momentum crashes when macro liquidity abruptly tightens']
    },
    {
      code: 'MEAN_REVERSION',
      name: 'Statistical Mean Reversion (Z-Score)',
      category: 'Statistical Arbitrage',
      difficulty: 'Advanced Stat-Arb',
      formula: 'Z(t) = (P_t - mu_{N,t}) / sigma_{N,t}',
      tradeRule: 'LONG if Z < Z_Entry (Oversold); EXIT if Z > Z_Exit (Mean Reverted)',
      description:
        'Models asset price as a stationary Ornstein-Uhlenbeck style process reverting toward historical rolling average. Buys statistical extremes when standard deviation deviations stretch.',
      strengths: ['Outperforms in range-bound and mean-reverting regimes (Commodities/Gold)'],
      limitations: ['Catastrophic risk if market experiences a structural trend breakout against position']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <h2 className="text-base font-mono font-bold text-[#193B50] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#236B87]" />
          <span>Quantitative Strategy Library & Algorithmic Formulations</span>
        </h2>
        <p className="text-xs text-[#5E7382] mt-0.5">
          Mathematical definitions, trading mechanics, and deterministic execution rules
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies.map((strat) => (
          <div
            key={strat.code}
            className="p-5 rounded-xl bg-white border border-[#DCE7EE] flex flex-col justify-between hover:border-[#236B87]/50 transition shadow-[0_2px_8px_rgba(31,59,80,0.05)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#236B87] uppercase tracking-wider">
                  {strat.category}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF4FB] text-[#236B87] border border-[#DCE7EE]">
                  {strat.difficulty}
                </span>
              </div>

              <h3 className="text-base font-mono font-bold text-[#193B50] mt-1.5">{strat.name}</h3>
              <p className="text-xs text-[#5E7382] mt-2 leading-relaxed">{strat.description}</p>

              {/* Mathematical Formulation */}
              <div className="mt-4 p-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] font-mono text-xs">
                <div className="text-[10px] text-[#8A9AA5] uppercase tracking-wider font-semibold">Mathematical Formula</div>
                <div className="text-[#236B87] font-bold mt-0.5 overflow-x-auto">{strat.formula}</div>
                <div className="text-[10px] text-[#8A9AA5] uppercase tracking-wider mt-2 font-semibold">Execution Logic</div>
                <div className="text-[#193B50] mt-0.5">{strat.tradeRule}</div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono">
                <div className="p-2.5 rounded bg-[#E6F4EA] border border-[#2E8063]/30">
                  <div className="text-[#2E8063] font-bold mb-1">Advantages</div>
                  <ul className="text-[#5E7382] space-y-1 list-disc list-inside">
                    {strat.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded bg-[#FDE8E8] border border-[#C65353]/30">
                  <div className="text-[#C65353] font-bold mb-1">Risk Factors</div>
                  <ul className="text-[#5E7382] space-y-1 list-disc list-inside">
                    {strat.limitations.map((l, idx) => (
                      <li key={idx}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#DCE7EE]">
              <button
                onClick={() => onSelectStrategyToBacktest(strat.code)}
                className="w-full py-2.5 rounded-lg bg-[#236B87] hover:bg-[#1B5870] text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PlaySquare className="w-3.5 h-3.5 text-white" />
                <span>LOAD & BACKTEST THIS STRATEGY</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
