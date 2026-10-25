import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  FileText,
  Package,
  Store as StoreIcon,
  CheckCircle,
  Clock,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, Store } from '../../types';
import { sound } from '../../services/soundService';

interface ProductDestructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialStoreId?: string;
}

export const ProductDestructionModal: React.FC<ProductDestructionModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
  initialStoreId,
}) => {
  const {
    products,
    stores,
    currentUser,
    destroyStock,
    transferStock,
    auditLogs,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'destroy' | 'transfer' | 'history'>('destroy');

  // Form states for Destruction
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || products[0]?.id || ''
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialStoreId || stores[0]?.id || ''
  );
  const [destroyQuantity, setDestroyQuantity] = useState<number>(1);
  const [destroyReason, setDestroyReason] = useState<string>('Prazo de Validade Expirado / Vencido');
  const [destroyNotes, setDestroyNotes] = useState<string>('');
  const [confirmDestructionCheck, setConfirmDestructionCheck] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Transfer / Distribution
  const [transferProductId, setTransferProductId] = useState<string>(
    initialProductId || products[0]?.id || ''
  );
  const [fromStoreId, setFromStoreId] = useState<string>(initialStoreId || stores[0]?.id || '');
  const [toStoreId, setToStoreId] = useState<string>(
    stores.find((s) => s.id !== (initialStoreId || stores[0]?.id))?.id || stores[1]?.id || ''
  );
  const [transferQuantity, setTransferQuantity] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Selected product & store details for destruction
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  const currentStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);

  const currentStoreStock = useMemo(() => {
    if (!currentProduct || !currentStore) return 0;
    return currentProduct.stockByStore?.[currentStore.id] ?? 0;
  }, [currentProduct, currentStore]);

  // Transfer product & store details
  const currentTransferProduct = useMemo(() => {
    return products.find((p) => p.id === transferProductId) || products[0];
  }, [products, transferProductId]);

  const sourceStoreStock = useMemo(() => {
    if (!currentTransferProduct || !fromStoreId) return 0;
    return currentTransferProduct.stockByStore?.[fromStoreId] ?? 0;
  }, [currentTransferProduct, fromStoreId]);

  // Past destruction logs
  const destructionHistory = useMemo(() => {
    return auditLogs.filter((log) => log.action === 'DESTRUICAO_ESTOQUE');
  }, [auditLogs]);

  if (!isOpen) return null;

  const handleExecuteDestruction = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);

    if (!selectedProductId || !selectedStoreId) {
      setActionFeedback({ type: 'error', message: 'Selecione o produto e a loja.' });
      return;
    }

    if (destroyQuantity <= 0) {
      setActionFeedback({ type: 'error', message: 'A quantidade deve ser maior que zero.' });
      return;
    }

    if (destroyQuantity > currentStoreStock) {
      setActionFeedback({
        type: 'error',
        message: `Estoque insuficiente! Disponível: ${currentStoreStock} ${currentProduct?.unit || 'un'}.`,
      });
      return;
    }

    if (!confirmDestructionCheck) {
      setActionFeedback({
        type: 'error',
        message: 'Marque a caixa de confirmação para validar o auto de descarte/destruição.',
      });
      return;
    }

    const res = destroyStock(
      selectedProductId,
      selectedStoreId,
      destroyQuantity,
      destroyReason,
      destroyNotes
    );

    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      setDestroyQuantity(1);
      setDestroyNotes('');
      setConfirmDestructionCheck(false);
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);

    if (fromStoreId === toStoreId) {
      setActionFeedback({ type: 'error', message: 'A loja de origem e destino devem ser diferentes.' });
      return;
    }

    if (transferQuantity <= 0) {
      setActionFeedback({ type: 'error', message: 'A quantidade deve ser maior que zero.' });
      return;
    }

    if (transferQuantity > sourceStoreStock) {
      setActionFeedback({
        type: 'error',
        message: `Estoque insuficiente na loja de origem (${sourceStoreStock} disponíveis).`,
      });
      return;
    }

    const res = transferStock(
      transferProductId,
      fromStoreId,
      toStoreId,
      transferQuantity,
      transferNotes
    );

    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      setTransferQuantity(1);
      setTransferNotes('');
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
  };

  const lossValueMZN = currentProduct ? currentProduct.costPrice * destroyQuantity : 0;
  const retailValueMZN = currentProduct ? currentProduct.salePrice * destroyQuantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-red-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>AUTORIZAÇÃO ADMINISTRATIVA</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                Destruição & Distribuição de Produtos
              </h3>
              <p className="text-xs text-slate-400">
                Baixa de estoque por avaria / validade ou distribuição de estoque entre lojas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('destroy');
              setActionFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'destroy'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Destruição / Baixa de Estoque</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('transfer');
              setActionFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Distribuição entre Lojas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              setActionFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Autos & Histórico ({destructionHistory.length})</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Tab 1: DESTRUCTION / WRITE-OFF */}
        {activeTab === 'destroy' && (
          <form onSubmit={handleExecuteDestruction} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5 text-xs text-red-200">
              <strong className="block font-bold mb-1">Aviso de Baixa Permanente:</strong>
              A destruição de produtos reduz imediatamente o estoque físico da filial selecionada e o estoque total no sistema. Esta operação gera um Auto de Destruição registrado na auditoria oficial com data, operador e motivo.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. Selecione o Produto para Baixa:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} • Total: {p.stockQuantity} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Store Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  2. Loja / Filial onde o produto está:
                </label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                >
                  {stores.map((s) => {
                    const stStock = currentProduct?.stockByStore?.[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city}) — Estoque: {stStock} {currentProduct?.unit || 'un'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Current Stock Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Estoque Disponível nesta Loja:</span>
                <span className={`text-base font-bold ${currentStoreStock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentStoreStock} {currentProduct?.unit || 'un'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-sans block">Custo Unitário:</span>
                <span className="text-slate-300 font-bold">{currentProduct?.costPrice.toFixed(2)} MZN</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity to destroy */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  3. Quantidade a Baixar / Destruir ({currentProduct?.unit || 'un'}):
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentStoreStock || 1}
                  value={destroyQuantity}
                  onChange={(e) => setDestroyQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Máximo permitido: {currentStoreStock} {currentProduct?.unit || 'un'}
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  4. Motivo do Descarte / Destruição:
                </label>
                <select
                  value={destroyReason}
                  onChange={(e) => setDestroyReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="Prazo de Validade Expirado / Vencido">Prazo de Validade Expirado / Vencido</option>
                  <option value="Embalagem Danificada / Avaria / Rasgada">Embalagem Danificada / Avaria / Rasgada</option>
                  <option value="Produto Deteriorado / Estragado / Corrompido">Produto Deteriorado / Estragado / Corrompido</option>
                  <option value="Quebra / Avaria no Transporte ou Carga">Quebra / Avaria no Transporte ou Carga</option>
                  <option value="Defeito de Fabricação / Recolha (Recall)">Defeito de Fabricação / Recolha (Recall)</option>
                  <option value="Extravio / Perda / Furto Comprovado">Extravio / Perda / Furto Comprovado</option>
                  <option value="Outro Motivo Operacional">Outro Motivo Operacional</option>
                </select>
              </div>
            </div>

            {/* Notes / Report Details */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                5. Justificativa & Detalhes do Auto de Destruição:
              </label>
              <textarea
                rows={2}
                value={destroyNotes}
                onChange={(e) => setDestroyNotes(e.target.value)}
                placeholder="Ex: Lote vencido descartado sob supervisão da gerência. Produtos inutilizados e descartados no contentor apropriado..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-red-500"
              />
            </div>

            {/* Financial Impact */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Prejuízo a Custo Real:</span>
                <span className="text-red-400 font-bold">{lossValueMZN.toFixed(2)} MZN</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-sans block">Valor de Venda Previsto:</span>
                <span className="text-slate-400">{retailValueMZN.toFixed(2)} MZN</span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-red-950/60 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDestructionCheck}
                onChange={(e) => setConfirmDestructionCheck(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span className="text-xs text-slate-300">
                Eu, <strong className="text-white font-bold">{currentUser.name}</strong>, confirmo que estes produtos foram devidamente inspecionados e descartados fisicamente conforme as normas da empresa.
              </span>
            </label>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={currentStoreStock <= 0 || !confirmDestructionCheck}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer transition-all"
              >
                <Flame className="w-4 h-4" />
                <span>Confirmar Destruição & Baixar Estoque</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: TRANSFER / DISTRIBUTION */}
        {activeTab === 'transfer' && (
          <form onSubmit={handleExecuteTransfer} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-3.5 text-xs text-blue-200">
              <strong className="block font-bold mb-1">Distribuição e Transferência de Estoque:</strong>
              Transfira produtos da loja central ou entre filiais para abastecer o estoque dos caixas e manter os produtos disponíveis para venda.
            </div>

            {/* Product to transfer */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Produto para Distribuição:
              </label>
              <select
                value={transferProductId}
                onChange={(e) => setTransferProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} • Total Geral: {p.stockQuantity} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin Store */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Loja de Origem (Saída):
                </label>
                <select
                  value={fromStoreId}
                  onChange={(e) => setFromStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}) • Tem: {currentTransferProduct?.stockByStore?.[s.id] ?? 0} {currentTransferProduct?.unit || 'un'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Store */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Loja de Destino (Entrada):
                </label>
                <select
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}) • Atual: {currentTransferProduct?.stockByStore?.[s.id] ?? 0} {currentTransferProduct?.unit || 'un'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Quantidade a Transferir ({currentTransferProduct?.unit || 'un'}):
                </label>
                <input
                  type="number"
                  min="1"
                  max={sourceStoreStock || 1}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Disponível na origem: {sourceStoreStock} {currentTransferProduct?.unit || 'un'}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Observações da Guia de Remessa:
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Ex: Guia nº 402, transportado via viatura da empresa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sourceStoreStock <= 0 || fromStoreId === toStoreId}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer transition-all"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirmar Distribuição de Estoque</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: HISTORY / AUDIT LOGS */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300">
                Registro de Autos de Destruição / Baixas Realizadas
              </h4>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Relatório</span>
              </button>
            </div>

            {destructionHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                <p className="text-xs">Nenhum auto de destruição registrado até o momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {destructionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
                          AUTO DE DESTRUIÇÃO
                        </span>
                        <strong className="text-white font-bold">{item.entity}</strong>
                      </div>
                      <p className="text-slate-300 mt-1">{item.details}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Operador: {item.userName} • {item.storeName} • {new Date(item.timestamp).toLocaleString('pt-MZ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Administrador: {currentUser.name} ({currentUser.email})</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
