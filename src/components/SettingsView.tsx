import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  CheckCircle2,
  Cpu,
  Database
} from 'lucide-react';

interface SettingsViewProps {
  demoMode: boolean;
  onToggleDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  demoMode,
  onToggleDemo
}) => {
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.0);
  const [defaultCapital, setDefaultCapital] = useState<number>(100000);
  const [slippageBps, setSlippageBps] = useState<number>(10);
  const [cacheTtlMinutes, setCacheTtlMinutes] = useState<number>(15);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#193B50] flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#236B87]" />
              <span>Platform Settings & Quantitative Computation Parameters</span>
            </h2>
            <p className="text-xs text-[#5E7382] mt-0.5">
              Configure deterministic backtesting models, risk-free baseline rates, and data synchronization
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#236B87] hover:bg-[#1B5870] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>SAVED</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>SAVE PREFERENCES</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Risk & Model Calibration */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-4 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#193B50] pb-3 border-b border-[#DCE7EE]">
            <Shield className="w-4 h-4 text-[#236B87]" />
            <span>Risk Calculation Baseline</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#5E7382] mb-1 font-medium">
                Annual Risk-Free Rate (Rf) for Sharpe Calculation
              </label>
              <select
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
                className="w-full py-2 px-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] text-[#193B50] focus:outline-none focus:border-[#236B87]"
              >
                <option value={0.0}>0.0% (Zero Baseline - Institutional Standard)</option>
                <option value={2.0}>2.0% (Long-Term Inflation Target)</option>
                <option value={4.25}>4.25% (US 3-Month Treasury Bill Yield)</option>
                <option value={5.0}>5.0% (Cash Equivalent Benchmark)</option>
              </select>
              <div className="text-[11px] text-[#8A9AA5] mt-1 font-mono">
                Sharpe Formula: (Annualized Return - Rf) / Annualized Volatility
              </div>
            </div>

            <div>
              <label className="block text-[#5E7382] mb-1 font-medium">
                Default Portfolio Initial Capital ($)
              </label>
              <input
                type="number"
                value={defaultCapital}
                onChange={(e) => setDefaultCapital(parseInt(e.target.value) || 10000)}
                className="w-full py-2 px-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] text-[#193B50] font-mono focus:outline-none focus:border-[#236B87]"
              />
              <div className="text-[11px] text-[#8A9AA5] mt-1 font-mono">
                Allocated across benchmark strategy tests ($10k - $10M)
              </div>
            </div>

            <div>
              <label className="block text-[#5E7382] mb-1 font-medium">
                Execution Slippage & Fee Allowance (Basis Points)
              </label>
              <input
                type="number"
                value={slippageBps}
                onChange={(e) => setSlippageBps(parseInt(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] text-[#193B50] font-mono focus:outline-none focus:border-[#236B87]"
              />
              <div className="text-[11px] text-[#8A9AA5] mt-1 font-mono">
                10 bps = 0.10% deducted per executed position turn
              </div>
            </div>
          </div>
        </div>

        {/* Data Feeds & Offline Demo Mode */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-4 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#193B50] pb-3 border-b border-[#DCE7EE]">
            <Database className="w-4 h-4 text-[#236B87]" />
            <span>Market Data Feed & Engine Mode</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#193B50]">Execution Mode</div>
                <div className="text-[#5E7382] text-[11px] mt-0.5">
                  {demoMode ? 'Calibrated Offline Demo (Zero API dependance)' : 'Live Yahoo Finance Market Feeds'}
                </div>
              </div>

              <button
                onClick={onToggleDemo}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer font-mono ${
                  demoMode
                    ? 'bg-[#FEF3C7] text-[#B27A26] border border-[#B27A26]/30 hover:bg-[#FDE68A]'
                    : 'bg-[#236B87] text-white hover:bg-[#1B5870]'
                }`}
              >
                {demoMode ? 'DEMO ACTIVE' : 'LIVE ACTIVE'}
              </button>
            </div>

            <div>
              <label className="block text-[#5E7382] mb-1 font-medium">
                In-Memory Cache TTL (Minutes)
              </label>
              <select
                value={cacheTtlMinutes}
                onChange={(e) => setCacheTtlMinutes(parseInt(e.target.value))}
                className="w-full py-2 px-3 rounded-lg bg-[#F6F9FC] border border-[#DCE7EE] text-[#193B50] focus:outline-none focus:border-[#236B87]"
              >
                <option value={5}>5 Minutes (High frequency quotes)</option>
                <option value={15}>15 Minutes (Recommended standard)</option>
                <option value={60}>60 Minutes (Bandwidth conservation)</option>
              </select>
            </div>

            <div className="p-3.5 rounded-lg bg-[#EAF4FB] border border-[#DCE7EE] text-[#236B87]">
              <div className="flex items-center gap-2 font-bold">
                <Cpu className="w-4 h-4" />
                <span>Deterministic Engine Guarantee</span>
              </div>
              <p className="text-[11px] text-[#5E7382] mt-1 leading-relaxed">
                Strategy signals execute on <code className="font-mono font-bold text-[#193B50]">t+1</code> open prices relative to indicator confirmation at <code className="font-mono font-bold text-[#193B50]">t</code> close.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
