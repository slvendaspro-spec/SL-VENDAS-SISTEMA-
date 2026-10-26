import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, KeyRound, ArrowRight, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';

interface TwoFactorModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  targetActionName?: string;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  targetActionName = 'Acesso a Operações Críticas do Sistema',
}) => {
  const { currentUser, sendTwoFactorCode, verifyTwoFactorCode } = useStore();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [maskedEmailNotice, setMaskedEmailNotice] = useState<string | null>(null);

  // Send initial code when modal opens
  useEffect(() => {
    if (isOpen) {
      handleSendCode();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0 && maskedEmailNotice) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, maskedEmailNotice]);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendTwoFactorCode(currentUser.email, targetActionName);
      if (res.success) {
        setMaskedEmailNotice(res.maskedEmail || currentUser.email);
        setCountdown(300);
      } else {
        setError(res.error || 'Falha ao despachar e-mail com código.');
      }
    } catch {
      setError('Falha ao despachar e-mail com código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = code.trim();
    if (cleanInput.length !== 6 || !/^\d{6}$/.test(cleanInput)) {
      setError('Por favor, digite o código de 6 dígitos numéricos.');
      sound.playAlert();
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyTwoFactorCode(currentUser.email, cleanInput);
      if (res.success) {
        sound.success();
        setCode('');
        setMaskedEmailNotice(null);
        onSuccess();
      } else {
        sound.playAlert();
        setError(res.error || 'Código incorreto ou expirado. Verifique o seu Gmail.');
      }
    } catch {
      sound.playAlert();
      setError('Falha de comunicação ao validar o código.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const minutesLeft = Math.floor(countdown / 60);
  const secondsLeft = countdown % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Verificação de Segurança 2FA</h3>
            <p className="text-xs text-slate-400">{targetActionName}</p>
          </div>
        </div>

        {/* Real Email Dispatched Banner (NEVER SHOWS THE CODE ON SCREEN) */}
        {maskedEmailNotice && (
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Código Enviado para o seu Gmail
              </span>
              <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Destinatário: <strong className="text-white font-mono">{maskedEmailNotice}</strong>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Por motivos de estrita segurança, o código de 6 dígitos é confidencial e foi enviado exclusivamente para a sua caixa de entrada e spam.
            </p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Digite o Código de 6 Dígitos
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 842190"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 text-center font-mono text-2xl tracking-[8px] text-emerald-400 placeholder-slate-700 outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className={`flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all ${
                isLoading || code.length !== 6 ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validar Código</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={handleSendCode}
            disabled={isLoading || countdown > 240}
            className="text-xs text-slate-400 hover:text-emerald-400 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {countdown > 240 ? `Aguarde ${300 - countdown}s para reenviar` : 'Não recebeu? Reenviar código'}
          </button>
        </div>
      </div>
    </div>
  );
};
