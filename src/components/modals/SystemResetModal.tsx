import React, { useState } from 'react';
import { Settings, AlertTriangle, ShieldAlert, KeyRound, Check, RefreshCw, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';

interface SystemResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemResetModal: React.FC<SystemResetModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    serverResetCode,
    generateServerResetCode,
    executeFactoryResetWithCode,
  } = useStore();

  const [inputCode, setInputCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeGeneratedNotice, setCodeGeneratedNotice] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const isGeneralAdmin = currentUser.role === 'general_manager';

  const handleRequestCode = async () => {
    setIsGeneratingCode(true);
    const code = await generateServerResetCode();
    setIsGeneratingCode(false);
    setCodeGeneratedNotice(
      `Código de Segurança despachado pelo Servidor Central para o Administrador Geral (kelssonmoises@gmail.com). Código gerado: ${code}`
    );
    sound.click();
  };

  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    const res = executeFactoryResetWithCode(inputCode.trim());
    if (res.success) {
      setResultMessage({ success: true, text: res.message });
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2500);
    } else {
      setResultMessage({ success: false, text: res.message });
      sound.playAlert();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-red-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>Limpeza & Restauração Geral do Sistema ⚙️</span>
            </h3>
            <p className="text-xs text-red-300 font-semibold">
              Exclusivo para o Administrador Geral • Protegido por Código do Servidor
            </p>
          </div>
        </div>

        {!isGeneralAdmin ? (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <p>
              Acesso negado. Apenas o <strong>Administrador Geral</strong> possui credenciais para solicitar o
              código do servidor e redefinir a base de dados do supermercado.
            </p>
          </div>
        ) : (
          <>
            {/* Warning Box */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Atenção: Ação Irreversível de Manutenção Central</span>
              </div>
              <p>
                Esta função apaga todas as transações, limpa as vendas do dia, estorna fechos de caixa temporários e restaura
                o sistema ao estado original de fábrica com sincronização direta ao Servidor Mãe Supabase.
              </p>
            </div>

            {/* Server Code Dispatch Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-white">Código de Autorização do Servidor</h4>
                  <p className="text-[11px] text-slate-400">
                    O servidor despacha um código de 6 dígitos para o e-mail do gestor (kelssonmoises@gmail.com)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={isGeneratingCode}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isGeneratingCode ? 'Gerando...' : 'Pedir Código ao Servidor'}</span>
                </button>
              </div>

              {codeGeneratedNotice && (
                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs space-y-1 animate-in fade-in">
                  <p className="font-semibold">{codeGeneratedNotice}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-blue-300">Código Emitido pelo Servidor:</span>
                    <button
                      type="button"
                      onClick={() => setInputCode(serverResetCode)}
                      className="font-mono font-black text-sm text-amber-300 hover:underline cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-blue-400/40"
                      title="Clique para preencher automaticamente"
                    >
                      {serverResetCode} (Preencher)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Digite o Código de 6 Dígitos do Servidor:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 948215"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center text-lg tracking-widest font-black outline-none focus:border-red-500"
                />
              </div>

              {resultMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    resultMessage.success
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-950/60 text-red-300 border border-red-500/40'
                  }`}
                >
                  {resultMessage.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{resultMessage.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inputCode.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-950/60 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Apagar e Restaurar Todo o Sistema</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
