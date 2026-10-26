import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Store as StoreIcon,
  Package,
  ShoppingCart,
  Users,
  Bell,
  BarChart3,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Check,
  Send,
  HelpCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Filter,
  Eye,
  Sliders,
  Camera,
  Laptop,
  Tablet,
  Smartphone,
  Lock,
  Settings,
  Clock,
  Flame,
  Archive,
  Folder,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, Store, User, PaymentMethod, Expense, AuthorizedDevice, Sale } from '../../types';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { SangriaModal } from '../modals/SangriaModal';
import { UserManagementModal } from '../modals/UserManagementModal';
import { ProductManagementModal } from '../modals/ProductManagementModal';
import { DeviceManagementModal } from '../modals/DeviceManagementModal';
import { SystemResetModal } from '../modals/SystemResetModal';
import { StoreProductsModal } from '../modals/StoreProductsModal';
import { ProductDestructionModal } from '../modals/ProductDestructionModal';
import { SavedReportsFolder } from './SavedReportsFolder';
import { CASHIER_MODELS_LIST } from '../../data/initialData';
import { sound } from '../../services/soundService';

export const AdminDashboard: React.FC = () => {
  const {
    stores,
    selectedAdminStoreId,
    setSelectedAdminStoreId,
    addStore,
    updateStore,
    toggleStoreStatus,
    removeStore,
    storeRankings,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    toggleProductCashierVisibility,
    setProductStoreStock,
    sales,
    cancelSale,
    deleteSale,
    deleteTodaySalesOneByOne,
    expenses,
    addExpense,
    users,
    addUser,
    updateUser,
    deleteUser,
    resetUserPin,
    updateUserPermissions,
    updateUserPin,
    showAllPasswords,
    toggleShowAllPasswords,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    devices,
    authorizeDevice,
    revokeDevice,
    addDevice,
    updateDevice,
    deleteDevice,
    shiftClosures,
    auditLogs,
    managerTheme,
    cashierModel,
    setCashierModel,
    cashTransactions,
    syncWithSupabase,
    supabaseStatus,
    exportBackup,
    restoreBackup,
    resetToDefaultData,
  } = useStore();

  const [isProductCameraOpen, setIsProductCameraOpen] = useState(false);
  const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [preselectedRoleForUser, setPreselectedRoleForUser] = useState<'general_manager' | 'cashier' | undefined>(undefined);
  const [preselectedStoreForUser, setPreselectedStoreForUser] = useState<string | undefined>(undefined);
  const [isProductManagementModalOpen, setIsProductManagementModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  
  // Devices state
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<AuthorizedDevice | null>(null);
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState<AuthorizedDevice | null>(null);

  // System Reset Modal state (⚙️)
  const [isSystemResetModalOpen, setIsSystemResetModalOpen] = useState(false);

  // Sales deletion state
  const [deleteConfirmSale, setDeleteConfirmSale] = useState<Sale | null>(null);
  const [salesDeleteActionNotice, setSalesDeleteActionNotice] = useState<string | null>(null);

  // Store details modals
  const [targetEditStore, setTargetEditStore] = useState<Store | null>(null);
  const [targetInputVal, setTargetInputVal] = useState<string>('');
  const [storeClosuresModal, setStoreClosuresModal] = useState<Store | null>(null);
  const [storeForProductsModal, setStoreForProductsModal] = useState<Store | null>(null);

  // Product Destruction / Stock Write-off modal state
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState(false);
  const [destructionInitialProduct, setDestructionInitialProduct] = useState<Product | null>(null);
  const [destructionInitialStoreId, setDestructionInitialStoreId] = useState<string | undefined>(undefined);

  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSyncMessage, setSupabaseSyncMessage] = useState<string | null>(null);
  const [modelChangeSuccess, setModelChangeSuccess] = useState<string | null>(null);

  // Reports sub-view state: 'folder_archive' (Pasta de Relatórios Guardados por Data) or 'dre_metrics' (DRE)
  const [reportsSubView, setReportsSubView] = useState<'folder_archive' | 'dre_metrics'>('folder_archive');

  // Active Admin Tab (100% focused on Supermarket POS, strictly no AI / 3D)
  const [adminTab, setAdminTab] = useState<
    | 'overview'
    | 'stores'
    | 'products'
    | 'sales'
    | 'users'
    | 'devices'
    | 'sessions'
    | 'notifications'
    | 'reports'
    | 'cashier_models'
  >('overview');

  // Filtered dataset based on selected store
  const targetStoreId = selectedAdminStoreId;
  const filteredSales = useMemo(() => {
    return targetStoreId === 'ALL' ? sales : sales.filter((s) => s.storeId === targetStoreId);
  }, [sales, targetStoreId]);

  const filteredExpenses = useMemo(() => {
    return targetStoreId === 'ALL' ? expenses : expenses.filter((e) => e.storeId === targetStoreId);
  }, [expenses, targetStoreId]);

  // Financial aggregates
  const totalRevenue = useMemo(() => {
    return filteredSales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((acc, s) => acc + s.total, 0);
  }, [filteredSales]);

  const totalCost = useMemo(() => {
    return filteredSales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((acc, s) => acc + s.totalCost, 0);
  }, [filteredSales]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalExpenses;
  const completedSalesCount = filteredSales.filter((s) => s.status === 'COMPLETED').length;
  const averageTicket = completedSalesCount > 0 ? totalRevenue / completedSalesCount : 0;

  // Stock alerts
  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) => p.category !== 'Serviços Gráficos & Digitais' && p.stockQuantity <= p.minStock
    );
  }, [products]);

  // State modals for Product, Store, Expense creation
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    code: '',
    category: 'Informática & Papelaria',
    costPrice: '',
    salePrice: '',
    stockQuantity: '',
    minStock: '10',
    supplier: '',
    unit: 'Unid',
  });

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Maputo',
    phone: '',
    nuit: '',
    managerName: '',
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Energia/Água' as Expense['category'],
    amount: '',
    storeId: stores[0]?.id || 'store_1',
    notes: '',
  });

  const [stockAdjustmentModal, setStockAdjustmentModal] = useState<{
    productId: string;
    productName: string;
    currentStock: number;
    storeId: string;
  } | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Entrada de Estoque / Fornecedor');

  // Cancel sale modal state
  const [cancelModalSale, setCancelModalSale] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Handle export CSV
  const handleExportCSV = () => {
    const headers = ['Nº Venda', 'Data', 'Loja', 'Operador', 'Cliente', 'Pagamento', 'Total MZN', 'Custo MZN', 'Lucro MZN', 'Estado'];
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      new Date(s.timestamp).toLocaleString('pt-MZ'),
      s.storeName,
      s.cashierName,
      s.customerName,
      s.paymentMethod,
      s.total.toFixed(2),
      s.totalCost.toFixed(2),
      s.estimatedProfit.toFixed(2),
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SL_VENDAS_RELATORIO_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Tabs for General Manager (Blue Sapphire Identity) */}
      <div className="bg-slate-900 border-b border-blue-900/40 px-3 sm:px-6 py-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
            { id: 'stores', label: `Lojas (${stores.length})`, icon: StoreIcon },
            { id: 'products', label: `Estoque (${products.length})`, icon: Package },
            { id: 'sales', label: `Vendas (${filteredSales.length})`, icon: ShoppingCart },
            { id: 'users', label: `Usuários (${users.length})`, icon: Users },
            { id: 'devices', label: `Dispositivos (${devices.length})`, icon: ShieldCheck },
            { id: 'sessions', label: `Sessões / Turnos (${shiftClosures.length})`, icon: Clock },
            { id: 'notifications', label: `Alertas (${notifications.filter((n) => !n.isRead).length})`, icon: Bell },
            { id: 'reports', label: '📁 Pasta de Relatórios', icon: Archive },
            { id: 'cashier_models', label: 'Modelos de Caixa', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsSystemResetModalOpen(true)}
            className="ml-auto px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-500/50 text-red-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Limpar e Restaurar Todo o Sistema (Requer Código do Servidor)"
          >
            <Settings className="w-4 h-4 text-red-400 animate-spin-slow" />
            <span>⚙️ Restaurar Sistema</span>
          </button>
        </div>
      </div>

      {/* Supabase Mother Server Sync & Connectivity Banner */}
      <div className="bg-slate-900/90 border-b border-blue-900/30 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white flex items-center gap-1.5">
            <span>Servidor Mãe Supabase:</span>
            <span className="text-emerald-400 font-semibold">Conectado (PostgreSQL Central)</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline font-mono text-[11px]">
            Última Sincronização: {supabaseStatus.lastSync}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {supabaseSyncMessage && (
            <span className="text-[11px] text-emerald-400 font-semibold animate-in fade-in">
              {supabaseSyncMessage}
            </span>
          )}
          <button
            onClick={async () => {
              setIsSyncingSupabase(true);
              const res = await syncWithSupabase();
              setIsSyncingSupabase(false);
              setSupabaseSyncMessage(res.message);
              setTimeout(() => setSupabaseSyncMessage(null), 4000);
            }}
            disabled={isSyncingSupabase}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
            <span>{isSyncingSupabase ? 'Sincronizando...' : 'Sincronizar Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Main Admin Viewport */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* ===================== TAB 1: VISÃO GERAL (OVERVIEW) ===================== */}
        {adminTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Faturamento Total */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Faturamento Bruto</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white">
                  {totalRevenue.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">MZN</span>
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span>{completedSalesCount} vendas concluídas</span>
                </p>
              </div>

              {/* Card 2: Lucro Líquido Real */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Lucro Líquido Estimado</span>
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
                  {netProfit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">MZN</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Bruto: {grossProfit.toFixed(0)} - Desp: {totalExpenses.toFixed(0)} MZN
                </p>
              </div>

              {/* Card 3: Ticket Médio */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Ticket Médio por Venda</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white">
                  {averageTicket.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">MZN</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Média por transação</p>
              </div>

              {/* Card 4: Alertas Críticos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/30 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Estoque Crítico</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-amber-400">
                  {lowStockProducts.length} itens
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Abaixo do estoque mínimo
                </p>
              </div>
            </div>

            {/* Ranking das Lojas que Mais Vendem & Metas Diárias */}
            <div className="bg-slate-900 rounded-3xl border border-blue-900/40 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    🏆
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      Ranking das Lojas que Mais Vendem & Metas Diárias
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Faturamento em tempo real e progresso da meta diária estabelecida para cada filial
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {stores.length} Filiais Ativas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {storeRankings.map((rk) => {
                  const target = rk.dailySalesTarget || 35000;
                  const progress = Math.min(100, Math.round((rk.totalRevenue / target) * 100));
                  const isTop = rk.rank === 1;

                  return (
                    <div
                      key={rk.storeId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isTop
                          ? 'bg-gradient-to-br from-slate-900 to-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                              rk.rank === 1
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : rk.rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : rk.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{rk.rank}
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-white truncate max-w-[130px]">{rk.storeName}</h4>
                            <span className="text-[10px] text-slate-400">{rk.storeCity}</span>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {rk.totalRevenue.toFixed(0)} MZN
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Meta: {target.toLocaleString('pt-MZ')} MZN</span>
                          <span className={`font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress >= 100
                                ? 'bg-emerald-400'
                                : progress >= 60
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-right">{rk.salesCount} vendas registradas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions & Store Health Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Lojas Ativas e Status */}
              <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">Rede de Lojas & Conectividade</h3>
                  </div>
                  <button
                    onClick={() => setShowStoreModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Loja</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stores.map((st) => {
                    const storeSales = sales.filter((s) => s.storeId === st.id && s.status === 'COMPLETED');
                    const storeRevenue = storeSales.reduce((acc, s) => acc + s.total, 0);

                    return (
                      <div
                        key={st.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          st.status === 'active'
                            ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                            : 'bg-red-950/20 border-red-900/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  st.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                                }`}
                              />
                              <h4 className="font-bold text-xs sm:text-sm text-white">{st.name}</h4>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {st.city} • NUIT: {st.nuit}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              st.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {st.status === 'active' ? 'Ativa' : 'Suspensa'}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Faturamento</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {storeRevenue.toFixed(2)} MZN
                            </span>
                          </div>
                          <button
                            onClick={() => toggleStoreStatus(st.id)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                              st.status === 'active'
                                ? 'text-amber-400 border-amber-500/30 hover:bg-amber-950/40'
                                : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40'
                            }`}
                          >
                            {st.status === 'active' ? 'Suspender' : 'Reativar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Central Server & Maintenance Widget */}
              <div className="bg-gradient-to-br from-slate-900 to-blue-950/40 rounded-3xl border border-blue-500/30 p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Servidor Central & Auditoria</h4>
                      <p className="text-[11px] text-blue-300">Segurança multi-loja e integridade</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Gerenciamento centralizado de filiais, caixas e sincronização em tempo real com o Servidor Mãe Supabase.
                  </p>

                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Dispositivos Autorizados:</span>
                      <span className="font-mono font-bold text-white">{devices.length} conectados</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Total de Utilizadores:</span>
                      <span className="font-mono font-bold text-emerald-400">{users.length} ativos</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Fechos de Caixa:</span>
                      <span className="font-mono font-bold text-amber-300">{shiftClosures.length} registrados</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsSystemResetModalOpen(true)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900/90 border border-red-500/50 text-red-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <Settings className="w-3.5 h-3.5 text-red-400 animate-spin-slow" />
                  <span>⚙️ Limpeza & Restauração Geral</span>
                </button>
              </div>
            </div>

            {/* Recent Sales Stream */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h3 className="font-bold text-white text-sm sm:text-base">Últimas Transações Registradas na Rede</h3>
                <button
                  onClick={() => setAdminTab('sales')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Ver Todas ({sales.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-2.5 font-semibold">Nº Venda</th>
                      <th className="pb-2.5 font-semibold">Loja</th>
                      <th className="pb-2.5 font-semibold">Vendedor</th>
                      <th className="pb-2.5 font-semibold">Hora</th>
                      <th className="pb-2.5 font-semibold">Método</th>
                      <th className="pb-2.5 font-semibold text-right">Total MZN</th>
                      <th className="pb-2.5 font-semibold text-right">Lucro MZN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSales.slice(0, 6).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-emerald-400">{s.saleNumber}</td>
                        <td className="py-2.5 text-slate-200">{s.storeName}</td>
                        <td className="py-2.5 text-slate-400">{s.cashierName}</td>
                        <td className="py-2.5 font-mono text-slate-400">
                          {new Date(s.timestamp).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 font-bold">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono font-bold text-white text-right">
                          {s.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 font-mono font-bold text-emerald-400 text-right">
                          +{s.estimatedProfit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: LOJAS & UNIDADES ===================== */}
        {adminTab === 'stores' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Gerenciamento de Lojas</h2>
                <p className="text-xs text-slate-400">Adicione, edite, suspenda ou remova unidades da empresa</p>
              </div>
              <button
                onClick={() => setShowStoreModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Loja</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((st) => {
                const storeSales = sales.filter((s) => s.storeId === st.id && s.status === 'COMPLETED');
                const storeRevenue = storeSales.reduce((acc, s) => acc + s.total, 0);
                const target = st.dailySalesTarget || 35000;
                const progress = Math.min(100, Math.round((storeRevenue / target) * 100));

                return (
                  <div
                    key={st.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      {st.imageUrl && (
                        <div className="w-full h-28 rounded-2xl overflow-hidden mb-3 border border-slate-800">
                          <img src={st.imageUrl} alt={st.name} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded">
                            {st.code}
                          </span>
                          <h3 className="font-bold text-base text-white mt-1">{st.name}</h3>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            st.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {st.status === 'active' ? 'Ativa' : 'Suspensa'}
                        </span>
                      </div>

                      {/* 5 Requisitos por Loja: +Gerente +Caixa +Produtos +Meta Diária +Fecho Diário */}
                      <div className="space-y-2.5 my-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                        {/* 1. + Meta Diária */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <span>Meta Diária:</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white">
                                {target.toLocaleString('pt-MZ')} MZN
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetEditStore(st);
                                  setTargetInputVal(target.toString());
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-[10px] text-blue-300 font-semibold border border-blue-700/40 cursor-pointer"
                                title="Editar Meta Diária da Loja"
                              >
                                + Meta Diária
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Faturado Hoje:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {storeRevenue.toFixed(0)} MZN ({progress}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progress >= 100 ? 'bg-emerald-400' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Direct Action Badges: Responsável, +Caixa, +Produtos, +Fecho Diário */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs">
                          {/* 1. Responsável / Administrador */}
                          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">Responsável:</span>
                              <span className="text-[10px] font-mono font-bold text-blue-400 truncate max-w-[80px]">
                                {st.responsibleName || 'Kelsson M.'}
                              </span>
                            </div>
                            <span className="mt-1.5 py-1 px-2 rounded-lg bg-blue-950/60 text-blue-300 text-[10px] font-bold border border-blue-500/30 text-center">
                              Admin Geral 💙
                            </span>
                          </div>

                          {/* 3. + Caixa */}
                          {(() => {
                            const storeCashiers = users.filter(
                              (u) =>
                                (u.assignedStoreId === st.id || u.assignedStoreName === st.name) &&
                                u.role === 'cashier'
                            );
                            return (
                              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-400">Caixas:</span>
                                  <span className="font-mono font-bold text-emerald-400">
                                    {storeCashiers.length}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserToEdit(null);
                                    setPreselectedRoleForUser('cashier');
                                    setPreselectedStoreForUser(st.id);
                                    setIsUserModalOpen(true);
                                  }}
                                  className="mt-1.5 py-1 px-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold border border-emerald-500/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Caixa</span>
                                </button>
                              </div>
                            );
                          })()}

                          {/* 4. + Produtos (Estoque & Visibilidade no Caixa) */}
                          {(() => {
                            const storeProducts = products.filter(
                              (p) => !p.stockByStore || (p.stockByStore[st.id] ?? 0) > 0
                            );
                            const visibleProducts = products.filter(
                              (p) =>
                                (p.visibleInStores && p.visibleInStores[st.id] !== undefined
                                  ? p.visibleInStores[st.id]
                                  : p.isVisibleInCashier !== false)
                            );
                            return (
                              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-400">Produtos / Caixa:</span>
                                  <span className="font-mono font-bold text-amber-400">
                                    {visibleProducts.length}/{products.length}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setStoreForProductsModal(st)}
                                  className="mt-1.5 py-1 px-2 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white text-[10px] font-bold border border-amber-500/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                  title="Gerenciar produtos, estoque e habilitar no caixa desta loja"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Produtos & Caixa</span>
                                </button>
                              </div>
                            );
                          })()}

                          {/* 5. + Fecho Diário */}
                          {(() => {
                            const storeClosures = shiftClosures.filter((c) => c.storeId === st.id);
                            return (
                              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-400">Fechos:</span>
                                  <span className="font-mono font-bold text-purple-400">
                                    {storeClosures.length}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setStoreClosuresModal(st)}
                                  className="mt-1.5 py-1 px-2 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white text-[10px] font-bold border border-purple-500/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>+ Fecho Diário</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-300">
                        <p>
                          <strong className="text-slate-400">Cidade:</strong> {st.city}
                        </p>
                        <p>
                          <strong className="text-slate-400">Endereço:</strong> {st.address}
                        </p>
                        <p>
                          <strong className="text-slate-400">Telefone:</strong> {st.phone}
                        </p>
                        <p>
                          <strong className="text-slate-400">NUIT Fiscal:</strong> {st.nuit}
                        </p>
                        <p>
                          <strong className="text-slate-400">Responsável:</strong> {st.responsibleName || 'Administrador Geral'}
                        </p>
                      </div>
                    </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleStoreStatus(st.id)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                        st.status === 'active'
                          ? 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40'
                          : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40'
                      }`}
                    >
                      {st.status === 'active' ? 'Suspender Operação' : 'Reativar Loja'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza de que deseja excluir permanentemente a loja ${st.name}?`)) {
                          removeStore(st.id);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/50 transition-colors"
                      title="Excluir Loja"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* ===================== TAB 3: PRODUTOS & ESTOQUE ===================== */}
        {adminTab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Catálogo de Produtos e Controle de Estoque</h2>
                <p className="text-xs text-slate-400">
                  Preços em Meticais (MZN), estoque por filial, custo vs venda e margem de lucro
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDestructionInitialProduct(null);
                    setDestructionInitialStoreId(undefined);
                    setIsDestructionModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                  title="Baixa de estoque por destruição, avaria, quebra ou validade"
                >
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>Baixa / Destruição</span>
                </button>

                <button
                  onClick={() => {
                    setProductToEdit(null);
                    setIsProductManagementModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Produto Catalogado</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3 font-semibold">Foto</th>
                    <th className="pb-3 font-semibold">Código</th>
                    <th className="pb-3 font-semibold">Produto / Serviço</th>
                    <th className="pb-3 font-semibold">Categoria</th>
                    <th className="pb-3 font-semibold text-right">P. Custo</th>
                    <th className="pb-3 font-semibold text-right">P. Venda</th>
                    <th className="pb-3 font-semibold text-right">Margem</th>
                    <th className="pb-3 font-semibold text-center">Estoque Total</th>
                    <th className="pb-3 font-semibold text-center">No Caixa</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => {
                    const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
                    const isLow = p.category !== 'Serviços Gráficos & Digitais' && p.stockQuantity <= p.minStock;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-emerald-400 font-bold">{p.code}</td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-100">{p.name}</p>
                          <span className="text-[10px] text-slate-500">Fornecedor: {p.supplier}</span>
                        </td>
                        <td className="py-3 text-slate-400">{p.category}</td>
                        <td className="py-3 font-mono text-slate-300 text-right">{p.costPrice.toFixed(2)} MZN</td>
                        <td className="py-3 font-mono font-bold text-white text-right">{p.salePrice.toFixed(2)} MZN</td>
                        <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                          {margin.toFixed(0)}%
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                              isLow
                                ? 'bg-red-950 text-red-400 border border-red-500/30'
                                : 'bg-slate-950 text-emerald-400'
                            }`}
                          >
                            {p.stockQuantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleProductCashierVisibility(p.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              p.isVisibleInCashier !== false
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                                : 'bg-red-950 text-red-400 border-red-500/40 hover:bg-red-900/60'
                            }`}
                            title="Clique para alternar se este produto aparece no Caixa (PDV)"
                          >
                            {p.isVisibleInCashier !== false ? '🟢 Visível' : '🔴 Oculto'}
                          </button>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setProductToEdit(p);
                                setIsProductManagementModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-300 text-[11px] font-semibold flex items-center gap-1 border border-blue-700/50"
                              title="Editar Produto & Estoque por Filial"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() =>
                                setStockAdjustmentModal({
                                  productId: p.id,
                                  productName: p.name,
                                  currentStock: p.stockQuantity,
                                  storeId: stores[0]?.id || 'store_1',
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-medium"
                              title="Ajustar / Dar Entrada no Estoque"
                            >
                              Entrada
                            </button>
                            <button
                              onClick={() => {
                                setDestructionInitialProduct(p);
                                setDestructionInitialStoreId(stores[0]?.id);
                                setIsDestructionModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 text-[11px] font-medium flex items-center gap-1 border border-red-500/30"
                              title="Dar Baixa por Destruição / Avaria / Validade"
                            >
                              <Flame className="w-3 h-3" />
                              <span>Baixa</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remover "${p.name}" do catálogo permanentemente?`)) deleteProduct(p.id);
                              }}
                              className="p-1 rounded-lg hover:bg-red-950/60 text-slate-500 hover:text-red-400"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: VENDAS & FINANÇAS ===================== */}
        {adminTab === 'sales' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Transações e Auditoria Financeira</h2>
                <p className="text-xs text-slate-400">
                  Todas as vendas, estornos autorizados, cálculo de custo e lucro por loja
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = deleteTodaySalesOneByOne();
                    setSalesDeleteActionNotice(res.message);
                    setTimeout(() => setSalesDeleteActionNotice(null), 6000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950/40"
                  title="Eliminar todas as vendas registradas hoje uma a uma do sistema"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Eliminar Vendas do Dia (Uma a Uma)</span>
                </button>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Registrar Despesa</span>
                </button>
                <button
                  onClick={() => {
                    setAdminTab('reports');
                    setReportsSubView('folder_archive');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  title="Abrir pasta de relatórios e histórico de vendas por data"
                >
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>📁 Pastas por Data</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Notice Banner for Vendas do dia eliminadas */}
            {salesDeleteActionNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{salesDeleteActionNotice}</span>
              </div>
            )}

            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3 font-semibold">Nº Venda</th>
                    <th className="pb-3 font-semibold">Data / Hora</th>
                    <th className="pb-3 font-semibold">Loja</th>
                    <th className="pb-3 font-semibold">Vendedor</th>
                    <th className="pb-3 font-semibold">Cliente</th>
                    <th className="pb-3 font-semibold">Método</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Custo</th>
                    <th className="pb-3 font-semibold text-right">Lucro</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                    <th className="pb-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono font-bold text-emerald-400">{s.saleNumber}</td>
                      <td className="py-3 text-slate-400">
                        {new Date(s.timestamp).toLocaleDateString('pt-MZ')}{' '}
                        {new Date(s.timestamp).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 text-slate-200">{s.storeName}</td>
                      <td className="py-3 text-slate-300">{s.cashierName}</td>
                      <td className="py-3 text-slate-300">{s.customerName}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-slate-800 text-slate-200">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-white text-right">{s.total.toFixed(2)} MZN</td>
                      <td className="py-3 font-mono text-slate-400 text-right">{s.totalCost.toFixed(2)} MZN</td>
                      <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                        +{s.estimatedProfit.toFixed(2)} MZN
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {s.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === 'COMPLETED' && (
                            <button
                              onClick={() => {
                                setCancelModalSale(s.id);
                                setCancelReason('');
                              }}
                              className="px-2 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-950/40 text-[11px]"
                            >
                              Estornar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSale(s)}
                            className="p-1 rounded-lg hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors"
                            title="Eliminar Venda Permanentemente (Restaura Estoque)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: USUÁRIOS & PERMISSÕES ===================== */}
        {adminTab === 'users' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Gestão Central de Utilizadores & Acessos</h2>
                <p className="text-xs text-slate-400">
                  Gerentes de loja, caixas e administradores com fotos de perfil, credenciais e controle multi-loja
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleShowAllPasswords}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    showAllPasswords
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/40'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Mostrar ou ocultar todas as senhas e PINs de autenticação"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>{showAllPasswords ? 'Ocultar Senhas' : 'Mostrar Todas Senhas'}</span>
                </button>

                <button
                  onClick={() => {
                    setUserToEdit(null);
                    setIsUserModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Utilizador</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u) => (
                <div key={u.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl ${u.avatarColor} flex items-center justify-center text-white font-bold text-base shadow overflow-hidden shrink-0 border border-white/20`}
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{u.name}</h3>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        {u.identificationNumber && (
                          <p className="text-[10px] text-slate-500 font-mono">BI/Doc: {u.identificationNumber}</p>
                        )}
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold block mt-0.5">
                          Loja: {u.assignedStoreName}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        u.role === 'general_manager'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {u.role === 'general_manager'
                        ? 'Administrador Geral 💙'
                        : 'Vendedor Caixa 🟡'}
                    </span>
                  </div>

                  {/* Passwords & Authentication Display Box */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono">Senha de Autenticação:</span>
                      <span className={`font-mono font-bold ${showAllPasswords ? 'text-amber-300' : 'text-slate-500'}`}>
                        {showAllPasswords ? u.password || 'admin123' : '••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono">PIN de Caixa:</span>
                      <span className={`font-mono font-bold ${showAllPasswords ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {showAllPasswords ? u.pin : '••••'}
                      </span>
                    </div>
                  </div>

                  {/* Individual Permissions Toggles */}
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Permissões no Terminal
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.permissions.canChangePrices}
                          disabled={u.role === 'general_manager'}
                          onChange={(e) =>
                            updateUserPermissions(u.id, {
                              ...u.permissions,
                              canChangePrices: e.target.checked,
                            })
                          }
                          className="accent-blue-500"
                        />
                        <span>Alterar Preços</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.permissions.canCancelSales}
                          disabled={u.role === 'general_manager'}
                          onChange={(e) =>
                            updateUserPermissions(u.id, {
                              ...u.permissions,
                              canCancelSales: e.target.checked,
                            })
                          }
                          className="accent-blue-500"
                        />
                        <span>Cancelar Vendas</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.permissions.canApplyDiscountsOverLimit}
                          disabled={u.role === 'general_manager'}
                          onChange={(e) =>
                            updateUserPermissions(u.id, {
                              ...u.permissions,
                              canApplyDiscountsOverLimit: e.target.checked,
                            })
                          }
                          className="accent-blue-500"
                        />
                        <span>Descontos Especiais</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.permissions.canViewReports}
                          disabled={u.role === 'general_manager'}
                          onChange={(e) =>
                            updateUserPermissions(u.id, {
                              ...u.permissions,
                              canViewReports: e.target.checked,
                            })
                          }
                          className="accent-blue-500"
                        />
                        <span>Ver Relatórios</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => {
                        resetUserPin(u.id);
                        alert(`PIN de ${u.name} restaurado para o padrão: 1234`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700 transition-colors"
                      title="Restaurar PIN para 1234"
                    >
                      Restaurar PIN (1234)
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setUserToEdit(u);
                          setIsUserModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-semibold border border-blue-700/50 flex items-center gap-1 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      {u.id !== 'user_kelsson' && (
                        <button
                          onClick={() => setDeleteConfirmUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 font-semibold border border-red-800/50 flex items-center gap-1 transition-colors"
                          title="Eliminar Utilizador Permanente"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 6: DISPOSITIVOS AUTORIZADOS ===================== */}
        {adminTab === 'devices' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Controle de Dispositivos Conectados</h2>
                <p className="text-xs text-slate-400">
                  Gerencie smartphones, tablets e computadores autorizados a operar os PDVs (Adicionar, editar e eliminar permanente)
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeviceToEdit(null);
                  setIsDeviceModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Dispositivo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-white">{dev.deviceName}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{dev.browser}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          dev.status === 'AUTHORIZED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-950 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {dev.status === 'AUTHORIZED' ? 'Autorizado' : 'Acesso Revogado'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <p>
                        <strong className="text-slate-400">Tipo:</strong>{' '}
                        {dev.deviceType === 'mobile'
                          ? 'Smartphone / Telemóvel'
                          : dev.deviceType === 'tablet'
                          ? 'Tablet'
                          : 'Computador Desktop'}
                      </p>
                      <p>
                        <strong className="text-slate-400">IP:</strong> {dev.ipAddress}
                      </p>
                      <p>
                        <strong className="text-slate-400">Loja Vinculada:</strong> {dev.assignedStoreName}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">Token: {dev.fingerprint}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    {dev.status === 'AUTHORIZED' ? (
                      <button
                        onClick={() => revokeDevice(dev.id)}
                        className="w-full py-1.5 rounded-xl border border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs font-semibold transition-colors"
                      >
                        Suspender / Revogar Acesso
                      </button>
                    ) : (
                      <button
                        onClick={() => authorizeDevice(dev.id)}
                        className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        Autorizar Novamente
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeviceToEdit(dev);
                          setIsDeviceModalOpen(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-semibold border border-blue-700/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDevice(dev)}
                        className="px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-800/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Eliminar Dispositivo Permanentemente"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 7: NOTIFICAÇÕES & AUDITORIA ===================== */}
        {adminTab === 'notifications' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Alertas & Histórico Auditável</h2>
                <p className="text-xs text-slate-400">
                  Notificações em tempo real enviadas ao Gestor Geral com registro exato de eventos e auditoria
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Marcar Todas como Lidas
                </button>
                <button
                  onClick={clearNotifications}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Limpar Feed
                </button>
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p className="text-sm">Nenhuma notificação recente pendente.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      n.isRead
                        ? 'bg-slate-900/60 border-slate-800/80 opacity-80'
                        : 'bg-slate-900 border-emerald-500/40 shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            n.severity === 'alert'
                              ? 'bg-red-500'
                              : n.severity === 'warning'
                              ? 'bg-amber-500'
                              : n.severity === 'success'
                              ? 'bg-emerald-400'
                              : 'bg-blue-400'
                          }`}
                        />
                        <h4 className="font-bold text-xs sm:text-sm text-white">{n.title}</h4>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString('pt-MZ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-2">{n.message}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400">
                        Loja: <strong className="text-slate-200">{n.storeName}</strong>
                      </span>
                      <span className="text-emerald-400 font-medium">Ação: {n.actionRecommended}</span>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">
                        Status Real: {n.deliveryStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Audit Logs Trail */}
            <div className="mt-8 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Trilha de Auditoria do Sistema</span>
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <div key={log.id} className="pt-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-200">
                        <span className="font-mono text-emerald-400 mr-2">[{log.action}]</span>
                        {log.details}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Por: {log.userName} ({log.userRole}) • {log.storeName || 'Sede Geral'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('pt-MZ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: RELATÓRIOS & PASTAS DE VENDAS GUARDADAS ===================== */}
        {adminTab === 'reports' && (
          <div className="space-y-5">
            {/* Sub-Navigation between Saved Reports Folder and Financial DRE */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportsSubView('folder_archive')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    reportsSubView === 'folder_archive'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Archive className="w-4 h-4 text-amber-400" />
                  <span>Pasta de Relatórios & Vendas por Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportsSubView('dre_metrics')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    reportsSubView === 'dre_metrics'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Demonstrativo DRE & Balanço Contábil</span>
                </button>
              </div>

              {reportsSubView === 'dre_metrics' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Baixar CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir DRE</span>
                  </button>
                </div>
              )}
            </div>

            {/* View 1: Saved Reports Folder (Pastas de Vendas por Data & Arquivo Permanente) */}
            {reportsSubView === 'folder_archive' && <SavedReportsFolder />}

            {/* View 2: Financial DRE */}
            {reportsSubView === 'dre_metrics' && (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl max-w-2xl mx-auto space-y-4">
                  <div className="text-center pb-4 border-b border-slate-800">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      SL VENDAS — DEMONSTRATIVO DE RESULTADOS (DRE)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Moeda Oficial: Metical Moçambicano (MZN) • Fuso: África/Maputo
                    </p>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">(+) RECEITA BRUTA DE VENDAS</span>
                      <span className="font-bold text-white">{totalRevenue.toFixed(2)} MZN</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/80 text-red-300">
                      <span>(-) CUSTO DAS MERCADORIAS VENDIDAS (CPV)</span>
                      <span>-{totalCost.toFixed(2)} MZN</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-700 font-bold text-emerald-400">
                      <span>(=) LUCRO BRUTO OPERACIONAL</span>
                      <span>{grossProfit.toFixed(2)} MZN</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/80 text-amber-300">
                      <span>(-) DESPESAS OPERACIONAIS FIXAS</span>
                      <span>-{totalExpenses.toFixed(2)} MZN</span>
                    </div>

                    <div className="flex justify-between py-2 text-base font-bold text-emerald-400 border-t-2 border-emerald-500/60 pt-2">
                      <span>(=) LUCRO LÍQUIDO DO PERÍODO</span>
                      <span>{netProfit.toFixed(2)} MZN</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 8.5: CONFIGURAÇÕES DOS MODELOS DE CAIXA ===================== */}
        {adminTab === 'cashier_models' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <Sliders className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-extrabold text-white">
                    Configuração dos Modelos do Caixa
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    EXCLUSIVO GESTOR GERAL
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Defina qual modelo de trabalho será apresentado aos caixas nas lojas. Escolha entre o{' '}
                  <strong className="text-white">Modelo Ed Supermercado (3 Colunas)</strong>, o{' '}
                  <strong className="text-white">Modelo Nati (Touch & Tablet Rápido)</strong>, ou os layouts para tablet, celular e guiado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSangriaModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Sangria / Suprimento</span>
                </button>
              </div>
            </div>

            {/* Active Model Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-orange-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                    Modelo Ativo Atualmente no Caixa
                  </p>
                  <h3 className="text-base font-extrabold text-white">
                    {CASHIER_MODELS_LIST.find((m) => m.id === cashierModel)?.name || 'Modelo Ed Supermercado'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Livre escolha para caixas e administradores • Adaptação ergonômica a qualquer tipo de tela
                  </p>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5 self-start sm:self-center">
                <CheckCircle className="w-4 h-4" />
                <span>SINCRONIZADO EM TODAS AS LOJAS</span>
              </div>
            </div>

            {modelChangeSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{modelChangeSuccess}</span>
              </div>
            )}

            {/* Model Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CASHIER_MODELS_LIST.map((model) => {
                const isSelected = cashierModel === model.id;
                const isNati = model.id === 'modelo_nati';
                const isEd = model.id === 'modelo_ed_supermercado';

                return (
                  <div
                    key={model.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/40'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2.5 rounded-2xl ${
                              isNati
                                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                                : isEd
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : model.id === 'modelo_tablet_keypad' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isNati ? (
                              <Sparkles className="w-5 h-5" />
                            ) : isEd ? (
                              <Laptop className="w-5 h-5" />
                            ) : model.id === 'modelo_tablet_keypad' ? (
                              <Tablet className="w-5 h-5" />
                            ) : (
                              <Smartphone className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-orange-400 font-bold border border-slate-700">
                              {model.badge}
                            </span>
                            <h4 className="font-extrabold text-sm sm:text-base text-white mt-1">
                              {model.name}
                            </h4>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                            ATIVO
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {model.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 text-[11px] text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300">
                          Recomendado: <span className="font-normal text-slate-300">{model.recommendedFor}</span>
                        </p>
                        <div className="pt-1 border-t border-slate-800 space-y-0.5">
                          {model.features.map((feat, i) => (
                            <p key={i} className="flex items-center gap-1.5 text-slate-300 text-[10px]">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{feat}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCashierModel(model.id);
                        setModelChangeSuccess(`Modelo "${model.name}" ativado com sucesso para todos os caixas!`);
                        setTimeout(() => setModelChangeSuccess(null), 3500);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 cursor-default'
                          : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-950/40 active:scale-[0.98]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>MODELO ATIVO NO CAIXA</span>
                        </>
                      ) : (
                        <>
                          <Sliders className="w-4 h-4" />
                          <span>Ativar Este Modelo no Caixa</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Cash Transactions Table (Sangrias e Suprimentos) */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Histórico de Sangrias e Reforços de Caixa
                  </h3>
                  <p className="text-xs text-slate-400">
                    Movimentações físicas de numerário da gaveta auditadas
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {cashTransactions.length} registros
                </span>
              </div>

              {cashTransactions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Nenhuma sangria ou reforço registrado até o momento.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="pb-2">Data / Hora</th>
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Loja</th>
                        <th className="pb-2">Operador</th>
                        <th className="pb-2">Motivo</th>
                        <th className="pb-2">Autorizado Por</th>
                        <th className="pb-2 text-right">Valor MZN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {cashTransactions.slice(0, 8).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 text-slate-300">
                            {new Date(tx.timestamp).toLocaleString('pt-MZ')}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                tx.type === 'SANGRIA'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-200">{tx.storeName}</td>
                          <td className="py-2.5 text-slate-300">{tx.cashierName}</td>
                          <td className="py-2.5 text-slate-400 font-sans">{tx.reason}</td>
                          <td className="py-2.5 text-slate-400 font-sans">{tx.authorizedBy}</td>
                          <td
                            className={`py-2.5 font-bold text-right ${
                              tx.type === 'SANGRIA' ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {tx.type === 'SANGRIA' ? '-' : '+'}
                            {tx.amount.toFixed(2)} MZN
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: SESSÕES & TURNOS (INÍCIO E TÉRMINO DE SESSÃO) ===================== */}
        {adminTab === 'sessions' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span>Início e Término de Sessão de Caixa (Turnos Operacionais)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Auditoria de início e término de sessão para cada loja e caixa com conferência de fundo inicial, vendas e quebra de caixa
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold">
                  {shiftClosures.length} Fechos Registrados
                </span>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Total de Turnos Registrados</span>
                <span className="font-mono font-bold text-2xl text-white">{shiftClosures.length}</span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Faturamento em Turnos</span>
                <span className="font-mono font-bold text-2xl text-emerald-400">
                  {shiftClosures.reduce((acc, c) => acc + c.totalSalesGross, 0).toFixed(2)} MZN
                </span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Fundos de Troco Iniciais</span>
                <span className="font-mono font-bold text-2xl text-blue-400">
                  {shiftClosures.reduce((acc, c) => acc + c.initialCash, 0).toFixed(2)} MZN
                </span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Divergência / Quebra Total</span>
                <span
                  className={`font-mono font-bold text-2xl ${
                    shiftClosures.reduce((acc, c) => acc + c.difference, 0) < 0
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {shiftClosures.reduce((acc, c) => acc + c.difference, 0).toFixed(2)} MZN
                </span>
              </div>
            </div>

            {/* Shift Closures Table */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3 font-semibold">Nº Fecho</th>
                    <th className="pb-3 font-semibold">Loja</th>
                    <th className="pb-3 font-semibold">Operador de Caixa</th>
                    <th className="pb-3 font-semibold">Início de Sessão</th>
                    <th className="pb-3 font-semibold">Término de Sessão</th>
                    <th className="pb-3 font-semibold text-right">Fundo Inicial</th>
                    <th className="pb-3 font-semibold text-right">Faturado Turno</th>
                    <th className="pb-3 font-semibold text-right">Gaveta Real</th>
                    <th className="pb-3 font-semibold text-right">Diferença</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {shiftClosures.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 font-sans">
                        Nenhuma sessão ou fecho registrado ainda. As sessões abertas e fechadas pelos caixas aparecerão aqui.
                      </td>
                    </tr>
                  ) : (
                    shiftClosures.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 font-bold text-purple-400">{c.closureNumber}</td>
                        <td className="py-3 text-slate-200 font-sans">{c.storeName}</td>
                        <td className="py-3 text-white font-sans">{c.cashierName}</td>
                        <td className="py-3 text-slate-400">
                          {new Date(c.openedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}{' '}
                          <span className="text-[10px] text-slate-500">({new Date(c.openedAt).toLocaleDateString('pt-MZ')})</span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(c.closedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}{' '}
                          <span className="text-[10px] text-slate-500">({new Date(c.closedAt).toLocaleDateString('pt-MZ')})</span>
                        </td>
                        <td className="py-3 text-slate-300 text-right">{c.initialCash.toFixed(2)} MZN</td>
                        <td className="py-3 font-bold text-emerald-400 text-right">
                          {c.totalSalesGross.toFixed(2)} MZN
                        </td>
                        <td className="py-3 font-bold text-white text-right">
                          {c.actualCashInDrawer.toFixed(2)} MZN
                        </td>
                        <td
                          className={`py-3 font-bold text-right ${
                            c.difference < 0
                              ? 'text-red-400'
                              : c.difference > 0
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {c.difference === 0 ? 'Exato' : `${c.difference > 0 ? '+' : ''}${c.difference.toFixed(2)} MZN`}
                        </td>
                        <td className="py-3 text-center font-sans">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            Fechada & Sincronizada
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Adicionar Produto */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Cadastrar Novo Produto ou Serviço</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cost = parseFloat(productForm.costPrice) || 0;
                const sale = parseFloat(productForm.salePrice) || 0;
                const qty = parseInt(productForm.stockQuantity) || 0;
                const min = parseInt(productForm.minStock) || 10;

                const stockByStore: Record<string, number> = {};
                stores.forEach((st) => {
                  stockByStore[st.id] = Math.floor(qty / stores.length);
                });

                addProduct({
                  name: productForm.name,
                  code: productForm.code || `PROD-${Date.now().toString().slice(-4)}`,
                  category: productForm.category,
                  costPrice: cost,
                  salePrice: sale,
                  stockQuantity: qty,
                  stockByStore,
                  minStock: min,
                  supplier: productForm.supplier || 'Fornecedor Geral',
                  unit: productForm.unit,
                });

                setShowProductModal(false);
                setProductForm({
                  name: '',
                  code: '',
                  category: 'Informática & Papelaria',
                  costPrice: '',
                  salePrice: '',
                  stockQuantity: '',
                  minStock: '10',
                  supplier: '',
                  unit: 'Unid',
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Resma Papel A4 Chamex"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">Código / Barcode</label>
                    <button
                      type="button"
                      onClick={() => setIsProductCameraOpen(true)}
                      className="text-[10px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Câmera do Celular</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={productForm.code}
                      onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                      placeholder="Ex: 7891005123456 ou PAP-01"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none font-mono pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setIsProductCameraOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-400"
                      title="Escanear com Câmera do Telemóvel"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="Ex: Informática"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">P. Custo (MZN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">P. Venda (MZN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    required
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Loja */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Adicionar Nova Filial / Loja</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addStore({
                  name: storeForm.name,
                  code: storeForm.code || `LOJA-0${stores.length + 1}`,
                  address: storeForm.address,
                  city: storeForm.city,
                  phone: storeForm.phone,
                  nuit: storeForm.nuit,
                  dailySalesTarget: 35000,
                  status: 'active',
                  isOnline: true,
                  cashierIds: [],
                  responsibleName: storeForm.managerName || 'Responsável Local',
                });
                setShowStoreModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="Ex: Loja Tete - Centro"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Código</label>
                  <input
                    type="text"
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    placeholder="LOJA-05"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    placeholder="Ex: Maputo / Beira"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  required
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Av. Principal, nº..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="+258 84..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">NUIT Fiscal</label>
                  <input
                    type="text"
                    required
                    value={storeForm.nuit}
                    onChange={(e) => setStoreForm({ ...storeForm, nuit: e.target.value })}
                    placeholder="400123456"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Criar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste / Entrada de Estoque */}
      {stockAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white mb-1">Entrada de Estoque</h3>
            <p className="text-slate-400 mb-4">{stockAdjustmentModal.productName}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Loja de Destino</label>
                <select
                  value={stockAdjustmentModal.storeId}
                  onChange={(e) =>
                    setStockAdjustmentModal({ ...stockAdjustmentModal, storeId: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Quantidade a Adicionar</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Motivo / Justificativa</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockAdjustmentModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const qty = parseInt(adjustQty) || 0;
                    if (qty > 0) {
                      adjustStock(
                        stockAdjustmentModal.productId,
                        stockAdjustmentModal.storeId,
                        qty,
                        adjustReason
                      );
                      setStockAdjustmentModal(null);
                      setAdjustQty('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Confirmar Entrada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estornar Venda */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white mb-2">Estorno de Venda</h3>
            <p className="text-slate-400 mb-4">
              Informe a justificativa do cancelamento. O estoque será devolvido automaticamente.
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Devolução pelo cliente com defeito / Troca de item..."
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mb-4 outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelModalSale(null)}
                className="px-4 py-2 rounded-xl text-slate-400"
              >
                Voltar
              </button>
              <button
                disabled={!cancelReason.trim()}
                onClick={() => {
                  cancelSale(cancelModalSale, cancelReason);
                  setCancelModalSale(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
              >
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner for Product Registration */}
      <CameraBarcodeScanner
        isOpen={isProductCameraOpen}
        onClose={() => setIsProductCameraOpen(false)}
        onScan={(code) => setProductForm({ ...productForm, code })}
        title="Leitor de Código de Barras do Produto"
        subtitle="Aponte a câmera do telemóvel para o código de barras da embalagem"
      />

      {/* Sangria & Suprimento de Caixa Modal */}
      <SangriaModal
        isOpen={isSangriaModalOpen}
        onClose={() => setIsSangriaModalOpen(false)}
      />

      {/* Product Management Modal (5MB+ Image Upload, Camera Scanner, Multi-store Stock) */}
      <ProductManagementModal
        isOpen={isProductManagementModalOpen}
        onClose={() => {
          setIsProductManagementModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      {/* User Management Modal (5MB+ Photo Upload, Role store_manager/cashier, Full Data) */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setUserToEdit(null);
        }}
        userToEdit={userToEdit}
      />

      {/* Modal: Confirmação de Eliminação Permanente de Utilizador */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Eliminar Permanente</h3>
                <p className="text-slate-400">Esta ação é irreversível</p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Tem a certeza de que deseja eliminar permanentemente o utilizador{' '}
              <strong className="text-white font-bold">{deleteConfirmUser.name}</strong> (
              {deleteConfirmUser.email}) da loja {deleteConfirmUser.assignedStoreName}?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser(deleteConfirmUser.id);
                  setDeleteConfirmUser(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-950/50"
              >
                Sim, Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Device Management Modal (Adicionar & Editar Manualmente Dispositivo) */}
      <DeviceManagementModal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          setIsDeviceModalOpen(false);
          setDeviceToEdit(null);
        }}
        deviceToEdit={deviceToEdit}
      />

      {/* System Reset Modal (⚙️ Limpeza & Restauração com Código do Servidor) */}
      <SystemResetModal
        isOpen={isSystemResetModalOpen}
        onClose={() => setIsSystemResetModalOpen(false)}
      />

      {/* Modal: Confirmação de Eliminação Permanente de Dispositivo */}
      {deleteConfirmDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Eliminar Dispositivo</h3>
                <p className="text-slate-400">Esta ação é irreversível</p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Tem certeza de que deseja eliminar permanentemente o dispositivo{' '}
              <strong className="text-white font-bold">{deleteConfirmDevice.deviceName}</strong> (
              {deleteConfirmDevice.ipAddress} - {deleteConfirmDevice.assignedStoreName}) do sistema?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDevice(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDevice(deleteConfirmDevice.id);
                  setDeleteConfirmDevice(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-950/50"
              >
                Sim, Eliminar Permanente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Eliminação Permanente de Venda */}
      {deleteConfirmSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Eliminar Venda</h3>
                <p className="text-slate-400">Restauração automática do estoque</p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Deseja eliminar permanentemente a venda nº{' '}
              <strong className="text-emerald-400 font-mono font-bold">{deleteConfirmSale.saleNumber}</strong> no valor de{' '}
              <strong className="text-white font-bold">{deleteConfirmSale.total.toFixed(2)} MZN</strong>?
              O estoque dos itens vendidos será retornado ao inventário da loja {deleteConfirmSale.storeName}.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSale(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSale(deleteConfirmSale.id);
                  setDeleteConfirmSale(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-950/50"
              >
                Sim, Eliminar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Meta Diária da Loja (+ Meta Diária) */}
      {targetEditStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-blue-500/40 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Meta Diária de Vendas</h3>
                <p className="text-slate-400">{targetEditStore.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold">Valor da Meta Diária (MZN):</label>
              <input
                type="number"
                min="0"
                step="500"
                value={targetInputVal}
                onChange={(e) => setTargetInputVal(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-base outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetEditStore(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(targetInputVal) || 0;
                  if (val >= 0) {
                    updateStore(targetEditStore.id, { dailySalesTarget: val });
                    setTargetEditStore(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-950/50"
              >
                Salvar Meta Diária
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Fechos Diários da Loja (+ Fecho Diário) */}
      {storeClosuresModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl text-xs space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Fechos Diários de Caixa</h3>
                  <p className="text-slate-400">{storeClosuresModal.name} • {storeClosuresModal.city}</p>
                </div>
              </div>
              <button
                onClick={() => setStoreClosuresModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {(() => {
                const storeClosures = shiftClosures.filter((c) => c.storeId === storeClosuresModal.id);
                if (storeClosures.length === 0) {
                  return (
                    <div className="py-10 text-center text-slate-500">
                      Nenhum fecho diário registrado ainda para esta loja.
                    </div>
                  );
                }
                return storeClosures.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-400">{c.closureNumber}</span>
                        <span className="text-white font-semibold">{c.cashierName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Fechado: {new Date(c.closedAt).toLocaleString('pt-MZ')} • {c.salesCount} vendas
                      </p>
                    </div>

                    <div className="text-right sm:text-right font-mono">
                      <span className="text-[10px] text-slate-400 block">Total Faturado:</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {c.totalSalesGross.toFixed(2)} MZN
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Fundo: {c.initialCash.toFixed(2)} | Gaveta: {c.actualCashInDrawer.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStoreClosuresModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Products & Cashier Visibility Modal */}
      <StoreProductsModal
        isOpen={!!storeForProductsModal}
        onClose={() => setStoreForProductsModal(null)}
        store={storeForProductsModal}
        onAddNewProduct={() => {
          setProductToEdit(null);
          setIsProductManagementModalOpen(true);
        }}
        onEditProduct={(p) => {
          setProductToEdit(p);
          setIsProductManagementModalOpen(true);
        }}
        onOpenDestruction={(prod, stId) => {
          setDestructionInitialProduct(prod);
          setDestructionInitialStoreId(stId);
          setIsDestructionModalOpen(true);
        }}
      />

      {/* Product Destruction & Stock Distribution Modal */}
      <ProductDestructionModal
        isOpen={isDestructionModalOpen}
        onClose={() => {
          setIsDestructionModalOpen(false);
          setDestructionInitialProduct(null);
          setDestructionInitialStoreId(undefined);
        }}
        initialProductId={destructionInitialProduct?.id}
        initialStoreId={destructionInitialStoreId}
      />
    </div>
  );
};
