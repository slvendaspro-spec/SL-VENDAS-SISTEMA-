import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Plus,
  Search,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Minus,
  Edit,
  DollarSign,
  Layers,
  Flame,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Store, Product } from '../../types';
import { sound } from '../../services/soundService';

interface StoreProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store | null;
  onAddNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onOpenDestruction?: (product: Product, storeId: string) => void;
}

export const StoreProductsModal: React.FC<StoreProductsModalProps> = ({
  isOpen,
  onClose,
  store,
  onAddNewProduct,
  onEditProduct,
  onOpenDestruction,
}) => {
  const { products, toggleProductCashierVisibility, setProductStoreStock, batchEnableProductsForStore } = useStore();
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');

  if (!isOpen || !store) return null;

  // Filter products by search and visibility for this store
  const storeFilteredProducts = products.filter((p) => {
    const isVisibleInThisStore =
      p.visibleInStores && p.visibleInStores[store.id] !== undefined
        ? p.visibleInStores[store.id]
        : p.isVisibleInCashier !== false;

    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));

    if (!matchesSearch) return false;

    if (filterVisibility === 'VISIBLE') return isVisibleInThisStore;
    if (filterVisibility === 'HIDDEN') return !isVisibleInThisStore;
    return true;
  });

  const enabledCount = products.filter((p) => {
    return p.visibleInStores && p.visibleInStores[store.id] !== undefined
      ? p.visibleInStores[store.id]
      : p.isVisibleInCashier !== false;
  }).length;

  const totalStoreStock = products.reduce((acc, p) => {
    const qty = p.stockByStore && p.stockByStore[store.id] !== undefined ? p.stockByStore[store.id] : 0;
    return acc + qty;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/30">
                  {store.code}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Estoque & Produtos do Caixa • {store.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {store.city} • Gerencie o estoque desta filial e habilite quais produtos aparecem no Caixa (PDV)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddNewProduct}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Produto</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Store Summary Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Total no Catálogo:</span>
            <span className="font-bold text-white text-sm">{products.length} itens</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-400 block font-sans">Habilitados no Caixa:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {enabledCount} de {products.length}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-center">
            <span className="text-[10px] text-blue-400 block font-sans">Estoque Somado na Loja:</span>
            <span className="font-bold text-blue-300 text-sm">{totalStoreStock} unidades</span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código ou código de barras..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterVisibility('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterVisibility === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterVisibility('VISIBLE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                filterVisibility === 'VISIBLE'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visíveis no Caixa ({enabledCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterVisibility('HIDDEN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                filterVisibility === 'HIDDEN'
                  ? 'bg-red-600 text-white'
                  : 'text-red-400 hover:text-red-300'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ocultos ({products.length - enabledCount})</span>
            </button>
          </div>
        </div>

        {/* Batch Enablement Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium">Ações em Lote para {store.name}:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = products.map((p) => p.id);
                batchEnableProductsForStore(store.id, ids, true);
              }}
              className="px-3 py-1 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Habilita todos os produtos cadastrados para venda nesta filial"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Habilitar Todos no Caixa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = products.map((p) => p.id);
                batchEnableProductsForStore(store.id, ids, false);
              }}
              className="px-3 py-1 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 font-bold border border-red-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Bloqueia todos os produtos no caixa desta filial"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ocultar Todos no Caixa</span>
            </button>
          </div>
        </div>

        {/* Products List with Stock & Visibility Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {storeFilteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-sm">Nenhum produto encontrado com os filtros atuais.</p>
            </div>
          ) : (
            storeFilteredProducts.map((p) => {
              const currentStoreStock =
                p.stockByStore && p.stockByStore[store.id] !== undefined
                  ? p.stockByStore[store.id]
                  : 0;

              const isVisibleInThisStore =
                p.visibleInStores && p.visibleInStores[store.id] !== undefined
                  ? p.visibleInStores[store.id]
                  : p.isVisibleInCashier !== false;

              const isLow = currentStoreStock <= p.minStock;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isVisibleInThisStore
                      ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/50 border-red-900/30 opacity-75'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                          {p.code}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">{p.category}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white truncate mt-0.5">{p.name}</h4>
                      <p className="font-mono text-xs text-emerald-400 font-bold">
                        {p.salePrice.toFixed(2)} MZN
                        <span className="text-slate-500 font-normal text-[11px] ml-1">
                          (Custo: {p.costPrice.toFixed(2)} MZN)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Stock Controls & Cashier Visibility Toggle */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Stock in this Store */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-1 font-sans">
                        Estoque nesta Loja:
                      </span>
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setProductStoreStock(p.id, store.id, Math.max(0, currentStoreStock - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                          title="Diminuir 1 unidade"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={currentStoreStock}
                          onChange={(e) => setProductStoreStock(p.id, store.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-center bg-slate-950 border border-slate-700 rounded-lg py-0.5 text-xs font-mono font-bold text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setProductStoreStock(p.id, store.id, currentStoreStock + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                          title="Aumentar 1 unidade"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span
                        className={`text-[9px] font-mono mt-0.5 ${
                          currentStoreStock === 0
                            ? 'text-red-400 font-bold'
                            : isLow
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {currentStoreStock === 0 ? 'Esgotado' : `${currentStoreStock} ${p.unit}`}
                      </span>
                    </div>

                    {/* Habilitar no Caixa Toggle Button */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-1 font-sans">
                        Visibilidade no Caixa:
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleProductCashierVisibility(p.id, store.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isVisibleInThisStore
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950/50'
                            : 'bg-red-950/70 text-red-400 border-red-500/40 hover:bg-red-900/80'
                        }`}
                        title="Clique para habilitar ou desabilitar no Caixa (PDV)"
                      >
                        {isVisibleInThisStore ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Visível no Caixa</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                            <span>Oculto no Caixa</span>
                          </>
                        )}
                      </button>
                      <span className="text-[9px] text-slate-500 mt-0.5 font-sans">
                        {isVisibleInThisStore ? 'Liberado para o operador' : 'Bloqueado no PDV'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-center">
                      {onOpenDestruction && (
                        <button
                          type="button"
                          onClick={() => onOpenDestruction(p, store.id)}
                          className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                          title="Baixa de Estoque por Avaria / Validade / Destruição"
                        >
                          <Flame className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit product button */}
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                        title="Editar Dados do Produto"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            As alterações de estoque e visibilidade são aplicadas e salvas em tempo real no sistema.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
