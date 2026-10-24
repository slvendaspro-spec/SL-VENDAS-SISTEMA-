import React, { useState } from 'react';
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Check,
  Calendar,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { sound } from '../../services/soundService';

interface SangriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'SANGRIA' | 'REFORCO';
}

export const SangriaModal: React.FC<SangriaModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'SANGRIA',
}) => {
  const { currentUser, stores, currentCashierStoreId, addCashTransaction, activeThemeConfig } =
    useStore();

  const [type, setType] = useState<'SANGRIA' | 'REFORCO'>(defaultType);
  const [amount, setAmount] = useState<string>('1000');
  const [reason, setReason] = useState<string>('Sangria periódica para cofre / segurança');
  const [authorizedBy, setAuthorizedBy] = useState<string>(currentUser.name);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentStore = stores.find((s) => s.id === currentCashierStoreId) || stores[0];

  const commonReasonsSangria = [
    'Sangria periódica para cofre / segurança',
    'Excesso de numerário em gaveta',
    'Pagamento a fornecedor urgente',
    'Depósito bancário diário',
  ];

  const commonReasonsReforco = [
    'Abertura / Fundo de troco da manhã',
    'Reforço de moedas e notas miúdas',
    'Suprimento extraordinário de caixa',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    sound.cashDrawer();

    addCashTransaction({
      storeId: currentStore.id,
      storeName: currentStore.name,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      type,
      amount: numAmount,
      reason,
      authorizedBy: authorizedBy || currentUser.name,
      timestamp: new Date().toISOString(),
      voucherCode: voucherCode || `VOUCH-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    setSuccessMessage(
      `${type === 'SANGRIA' ? 'Sangria de' : 'Reforço de'} ${numAmount.toFixed(2)} MZN registado com sucesso!`
    );

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                type === 'SANGRIA'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {type === 'SANGRIA' ? (
                <ArrowDownCircle className="w-5 h-5" />
              ) : (
                <ArrowUpCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                {type === 'SANGRIA' ? 'Sangria de Caixa' : 'Reforço / Suprimento'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentStore.name} • {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Sangria and Reforço */}
        <div className="p-4 pb-0 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setType('SANGRIA');
              setReason(commonReasonsSangria[0]);
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              type === 'SANGRIA'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Sangria (Retirada)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('REFORCO');
              setReason(commonReasonsReforco[0]);
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              type === 'REFORCO'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Reforço (Entrada)
          </button>
        </div>

        {successMessage ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>
            <p className="font-extrabold text-white text-base">{successMessage}</p>
            <p className="text-xs text-slate-400">Transação auditada e registrada no relatório de caixa.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Valor em Meticais (MZN) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-orange-500 pr-16"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-orange-400">
                  MZN
                </span>
              </div>
            </div>

            {/* Quick Amount presets */}
            <div className="flex flex-wrap gap-1.5">
              {[500, 1000, 2000, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700/60"
                >
                  +{val.toLocaleString()} MT
                </button>
              ))}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Motivo / Justificativa *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                {(type === 'SANGRIA' ? commonReasonsSangria : commonReasonsReforco).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Authorization & Voucher with Camera Scanner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Autorizado Por:
                </label>
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                  <span>Comprovativo / Cód:</span>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
                  >
                    <Camera className="w-3 h-3" />
                    Ler Câmera
                  </button>
                </label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Ex: SNG-001 (Opcional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Esta movimentação de numerário será auditada no relatório de fecho diário de caixa da{' '}
                <strong className="text-white">{currentStore.name}</strong>.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-slate-950 text-xs font-black transition-all shadow-lg ${
                  type === 'SANGRIA'
                    ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                    : 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                }`}
              >
                Confirmar {type === 'SANGRIA' ? 'Sangria' : 'Reforço'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Camera Barcode Scanner for voucher / barcode */}
      <CameraBarcodeScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(code) => setVoucherCode(code)}
        title="Leitor de Comprovativo de Sangria"
        subtitle="Aponte a câmera para o código de barras do comprovativo ou crachá"
      />
    </div>
  );
};
