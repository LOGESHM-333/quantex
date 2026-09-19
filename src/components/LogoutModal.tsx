import React from 'react';
import { LogOut, AlertCircle, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#082026] rounded-2xl border border-[#14424D] shadow-2xl p-6 z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#341618] border border-[#FF5C5C]/30 flex items-center justify-center text-[#FF5C5C]">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">End Quantitative Session</h3>
              <p className="text-xs text-[#7BA1AB]">Terminate workstation connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7BA1AB] hover:bg-[#0B2A32] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B2830] border border-[#14414B] text-xs text-[#8EB7C1] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Ending this session will clear local in-memory simulation states and lock the terminal. Saved research lab experiments are safely retained.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#113842]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0A262E] hover:bg-[#0E303A] text-xs font-semibold text-[#8EB7C1] hover:text-white border border-[#143E48] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-[#FF4848] hover:bg-[#e03a3a] text-xs font-bold text-white transition cursor-pointer shadow-lg"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};
