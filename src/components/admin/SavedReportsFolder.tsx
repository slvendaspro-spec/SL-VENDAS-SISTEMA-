import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Calendar,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  DollarSign,
  Clock,
  ShieldCheck,
  Save,
  Trash2,
  ShoppingCart,
  Store as StoreIcon,
  User as UserIcon,
  FileText,
  Archive,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Sale, ShiftClosure, Store } from '../../types';
import { sound } from '../../services/soundService';

interface SavedReportArchiveItem {
  id: string;
  title: string;
  dateKey: string;
  createdAt: string;
  adminName: string;
  notes: string;
  storeName: string;
  totalRevenue: number;
  salesCount: number;
  totalCost: number;
  profit: number;
}

const STORAGE_SAVED_REPORTS_KEY = 'sl_vendas_saved_reports_archive';

export const SavedReportsFolder: React.FC = () => {
  const { sales, shiftClosures, stores, users, currentUser } = useStore();

  // Active view: 'folders' (dossiês diários) or 'saved_archives' (relatórios arquivados com anotações)
  const [activeSubTab, setActiveSubTab] = useState<'folders' | 'saved_archives'>('folders');

  // Filter States
  const [filterPeriod, setFilterPeriod] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM'
  >('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [selectedCashierId, setSelectedCashierId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Date Folder (YYYY-MM-DD)
  const [openedFolderDate, setOpenedFolderDate] = useState<string | null>(null);

  // Selected Sale for viewing past receipt/factura
  const [selectedHistoricalSale, setSelectedHistoricalSale] = useState<Sale | null>(null);

  // Modal to save report snapshot with admin notes
  const [isSaveReportModalOpen, setIsSaveReportModalOpen] = useState(false);
  const [reportCustomTitle, setReportCustomTitle] = useState('');
  const [reportAdminNotes, setReportAdminNotes] = useState('');
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState<string | null>(null);

  // Persistent Saved Reports Archive in LocalStorage
  const [savedArchives, setSavedArchives] = useState<SavedReportArchiveItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SAVED_REPORTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rep_sample_01',
        title: 'Fecho Semanal Auditado - Maputo Central',
        dateKey: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        adminName: 'Kelsson Moisés (Administrador Geral)',
        notes: 'Todas as vendas em M-Pesa, E-Mola e Dinheiro conferidas com as guias de sangria. Estoque sem divergências.',
        storeName: 'Todas as Lojas',
        totalRevenue: 28540.0,
        salesCount: 42,
        totalCost: 19200.0,
        profit: 9340.0,
      },
    ];
  });

  const saveArchivesToStorage = (items: SavedReportArchiveItem[]) => {
    setSavedArchives(items);
    localStorage.setItem(STORAGE_SAVED_REPORTS_KEY, JSON.stringify(items));
  };

  // Helper date parsing (YYYY-MM-DD from ISO)
  const getDateKey = (isoString: string): string => {
    try {
      return new Date(isoString).toISOString().split('T')[0];
    } catch {
      return isoString.substring(0, 10);
    }
  };

  // Date Filtering Logic
  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return sales.filter((s) => {
      const sDate = getDateKey(s.timestamp);

      // Period filter
      if (filterPeriod === 'TODAY' && sDate !== today) return false;
      if (filterPeriod === 'YESTERDAY' && sDate !== yesterdayDate) return false;
      if (filterPeriod === 'LAST_7') {
        const diffDays = (Date.now() - new Date(s.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      }
      if (filterPeriod === 'LAST_30') {
        const diffDays = (Date.now() - new Date(s.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
      if (filterPeriod === 'THIS_MONTH') {
        const curMonth = today.substring(0, 7);
        if (!sDate.startsWith(curMonth)) return false;
      }
      if (filterPeriod === 'CUSTOM') {
        if (startDate && sDate < startDate) return false;
        if (endDate && sDate > endDate) return false;
      }

      // Store filter
      if (selectedStoreId !== 'ALL' && s.storeId !== selectedStoreId) return false;

      // Cashier filter
      if (selectedCashierId !== 'ALL' && s.cashierId !== selectedCashierId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSaleNum = s.saleNumber.toLowerCase().includes(q);
        const matchesCust = s.customerName?.toLowerCase().includes(q);
        const matchesProd = s.items.some((it) => it.productName.toLowerCase().includes(q));
        const matchesMethod = s.paymentMethod.toLowerCase().includes(q);
        if (!matchesSaleNum && !matchesCust && !matchesProd && !matchesMethod) return false;
      }

      return true;
    });
  }, [sales, filterPeriod, startDate, endDate, selectedStoreId, selectedCashierId, searchQuery]);

  // Group filtered sales by Date Folder (YYYY-MM-DD)
  const salesByDateFolders = useMemo(() => {
    const map = new Map<string, Sale[]>();

    filteredSales.forEach((s) => {
      const dKey = getDateKey(s.timestamp);
      if (!map.has(dKey)) {
        map.set(dKey, []);
      }
      map.get(dKey)!.push(s);
    });

    // Sort folders by date descending (newest first)
    return Array.from(map.entries())
      .map(([dateKey, items]) => {
        const completedItems = items.filter((s) => s.status === 'COMPLETED');
        const cancelledItems = items.filter((s) => s.status === 'CANCELLED');
        const revenue = completedItems.reduce((acc, s) => acc + s.total, 0);
        const cost = completedItems.reduce((acc, s) => acc + s.totalCost, 0);
        const profit = completedItems.reduce((acc, s) => acc + s.estimatedProfit, 0);
        const ivaTotal = completedItems.reduce((acc, s) => acc + (s.ivaAmount || 0), 0);

        // Closures for this date
        const relatedClosures = shiftClosures.filter(
          (c) => getDateKey(c.closedAt) === dateKey
        );

        return {
          dateKey,
          items,
          completedCount: completedItems.length,
          cancelledCount: cancelledItems.length,
          totalRevenue: revenue,
          totalCost: cost,
          totalProfit: profit,
          totalIVA: ivaTotal,
          shiftClosures: relatedClosures,
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredSales, shiftClosures]);

  // Format date readable in Portuguese
  const formatDateFriendly = (dateKey: string) => {
    try {
      const [y, m, d] = dateKey.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let prefix = '';
      if (dateKey === today) prefix = 'Hoje, ';
      else if (dateKey === yesterday) prefix = 'Ontem, ';

      const formatted = dateObj.toLocaleDateString('pt-MZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        weekday: 'short',
      });
      return `${prefix}${formatted}`;
    } catch {
      return dateKey;
    }
  };

  // Currently opened folder object
  const activeOpenedFolder = useMemo(() => {
    if (!openedFolderDate) return null;
    return salesByDateFolders.find((f) => f.dateKey === openedFolderDate) || null;
  }, [salesByDateFolders, openedFolderDate]);

  // Export CSV for the specific date folder
  const handleExportDateCSV = (dateFolder: (typeof salesByDateFolders)[0]) => {
    sound.click();
    const headers = [
      'Nº Venda',
      'Data e Hora',
      'Loja',
      'Operador',
      'Cliente',
      'Método Pagamento',
      'Total (MZN)',
      'Custo (MZN)',
      'Lucro (MZN)',
      'IVA (MZN)',
      'Estado',
    ];

    const rows = dateFolder.items.map((s) => [
      s.saleNumber,
      new Date(s.timestamp).toLocaleString('pt-MZ'),
      `"${s.storeName}"`,
      `"${s.cashierName}"`,
      `"${s.customerName || 'Cliente Balcão'}"`,
      s.paymentMethod,
      s.total.toFixed(2),
      s.totalCost.toFixed(2),
      s.estimatedProfit.toFixed(2),
      (s.ivaAmount || 0).toFixed(2),
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RELATORIO_VENDAS_${dateFolder.dateKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save current folder to archive with admin notes
  const handleSaveArchiveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOpenedFolder) return;

    const newArchiveItem: SavedReportArchiveItem = {
      id: `rep_${Date.now()}`,
      title: reportCustomTitle.trim() || `Dossiê Arquivado • ${activeOpenedFolder.dateKey}`,
      dateKey: activeOpenedFolder.dateKey,
      createdAt: new Date().toISOString(),
      adminName: `${currentUser.name} (${currentUser.role === 'general_manager' ? 'Administrador Geral' : 'Gestor'})`,
      notes: reportAdminNotes.trim() || 'Relatório conferido e arquivado sem observações pendentes.',
      storeName: selectedStoreId === 'ALL' ? 'Todas as Lojas' : stores.find((s) => s.id === selectedStoreId)?.name || 'Loja',
      totalRevenue: activeOpenedFolder.totalRevenue,
      salesCount: activeOpenedFolder.completedCount,
      totalCost: activeOpenedFolder.totalCost,
      profit: activeOpenedFolder.totalProfit,
    };

    saveArchivesToStorage([newArchiveItem, ...savedArchives]);
    setIsSaveReportModalOpen(false);
    setReportCustomTitle('');
    setReportAdminNotes('');
    setArchiveSuccessMessage(`Relatório "${newArchiveItem.title}" guardado na Pasta Permanente com sucesso!`);
    sound.success();
    setTimeout(() => setArchiveSuccessMessage(null), 5000);
  };

  const handleDeleteSavedArchive = (id: string) => {
    if (confirm('Deseja eliminar este relatório guardado do arquivo permanente?')) {
      saveArchivesToStorage(savedArchives.filter((a) => a.id !== id));
      sound.click();
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                ARQUIVO OFICIAL
              </span>
              <h2 className="text-lg font-black text-white">
                Pasta de Relatórios Guardados & Vendas Anteriores
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte vendas de datas passadas agrupadas em pastas diárias, comprovativos fiscais e fechos de caixa arquivados
            </p>
          </div>
        </div>

        {/* Sub-Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('folders')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'folders'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Pastas por Data ({salesByDateFolders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('saved_archives')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'saved_archives'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Relatórios Salvos ({savedArchives.length})</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {archiveSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{archiveSuccessMessage}</span>
        </div>
      )}

      {/* ===================== TAB 1: PASTAS POR DATA (DOSSIÊS DIÁRIOS) ===================== */}
      {activeSubTab === 'folders' && (
        <div className="space-y-4">
          {/* Advanced Filter Toolbar */}
          <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                Filtros de Pesquisa por Data e Loja:
              </span>

              {/* Quick Period Buttons */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'ALL', label: 'Todas as Datas' },
                  { id: 'TODAY', label: 'Hoje' },
                  { id: 'YESTERDAY', label: 'Ontem' },
                  { id: 'LAST_7', label: 'Últimos 7 Dias' },
                  { id: 'LAST_30', label: 'Últimos 30 Dias' },
                  { id: 'THIS_MONTH', label: 'Este Mês' },
                  { id: 'CUSTOM', label: 'Personalizado' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterPeriod(item.id as any);
                      sound.click();
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      filterPeriod === item.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Date pickers (when CUSTOM) */}
              {filterPeriod === 'CUSTOM' ? (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">De (Data Inicial):</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Até (Data Final):</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </>
              ) : null}

              {/* Store Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Filial / Loja:</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="ALL">Todas as Lojas ({stores.length})</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cashier Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Operador / Vendedor:</label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="ALL">Todos os Operadores</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'general_manager' ? 'Admin' : 'Caixa'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search query */}
              <div className={filterPeriod === 'CUSTOM' ? 'sm:col-span-2 lg:col-span-2' : 'sm:col-span-2'}>
                <label className="block text-[10px] text-slate-400 mb-1">Buscar por Nº Venda / Cliente / Produto:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: SLV-10024, M-Pesa, Arroz..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* List of Date Folders */}
          {salesByDateFolders.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800">
              <Folder className="w-12 h-12 mx-auto mb-2 text-slate-700" />
              <p className="text-sm font-semibold">Nenhuma venda encontrada para as datas e filtros selecionados.</p>
              <p className="text-xs text-slate-600 mt-1">Ajuste o período acima para visualizar o histórico completo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salesByDateFolders.map((folder) => {
                const isOpen = openedFolderDate === folder.dateKey;
                const hasShiftClosure = folder.shiftClosures.length > 0;

                return (
                  <div
                    key={folder.dateKey}
                    className={`rounded-3xl border transition-all ${
                      isOpen
                        ? 'bg-slate-900 border-blue-500/60 shadow-2xl'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Folder Header Banner */}
                    <div
                      onClick={() => {
                        setOpenedFolderDate(isOpen ? null : folder.dateKey);
                        sound.click();
                      }}
                      className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Left: Folder Name & Date */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors ${
                            isOpen
                              ? 'bg-blue-600 text-white border-blue-400'
                              : 'bg-slate-950 text-blue-400 border-slate-800'
                          }`}
                        >
                          {isOpen ? <FolderOpen className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30">
                              {folder.dateKey}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-white capitalize">
                              {formatDateFriendly(folder.dateKey)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{folder.completedCount} vendas registradas</span>
                            {folder.cancelledCount > 0 && (
                              <span className="text-red-400 font-semibold">
                                • {folder.cancelledCount} estornos
                              </span>
                            )}
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                hasShiftClosure
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {hasShiftClosure ? 'Fecho Registrado' : 'Sem Fecho Formal'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics & Open Toggle */}
                      <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <div className="text-left lg:text-right font-mono">
                          <span className="text-[10px] text-slate-400 block font-sans">Faturamento do Dia:</span>
                          <span className="text-base font-bold text-emerald-400">
                            {folder.totalRevenue.toFixed(2)} MZN
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Lucro Estimado: +{folder.totalProfit.toFixed(2)} MZN
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportDateCSV(folder);
                            }}
                            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                            title="Exportar CSV de Vendas desta Data"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          </button>
                          <div className="p-2 rounded-xl bg-slate-950 text-slate-400 border border-slate-800">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Folder Expanded Content (Inside the Date Dossier) */}
                    {isOpen && (
                      <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-4 animate-in fade-in">
                        {/* Day Financial Summary Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-sans block">Receita Bruta:</span>
                            <span className="text-sm font-bold text-white">
                              {folder.totalRevenue.toFixed(2)} MZN
                            </span>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-sans block">Custo CPV:</span>
                            <span className="text-sm font-bold text-red-300">
                              -{folder.totalCost.toFixed(2)} MZN
                            </span>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30">
                            <span className="text-[10px] text-emerald-400 font-sans block">Lucro Bruto:</span>
                            <span className="text-sm font-bold text-emerald-400">
                              +{folder.totalProfit.toFixed(2)} MZN
                            </span>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-sans block">IVA 17% Arrecadado:</span>
                            <span className="text-sm font-bold text-sky-400">
                              {folder.totalIVA.toFixed(2)} MZN
                            </span>
                          </div>
                        </div>

                        {/* Shift Closure Details for this date if present */}
                        {hasShiftClosure && (
                          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Fecho de Caixa Vinculado à Data
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {folder.shiftClosures[0].closureNumber}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                              <div>
                                <span className="text-[10px] text-slate-500 block">Operador do Fecho:</span>
                                <span className="font-bold text-white">{folder.shiftClosures[0].cashierName}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Fundo Inicial:</span>
                                <span>{folder.shiftClosures[0].initialCash.toFixed(2)} MZN</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Contado na Gaveta:</span>
                                <span className="font-bold text-emerald-400">
                                  {folder.shiftClosures[0].actualCashInDrawer.toFixed(2)} MZN
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Diferença / Quebra:</span>
                                <span
                                  className={`font-bold ${
                                    folder.shiftClosures[0].difference === 0
                                      ? 'text-emerald-400'
                                      : folder.shiftClosures[0].difference > 0
                                      ? 'text-blue-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {folder.shiftClosures[0].difference > 0 ? '+' : ''}
                                  {folder.shiftClosures[0].difference.toFixed(2)} MZN
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions for this day's folder */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                          <span className="text-xs text-slate-400">
                            Exibindo todas as {folder.items.length} transações ocorridas nesta data
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReportCustomTitle(`Dossiê de Vendas • ${folder.dateKey}`);
                                setReportAdminNotes(
                                  `Fecho diário com ${folder.completedCount} vendas finalizadas. Receita total de ${folder.totalRevenue.toFixed(2)} MZN.`
                                );
                                setIsSaveReportModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar no Arquivo Permanente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimir Relatório do Dia</span>
                            </button>
                          </div>
                        </div>

                        {/* Table of all sales on that date */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                                <th className="p-3 font-semibold">Nº Venda</th>
                                <th className="p-3 font-semibold">Horário</th>
                                <th className="p-3 font-semibold">Loja</th>
                                <th className="p-3 font-semibold">Vendedor</th>
                                <th className="p-3 font-semibold">Cliente</th>
                                <th className="p-3 font-semibold">Pagamento</th>
                                <th className="p-3 font-semibold text-right">Total (MZN)</th>
                                <th className="p-3 font-semibold text-center">Estado</th>
                                <th className="p-3 font-semibold text-right">Comprovativo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {folder.items.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-900/60 transition-colors">
                                  <td className="p-3 font-bold text-emerald-400">{s.saleNumber}</td>
                                  <td className="p-3 text-slate-400">
                                    {new Date(s.timestamp).toLocaleTimeString('pt-MZ', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="p-3 text-slate-200 font-sans">{s.storeName}</td>
                                  <td className="p-3 text-slate-300 font-sans">{s.cashierName}</td>
                                  <td className="p-3 text-slate-300 font-sans">{s.customerName || 'Cliente Balcão'}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-200">
                                      {s.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="p-3 font-bold text-white text-right">
                                    {s.total.toFixed(2)} MZN
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        s.status === 'COMPLETED'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-red-950 text-red-400 border border-red-500/30'
                                      }`}
                                    >
                                      {s.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedHistoricalSale(s)}
                                      className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 font-bold text-[11px] border border-blue-500/30 flex items-center gap-1 ml-auto transition-colors"
                                      title="Visualizar Comprovativo de Venda Antiga"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Ver Talão</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: RELATÓRIOS SALVOS & ARQUIVADOS PERMANENTES ===================== */}
      {activeSubTab === 'saved_archives' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Relatórios & Autos Arquivados com Notas da Administração</h3>
              <p className="text-xs text-slate-400">
                Histórico permanente de auditorias e balanços salvos pelo Administrador Geral
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setOpenedFolderDate(today);
                setActiveSubTab('folders');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Folder className="w-4 h-4" />
              <span>+ Arquivar Novo Dossiê de Vendas</span>
            </button>
          </div>

          {savedArchives.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800">
              <Save className="w-12 h-12 mx-auto mb-2 text-slate-700" />
              <p className="text-sm font-semibold">Nenhum relatório arquivado manualmente ainda.</p>
              <p className="text-xs text-slate-600 mt-1">
                Abra qualquer pasta de data na aba anterior e clique em "Salvar no Arquivo Permanente".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedArchives.map((archive) => (
                <div
                  key={archive.id}
                  className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                          {archive.dateKey}
                        </span>
                        <h4 className="font-bold text-base text-white mt-1">{archive.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedArchive(archive.id)}
                        className="p-1.5 rounded-xl hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors"
                        title="Eliminar Relatório Guardado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                      <strong className="text-slate-400 block mb-1 font-semibold">
                        Anotações do Administrador:
                      </strong>
                      {archive.notes}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">Vendas:</span>
                        <span className="font-bold text-white">{archive.salesCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">Faturamento:</span>
                        <span className="font-bold text-emerald-400">{archive.totalRevenue.toFixed(2)} MZN</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">Lucro:</span>
                        <span className="font-bold text-emerald-300">+{archive.profit.toFixed(2)} MZN</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate text-[11px]">
                      Salvo por: {archive.adminName} • {new Date(archive.createdAt).toLocaleDateString('pt-MZ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: SALVAR RELATÓRIO COM NOTAS ===================== */}
      {isSaveReportModalOpen && activeOpenedFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Salvar Relatório no Arquivo Permanente</h3>
                  <p className="text-slate-400">Guarde este dossiê com anotações e assinatura oficial do Administrador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveReportModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArchiveReport} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Título do Relatório Arquivado:</label>
                <input
                  type="text"
                  value={reportCustomTitle}
                  onChange={(e) => setReportCustomTitle(e.target.value)}
                  placeholder="Ex: Auditoria Diária de Caixa - Balanço Geral..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Parecer & Anotações de Auditoria do Administrador:
                </label>
                <textarea
                  rows={4}
                  value={reportAdminNotes}
                  onChange={(e) => setReportAdminNotes(e.target.value)}
                  placeholder="Ex: Todos os valores conferidos. O numerário em dinheiro foi depositado no cofre central e os pagamentos por M-Pesa foram verificados no extrato bancário..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Data das Vendas:</span>
                  <span className="font-bold text-white">{activeOpenedFolder.dateKey}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-sans block">Total Faturado:</span>
                  <span className="font-bold text-emerald-400">
                    {activeOpenedFolder.totalRevenue.toFixed(2)} MZN
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSaveReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar no Arquivo Permanente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: COMPROVATIVO DE VENDA HISTÓRICA (TALÃO) ===================== */}
      {selectedHistoricalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm bg-white text-slate-950 rounded-3xl p-6 shadow-2xl relative transition-all my-auto text-xs">
            <button
              onClick={() => setSelectedHistoricalSale(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Content with Store Logo and Full Header */}
            {(() => {
              const histStore = stores.find((s) => s.id === selectedHistoricalSale.storeId) || stores[0];
              return (
                <div className="receipt-content font-mono text-center space-y-2">
                  <div className="border-b border-slate-300 pb-2">
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mb-1.5">
                      HISTÓRICO DE VENDA ARQUIVADA
                    </span>

                    {/* Store Logo */}
                    {histStore?.logoUrl ? (
                      <div className="flex justify-center mb-1.5">
                        <img
                          src={histStore.logoUrl}
                          alt={histStore.name}
                          className="w-14 h-14 object-contain rounded-xl border border-slate-200 shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-1.5 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center border border-slate-700 shadow-sm">
                        {histStore?.name?.substring(0, 2).toUpperCase() || 'SL'}
                      </div>
                    )}

                    {/* Store Name in Bold Uppercase */}
                    <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 leading-tight">
                      {histStore?.name || selectedHistoricalSale.storeName}
                    </h3>

                    {/* Fiscal Information */}
                    <div className="text-[10px] text-slate-600 mt-1 space-y-0.5">
                      <p className="font-bold text-slate-800">NUIT: {histStore?.nuit || '400192837'}</p>
                      <p>{histStore?.address || 'Av. 24 de Julho'}, {histStore?.city || 'Maputo'}</p>
                      <p>Tel: {histStore?.phone || '+258 84 000 0000'}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-dashed border-slate-300">
                      <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                        FACTURA / TALÃO DE VENDA (VD)
                      </h4>
                      <p className="font-mono font-bold text-[11px] text-emerald-800">
                        Venda Nº: {selectedHistoricalSale.saleNumber}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Data: {new Date(selectedHistoricalSale.timestamp).toLocaleDateString('pt-MZ')}{' '}
                        {new Date(selectedHistoricalSale.timestamp).toLocaleTimeString('pt-MZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-[10px] text-slate-500">Operador: {selectedHistoricalSale.cashierName}</p>
                      <p className="text-[10px] text-slate-700 font-semibold">
                        Cliente: {selectedHistoricalSale.customerName || 'Cliente Balcão'}
                      </p>
                    </div>
                  </div>

              {/* Items List */}
              <div className="text-left py-1 space-y-1">
                {selectedHistoricalSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="font-bold shrink-0">{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-300 pt-2 text-right space-y-1">
                {selectedHistoricalSale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto ({selectedHistoricalSale.discountPercent}%):</span>
                    <span>-{selectedHistoricalSale.discount.toFixed(2)} MZN</span>
                  </div>
                )}
                {(selectedHistoricalSale.ivaAmount || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (17%):</span>
                    <span>{(selectedHistoricalSale.ivaAmount || 0).toFixed(2)} MZN</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-black border-t border-slate-300 pt-1">
                  <span>TOTAL:</span>
                  <span>{selectedHistoricalSale.total.toFixed(2)} MZN</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>PAGAMENTO:</span>
                  <span className="font-bold uppercase">{selectedHistoricalSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>ESTADO:</span>
                  <span
                    className={`font-bold ${
                      selectedHistoricalSale.status === 'COMPLETED' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {selectedHistoricalSale.status === 'COMPLETED' ? 'CONCLUÍDA' : 'CANCELADA'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="font-bold text-xs uppercase tracking-widest text-black">
                  SL VENDAS • ARQUIVO HISTÓRICO
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">Comprovativo Arquivado no Sistema</p>
              </div>
            </div>
          );
        })()}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => window.print()}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Factura
              </button>
              <button
                onClick={() => setSelectedHistoricalSale(null)}
                className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
