import React, { useState } from 'react';
import { Lock, Unlock, Delete, AlertCircle, ShieldAlert } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const PinLockModal: React.FC = () => {
  const { isScreenLocked, unlockScreen, currentUser } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isScreenLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        // Auto submit on 4th digit
        const ok = unlockScreen(nextPin);
        if (!ok) {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center text-slate-100 flex flex-col items-center">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-0.5">Terminal Bloqueado</h2>
        <p className="text-xs text-slate-400 mb-1">
          Operador: <strong className="text-slate-200">{currentUser.name}</strong>
        </p>
        <span className="text-[11px] font-mono text-slate-500 mb-5">
          {currentUser.assignedStoreName}
        </span>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3.5 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? error
                    ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                    : 'bg-emerald-500 scale-110 shadow-lg shadow-emerald-500/50'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs mb-4 font-medium animate-shake">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>PIN incorreto. Tente novamente (Dica: {currentUser.pin}).</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-100 border border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-xs font-semibold text-slate-400 border border-slate-700/50 transition-all"
          >
            LIMPAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-100 border border-slate-700 transition-all shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 flex items-center justify-center text-slate-300 border border-slate-700/50 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Insira seu PIN de 4 dígitos para retomar a sessão
        </p>
      </div>
    </div>
  );
};
