import React, { useState, useMemo } from 'react';
import {
  Store as StoreIcon,
  Package,
  ShoppingCart,
  TrendingUp,
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Printer,
  FileSpreadsheet,
  Lock,
  DollarSign,
  Users,
  Eye,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, Sale } from '../../types';

export const StoreManagerDashboard: React.FC = () => {
  const {
    currentUser,
    stores,
    products,
    sales,
    users,
    shiftClosures,
    storeRankings,
    activePrinterWidth,
    colorMode,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'sales' | 'shifts' | 'ranking'>('overview');
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState('ALL');

  // Find assigned store
  const store = useMemo(() => {
    return stores.find((s) => s.id === currentUser.assignedStoreId) || stores[0];
  }, [stores, currentUser.assignedStoreId]);

  // Filter sales for this store
  const storeSales = useMemo(() => {
    return sales.filter((s) => s.storeId === store.id && s.status === 'COMPLETED');
  }, [sales, store.id]);

  // Today sales
  const todaySales = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return storeSales.filter((s) => s.timestamp.startsWith(todayStr));
  }, [storeSales]);

  const totalRevenueToday = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + s.total, 0);
  }, [todaySales]);

  // Daily target progress
  const dailyTarget = store.dailySalesTarget || 35000;
  const targetPercent = dailyTarget > 0 ? Math.min(100, (totalRevenueToday / dailyTarget) * 100) : 0;

  // Filter store products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(stockSearch));
      const matchCat = stockCategory === 'ALL' || p.category === stockCategory;
      return matchSearch && matchCat;
    });
  }, [products, stockSearch, stockCategory]);

  // Cashiers of this store
  const storeCashiers = useMemo(() => {
    return users.filter((u) => u.assignedStoreId === store.id && u.role === 'cashier');
  }, [users, store.id]);

  // Store shifts
  const storeShifts = useMemo(() => {
    return shiftClosures.filter((fc) => fc.storeId === store.id);
  }, [shiftClosures, store.id]);

  // Store ranking item
  const myRanking = useMemo(() => {
    return storeRankings.find((r) => r.storeId === store.id);
  }, [storeRankings, store.id]);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in">
      {/* Store Manager Top Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-2xl shadow-lg">
              <StoreIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] tracking-wider uppercase border border-blue-500/30">
                  Painel do Gerente de Loja
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
                  ● Conectada
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{store.name}</h1>
              <p className="text-xs text-slate-300">
                {store.address}, {store.city} • NUIT: {store.nuit} • Gestão: {currentUser.name}
              </p>
            </div>
          </div>

          {/* Quick Ranking & Target Pill */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Posição no Ranking</span>
              <span className="font-mono font-black text-lg text-amber-400">
                {myRanking?.position === 1 ? '🥇 1º Lugar' : myRanking?.position === 2 ? '🥈 2º Lugar' : myRanking?.position === 3 ? '🥉 3º Lugar' : `#${myRanking?.position || '-'} Lugar`}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Meta Diária Atingida</span>
              <span className="font-mono font-black text-lg text-emerald-400">
                {targetPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none text-xs font-bold">
        {[
          { id: 'overview', label: 'Visão Geral & Metas', icon: TrendingUp },
          { id: 'stock', label: `Estoque da Loja (${products.length})`, icon: Package },
          { id: 'sales', label: `Vendas Realizadas (${storeSales.length})`, icon: ShoppingCart },
          { id: 'shifts', label: `Fechos de Caixa (${storeShifts.length})`, icon: Clock },
          { id: 'ranking', label: 'Ranking das Lojas', icon: Award },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================== TAB 1: VISÃO GERAL & METAS ===================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-bold block mb-1">Faturamento Hoje</span>
              <span className="font-mono font-black text-2xl text-emerald-400">
                {totalRevenueToday.toFixed(2)} <span className="text-xs font-normal text-slate-400">MZN</span>
              </span>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                {todaySales.length} compras concluídas hoje
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-bold block mb-1">Meta Diária da Loja</span>
              <span className="font-mono font-black text-2xl text-white">
                {dailyTarget.toLocaleString('pt-MZ')} <span className="text-xs font-normal text-slate-400">MZN</span>
              </span>
              <div className="mt-2 text-[11px] text-emerald-400 font-bold">
                {targetPercent >= 100 ? '🎉 Meta Superada!' : `Faltam ${(Math.max(0, dailyTarget - totalRevenueToday)).toFixed(2)} MZN`}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-bold block mb-1">Operadores de Caixa</span>
              <span className="font-mono font-black text-2xl text-blue-400">{storeCashiers.length}</span>
              <div className="mt-2 text-[11px] text-slate-400">Caixas atribuídos a esta filial</div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-bold block mb-1">Produtos Cadastrados</span>
              <span className="font-mono font-black text-2xl text-indigo-400">{products.length}</span>
              <div className="mt-2 text-[11px] text-slate-400">Itens ativos no catálogo</div>
            </div>
          </div>

          {/* Goal Progress Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider">
                Progresso da Meta Diária de Vendas
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {totalRevenueToday.toFixed(2)} / {dailyTarget.toLocaleString('pt-MZ')} MZN ({targetPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, targetPercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              A meta diária é configurada pelo Administrador Geral para motivar a equipe de vendas de cada loja.
            </p>
          </div>

          {/* Store Cashier Team */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Equipe de Caixas da {store.name}</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{storeCashiers.length} operadores</span>
            </div>

            {storeCashiers.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhum caixa vinculado diretamente a esta loja. O Administrador Geral pode vincular novos operadores no painel central.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {storeCashiers.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{c.name}</h4>
                      <p className="text-[11px] text-slate-400">{c.phone || c.email}</p>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">● Ativo no Caixa</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ESTOQUE DA LOJA (MODO DE CONSULTA EXCLUSIVO) ===================== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Read-Only Notice required by prompt */}
          <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3 shadow-lg">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">🔒 Modo de Consulta Exclusivo do Gerente de Loja</span>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Você tem acesso completo para consultar os produtos e o estoque físico da sua filial em tempo real. Modificações de preços, adições de produtos e alterações no catálogo são restritas ao Administrador Geral (Kelsson Moisés).
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Buscar por nome, código ou barras..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none text-[11px]">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setStockCategory(c)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all ${
                    stockCategory === c
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {c === 'ALL' ? 'Todas Categorias' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Products Stock Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Produto</th>
                    <th className="p-3.5">Código / SKU</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5 text-right">Preço de Venda</th>
                    <th className="p-3.5 text-right">Estoque Nesta Loja</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredProducts.map((p) => {
                    const storeQty = p.stockByStore[store.id] ?? 0;
                    const isOutOfStock = storeQty <= 0 && p.category !== 'Serviços Gráficos & Digitais';
                    const isLowStock = storeQty <= p.minStock && !isOutOfStock;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{p.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">{p.code}</td>
                        <td className="p-3.5 text-slate-400">{p.category}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          {p.salePrice.toFixed(2)} MZN
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-sm">
                          <span
                            className={
                              isOutOfStock
                                ? 'text-red-400'
                                : isLowStock
                                ? 'text-amber-400'
                                : 'text-white'
                            }
                          >
                            {storeQty} {p.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOutOfStock
                                ? 'bg-red-950 text-red-400 border border-red-500/30'
                                : isLowStock
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isOutOfStock ? 'Esgotado' : isLowStock ? 'Estoque Baixo' : 'Disponível'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: VENDAS REALIZADAS ===================== */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">Vendas Concluídas na {store.name}</h3>
            <span className="text-xs text-slate-400 font-mono">{storeSales.length} registros</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Nº Fatura</th>
                    <th className="p-3.5">Data & Hora</th>
                    <th className="p-3.5">Operador de Caixa</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Método</th>
                    <th className="p-3.5 text-right">Total (MZN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {storeSales.slice(0, 30).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-white">{s.saleNumber}</td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(s.timestamp).toLocaleString('pt-MZ')}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">{s.cashierName}</td>
                      <td className="p-3.5 text-slate-400">{s.customerName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[10px] text-slate-300 border border-slate-800">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-400">
                        {s.total.toFixed(2)} MZN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: FECHOS DIÁRIOS DE CAIXA ===================== */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Histórico de Fechos Diários de Caixa</h3>
              <p className="text-xs text-slate-400">Relatórios oficiais de prestação de contas emitidos pelos operadores</p>
            </div>
          </div>

          {storeShifts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              Nenhum fecho diário de caixa registrado nesta filial ainda. Os fechos realizados pelos operadores aparecerão aqui com detalhes de faturamento, sangrias e conferência de gaveta.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeShifts.map((fc) => (
                <div key={fc.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-start justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="font-mono font-black text-sm text-white">{fc.closureNumber}</span>
                      <p className="text-[11px] text-slate-400">Operador: {fc.cashierName}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      {new Date(fc.closedAt).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Faturamento Bruto</span>
                      <span className="font-mono font-bold text-white">{fc.totalSalesGross.toFixed(2)} MZN</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Dinheiro em Gaveta</span>
                      <span className="font-mono font-bold text-emerald-400">{fc.actualCashInDrawer.toFixed(2)} MZN</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Total Sangrias</span>
                      <span className="font-mono font-bold text-amber-400">{fc.totalSangrias.toFixed(2)} MZN</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Diferença / Quebra</span>
                      <span className={`font-mono font-bold ${fc.difference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fc.difference.toFixed(2)} MZN
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 5: RANKING DAS LOJAS ===================== */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Ranking Oficial de Vendas da Rede SL VENDAS</span>
              </h3>
              <p className="text-xs text-slate-400">Classificação em tempo real por faturamento acumulado e metas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {storeRankings.map((rk) => {
              const isCurrent = rk.storeId === store.id;
              return (
                <div
                  key={rk.storeId}
                  className={`p-5 rounded-3xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-950/80 border-blue-500/50 shadow-2xl ring-2 ring-blue-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono font-black text-2xl text-amber-400">
                      {rk.position === 1 ? '🥇' : rk.position === 2 ? '🥈' : rk.position === 3 ? '🥉' : `#${rk.position}`}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold text-[9px] uppercase">
                        Sua Loja
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-sm text-white mb-0.5">{rk.storeName}</h4>
                  <p className="text-xs text-slate-400 mb-3">{rk.city} • {rk.storeCode}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Faturamento:</span>
                      <span className="font-mono font-black text-emerald-400">{rk.totalRevenue.toFixed(2)} MZN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Meta Diária:</span>
                      <span className="font-mono text-slate-300">{rk.dailyTarget.toLocaleString('pt-MZ')} MZN</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, rk.targetPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
