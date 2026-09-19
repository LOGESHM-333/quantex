import React from 'react';
import { BellRing, Volume2, VolumeX, Radio, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface WindowsEmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  elapsedSeconds: number;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (val: boolean) => void;
  volume: number;
  setVolume: (val: number) => void;
}

export const WindowsEmergencyAlertModal: React.FC<WindowsEmergencyAlertModalProps> = ({
  isOpen,
  onClose,
  elapsedSeconds,
  soundEnabled,
  setSoundEnabled,
  voiceEnabled,
  setVoiceEnabled,
  volume,
  setVolume
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#071E24] border-2 border-[#FF1744] shadow-[0_0_60px_#FF174470] rounded-3xl overflow-hidden flex flex-col">
        
        {/* Top Windows Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#FF1744] via-[#D50000] to-[#B71C1C] text-white">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-black text-sm tracking-wider uppercase">
              🚨 QUANTX WINDOWS EMERGENCY ALERT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-black/40 text-white font-mono font-bold text-xs border border-white/20 animate-pulse">
              LIVE: {elapsedSeconds}s
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-black/30 hover:bg-black/60 flex items-center justify-center transition cursor-pointer"
              title="Close Alert and Silence Siren"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Animated Alarm Beacon & Urgent Notice */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF1744]/20 border border-[#FF1744] flex items-center justify-center text-[#FF1744] shadow-[0_0_25px_#FF174440] shrink-0 animate-bounce">
              <BellRing className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white font-mono tracking-tight">
                CRITICAL VOLATILITY SPIKE IN PROGRESS
              </h3>
              <p className="text-xs text-[#A2C8D2] font-mono leading-relaxed">
                Emergency ambulance siren is <strong className="text-[#FF5C5C]">actively producing sound continuously</strong>. The alarm sound will NOT stop until you close or acknowledge this Windows alert dialog.
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#05171B] border border-[#0F353E]">
            <div className="text-center p-2 rounded-xl bg-[#082228]">
              <div className="text-[10px] font-mono text-[#6E9CA7] uppercase">Gold (GC=F)</div>
              <div className="text-xs font-mono font-bold text-[#FF5C5C] mt-0.5">58.4% Vol</div>
              <div className="text-[9px] font-mono text-[#00E5A3]">2.42x Spike</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-[#082228]">
              <div className="text-[10px] font-mono text-[#6E9CA7] uppercase">Bitcoin</div>
              <div className="text-xs font-mono font-bold text-[#FF1744] mt-0.5">67.2% Vol</div>
              <div className="text-[9px] font-mono text-[#00E5A3]">2.81x Spike</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-[#082228]">
              <div className="text-[10px] font-mono text-[#6E9CA7] uppercase">NVDA</div>
              <div className="text-xs font-mono font-bold text-[#F5A623] mt-0.5">42.1% Vol</div>
              <div className="text-[9px] font-mono text-[#00E5A3]">1.85x Spike</div>
            </div>
          </div>

          {/* Quick Sound & Volume Bar on Modal */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#05171B] border border-[#0F353E] text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  soundEnabled ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A340]' : 'bg-[#0A2931] text-[#6996A0]'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span>{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  voiceEnabled ? 'bg-[#00E5A320] text-[#00E5A3] border border-[#00E5A340]' : 'bg-[#0A2931] text-[#6996A0]'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-[#00E5A3] bg-[#0A2931] rounded cursor-pointer"
              />
              <span className="text-[10px] text-[#6E9CA7] w-6">{(volume * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Primary Action Button to Close Alert & Stop Sound */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1744] via-[#D50000] to-[#B71C1C] text-white font-mono font-black text-sm tracking-wider shadow-[0_0_30px_#FF174470] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>🛑 CLOSE WINDOWS ALERT & SILENCE SIREN</span>
            </button>
            
            <p className="text-[10px] font-mono text-center text-[#6E9CA7]">
              Clicking the button above immediately closes this window and stops all emergency siren sounds.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
