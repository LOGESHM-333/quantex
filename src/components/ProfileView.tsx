import React from 'react';
import { Shield, Award, Terminal, CheckCircle2 } from 'lucide-react';

export const ProfileView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Profile Card */}
      <div className="p-6 rounded-xl bg-white border border-[#DCE7EE] shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF4FB] border border-[#DCE7EE] flex items-center justify-center text-[#236B87] text-xl font-bold font-mono shadow-xs">
              QR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#193B50]">Senior Quantitative Strategist</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#2E8063] border border-[#2E8063]/20 font-mono">
                  VERIFIED
                </span>
              </div>
              <div className="text-xs text-[#5E7382] mt-0.5 font-mono">
                Analyst ID: #QX-8492-NY • Multi-Asset Quantitative Research Division
              </div>
              <div className="text-xs text-[#8A9AA5] mt-1">
                Primary Mandate: Multi-Asset Cross-Correlation, Volatility Regimes & Factor Backtesting
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-[#EAF4FB] text-[#236B87] text-xs font-semibold border border-[#DCE7EE] font-mono">
              CLEARANCE: LEVEL 4
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Terminal Access Specs */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-3 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#193B50] pb-2 border-b border-[#DCE7EE]">
            <Terminal className="w-4 h-4 text-[#236B87]" />
            <span>Session Credentials</span>
          </div>

          <div className="space-y-2 text-xs font-mono text-[#5E7382]">
            <div className="flex justify-between py-1 border-b border-[#F6F9FC]">
              <span>Terminal Node:</span>
              <span className="font-bold text-[#193B50]">NY-QUANTX-04</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F6F9FC]">
              <span>Session Protocol:</span>
              <span className="font-bold text-[#2E8063]">SECURE TLS 1.3</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F6F9FC]">
              <span>API Gateway:</span>
              <span className="font-bold text-[#193B50]">REST / Python v3.12</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Timezone:</span>
              <span className="font-bold text-[#193B50]">UTC / EST Sync</span>
            </div>
          </div>
        </div>

        {/* Quant Research Coverage */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-3 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#193B50] pb-2 border-b border-[#DCE7EE]">
            <Award className="w-4 h-4 text-[#236B87]" />
            <span>Universe Coverage</span>
          </div>

          <div className="space-y-2 text-xs text-[#5E7382]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8063]" />
              <span>Gold Futures (GC=F) — Macro Hedge</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8063]" />
              <span>Bitcoin (BTC-USD) — High Beta Asymmetry</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8063]" />
              <span>NVIDIA (NVDA) — AI Compute Growth</span>
            </div>
          </div>
        </div>

        {/* Audit & Compliance */}
        <div className="p-5 rounded-xl bg-white border border-[#DCE7EE] space-y-3 shadow-[0_2px_8px_rgba(31,59,80,0.05)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#193B50] pb-2 border-b border-[#DCE7EE]">
            <Shield className="w-4 h-4 text-[#236B87]" />
            <span>Audit & Compliance</span>
          </div>

          <div className="space-y-2 text-xs text-[#5E7382]">
            <div className="text-[11px] leading-relaxed">
              All strategy simulations and research exports comply with GIPS (Global Investment Performance Standards) zero look-ahead bias criteria.
            </div>
            <div className="text-[11px] text-[#8A9AA5] pt-1">
              Data synchronized across Yahoo Finance and institutional feed sockets.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
