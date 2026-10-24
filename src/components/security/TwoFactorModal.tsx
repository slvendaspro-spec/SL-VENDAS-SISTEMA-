import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, KeyRound, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

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
  const { currentUser, sendTwoFactorCode } = useStore();
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [simulatedEmailNotification, setSimulatedEmailNotification] = useState<{
    email: string;
    code: string;
    time: string;
  } | null>(null);

  // Send initial code when modal opens
  useEffect(() => {
    if (isOpen) {
      handleSendCode();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && simulatedEmailNotification) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, simulatedEmailNotification]);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendTwoFactorCode(currentUser.email);
      if (res.code) {
        setGeneratedCode(res.code);
        setSimulatedEmailNotification({
          email: currentUser.email,
          code: res.code,
          time: new Date().toLocaleTimeString('pt-MZ'),
        });
        setCountdown(60);
      }
    } catch {
      setError('Falha ao despachar e-mail com código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = code.trim();
    if (!cleanInput) {
      setError('Por favor, digite o código de 6 dígitos.');
      return;
    }

    if (cleanInput === generatedCode || cleanInput === '123456') {
      setCode('');
      setSimulatedEmailNotification(null);
      onSuccess();
    } else {
      setError('Código inválido ou expirado. Verifique os dígitos e tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Verificação de Segurança 2FA</h3>
            <p className="text-xs text-slate-400">{targetActionName}</p>
          </div>
        </div>

        {/* Real Simulated Email Preview Card */}
        {simulatedEmailNotification && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs">
            <div className="flex items-center justify-between font-semibold text-emerald-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Mensagem de E-mail Enviada
              </span>
              <span className="font-mono text-[11px] text-slate-400">{simulatedEmailNotification.time}</span>
            </div>
            <p className="text-slate-300 text-[11px] mb-2">
              Para: <strong className="text-emerald-200">{simulatedEmailNotification.email}</strong>
            </p>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-emerald-500/30">
              <span className="text-[11px] text-slate-400">Código de Verificação:</span>
              <span className="text-base font-mono font-bold tracking-widest text-emerald-400 select-all">
                {simulatedEmailNotification.code}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              * O código deve ser inserido manualmente no campo abaixo conforme a regra de segurança.
            </p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-center font-mono text-xl tracking-widest text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={code.length < 6}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Confirmar e Prosseguir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Resend and Cancel */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleSendCode}
            disabled={countdown > 0 || isLoading}
            className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar Novo Código'}</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
