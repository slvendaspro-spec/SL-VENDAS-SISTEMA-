import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Phone,
  CreditCard,
  Printer,
  Check,
  CheckCircle,
  AlertTriangle,
  History,
  LayoutGrid,
  List,
  Smartphone,
  Tag,
  User,
  ArrowRight,
  X,
  FileText,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  Barcode,
  Keyboard,
  ShieldCheck,
  Palette,
  HelpCircle,
  Store as StoreIcon,
  Layers,
  ChevronRight,
  Calculator,
  UserCheck,
  FileSpreadsheet,
  Camera,
  Lock,
  Sliders,
  Sun,
  Moon,
  Tablet,
  Laptop,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, PaymentMethod, Sale } from '../../types';
import { sound } from '../../services/soundService';
import { ThemeCustomizerModal } from '../modals/ThemeCustomizerModal';
import { CustomerRegistrationModal } from '../modals/CustomerRegistrationModal';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { SangriaModal } from '../modals/SangriaModal';
import { PrinterSettingsModal } from '../modals/PrinterSettingsModal';
import { CASHIER_MODELS_LIST } from '../../data/initialData';
import confetti from 'canvas-confetti';

export const CashierPOS: React.FC = () => {
  const {
    currentUser,
    stores,
    currentCashierStoreId,
    setCurrentCashierStoreId,
    products,
    registerSale,
    sales,
    isOnline,
    activeThemeConfig,
    appFont,
    cashierLayoutMode,
    setCashierLayoutMode,
    isSemSangria,
    includeIVA,
    cashierModel,
    setCashierModel,
    activePrinter,
    activePrinterWidth,
    colorMode,
    toggleColorMode,
    registerShiftClosure,
    shiftClosures,
  } = useStore();

  // Active store being operated: cashier is strictly locked to assigned store
  const effectiveStoreId =
    currentUser.role === 'cashier' && currentUser.assignedStoreId
      ? currentUser.assignedStoreId
      : currentCashierStoreId;
  const currentStore = stores.find((s) => s.id === effectiveStoreId) || stores[0];

  // Active view: 'pos' (Venda) | 'history' (Minhas Vendas) | 'shift' (Início e Término de Sessão)
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'shift'>('pos');
  const [registeredClosureNotice, setRegisteredClosureNotice] = useState<string | null>(null);

  // Session lifecycle: Início e Término de Sessão para cada caixa
  const [sessionStatus, setSessionStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [sessionOpenedAt, setSessionOpenedAt] = useState<string>(() =>
    new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  );
  const [sessionInitialCash, setSessionInitialCash] = useState<number>(1000);
  const [sessionCountedCash, setSessionCountedCash] = useState<string>('');
  const [sessionClosureNotes, setSessionClosureNotes] = useState<string>('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart: Array<{ product: Product; quantity: number }>
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNuit, setCustomerNuit] = useState('');
  const [customerBairro, setCustomerBairro] = useState('Polana Cimento');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [phoneForPayment, setPhoneForPayment] = useState('+258 84 ');
  const [cashTendered, setCashTendered] = useState<string>('1500');

  // Numeric Keypad State for Tablet & Touch modes
  const [keypadInput, setKeypadInput] = useState<string>('');
  const [keypadTarget, setKeypadTarget] = useState<'barcode' | 'cash'>('cash');

  // Wizard Step for 'passo_a_passo' mode (1 to 5)
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Modals
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCameraBarcodeOpen, setIsCameraBarcodeOpen] = useState(false);
  const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saftExportMessage, setSaftExportMessage] = useState<string | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products for active store (strictly obeys isVisibleInCashier & visibleInStores)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Check if product is enabled for Cashier POS
      const isGloballyVisible = p.isVisibleInCashier !== false;
      const isStoreVisible =
        p.visibleInStores && p.visibleInStores[effectiveStoreId] !== undefined
          ? p.visibleInStores[effectiveStoreId]
          : isGloballyVisible;

      if (!isGloballyVisible || !isStoreVisible) {
        return false;
      }

      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory, effectiveStoreId]);

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * discountPercent) / 100;
  }, [cartSubtotal, discountPercent]);

  const discountedSubtotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  // IVA 17% Moçambique
  const ivaAmount = useMemo(() => {
    return includeIVA ? (discountedSubtotal * 17) / 100 : 0;
  }, [discountedSubtotal, includeIVA]);

  const cartTotal = useMemo(() => {
    return discountedSubtotal + ivaAmount;
  }, [discountedSubtotal, ivaAmount]);

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, tendered - cartTotal);
  }, [cashTendered, cartTotal]);

  // Add to cart with negative stock prevention
  const addToCart = (product: Product) => {
    sound.playBlip();
    setErrorMessage(null);

    const storeStock = product.stockByStore[currentStore.id] ?? 0;
    const existing = cart.find((item) => item.product.id === product.id);
    const curQty = existing ? existing.quantity : 0;

    if (product.category !== 'Serviços Gráficos & Digitais' && curQty + 1 > storeStock) {
      sound.playAlert();
      setErrorMessage(`Estoque insuficiente de "${product.name}". Disponível na ${currentStore.name}: ${storeStock} ${product.unit}.`);
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage(null);
    const existing = cart.find((item) => item.product.id === productId);
    if (!existing) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const prod = existing.product;
    const storeStock = prod.stockByStore[currentStore.id] ?? 0;

    if (delta > 0 && prod.category !== 'Serviços Gráficos & Digitais' && newQty > storeStock) {
      sound.playAlert();
      setErrorMessage(`Limite de estoque atingido para "${prod.name}" (${storeStock} ${prod.unit} disponíveis).`);
      return;
    }

    sound.playBlip();
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setErrorMessage(null);
    setCashTendered('');
    setWizardStep(1);
  };

  // Barcode / Name Manual Input via Keypad (Photo 2)
  const handleKeypadPress = (val: string) => {
    sound.playBlip();
    if (val === 'LIMPAR') {
      setKeypadInput('');
    } else if (val === 'ENT') {
      // Enter: search product or set cash tendered
      if (keypadTarget === 'barcode' && keypadInput.trim()) {
        const found = products.find(
          (p) =>
            p.code.toLowerCase() === keypadInput.trim().toLowerCase() ||
            (p.barcode && p.barcode === keypadInput.trim())
        );
        if (found) {
          addToCart(found);
          setKeypadInput('');
        } else {
          setErrorMessage(`Produto com código "${keypadInput}" não encontrado.`);
        }
      } else if (keypadTarget === 'cash') {
        setCashTendered(keypadInput);
      }
    } else {
      setKeypadInput((prev) => prev + val);
    }
  };

  // Finalize Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'DINHEIRO') {
      const tendered = parseFloat(cashTendered) || 0;
      if (tendered < cartTotal) {
        sound.playAlert();
        setErrorMessage(
          `Valor recebido (${tendered.toFixed(2)} MZN) é inferior ao total (${cartTotal.toFixed(2)} MZN).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ref =
        paymentMethod === 'M_PESA'
          ? `MP-${phoneForPayment.slice(-6) || Math.floor(100000 + Math.random() * 900000)}`
          : paymentMethod === 'E_MOLA'
          ? `EM-${phoneForPayment.slice(-6) || Math.floor(100000 + Math.random() * 900000)}`
          : paymentMethod === 'POS_CARTAO'
          ? `SIMO-CARTAO-${Math.floor(1000 + Math.random() * 9000)}`
          : undefined;

      const res = await registerSale({
        items: cart,
        customerName: customerName || 'Cliente Balcão',
        customerPhone: customerPhone || undefined,
        customerNuit: customerNuit || undefined,
        customerBairro: customerBairro || undefined,
        discountPercent,
        includeIVA,
        paymentMethod,
        paymentReference: ref,
        cashTendered: paymentMethod === 'DINHEIRO' ? parseFloat(cashTendered) : undefined,
      });

      if (!res.success || !res.sale) {
        setErrorMessage(res.error || 'Erro ao processar venda.');
        sound.playAlert();
      } else {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#ea580c', '#f97316', '#22c55e', '#3b82f6'],
        });
        setCompletedSale(res.sale);
        clearCart();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha na comunicação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cashier sales history
  const mySales = useMemo(() => {
    return sales.filter((s) => s.storeId === currentStore.id && s.cashierId === currentUser.id);
  }, [sales, currentStore.id, currentUser.id]);

  const todayTotalRevenue = mySales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.total, 0);

  // Font family css class
  const fontClass = useMemo(() => {
    switch (appFont) {
      case 'mono':
        return 'font-mono';
      case 'condensed':
        return 'font-sans tracking-tight';
      case 'bold_retail':
        return 'font-sans font-bold';
      case 'jakarta':
      default:
        return 'font-sans';
    }
  }, [appFont]);

  return (
    <div className={`min-h-[calc(100vh-64px)] ${activeThemeConfig.bgClass} ${fontClass} text-slate-100 flex flex-col transition-colors duration-300`}>
      {/* ===================== SUB-HEADER: STORE, STATUS & PERSONALIZAÇÃO ===================== */}
      <div className={`${activeThemeConfig.headerBgClass} border-b ${activeThemeConfig.borderClass} px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md`}>
        {/* Left: Store Selector (Mude a Loja do Vendedor!) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Loja do Vendedor:</span>
            <select
              value={currentCashierStoreId}
              onChange={(e) => setCurrentCashierStoreId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white font-bold text-xs sm:text-sm px-2.5 py-1 rounded-xl outline-none focus:border-orange-500 cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city}) {s.status === 'suspended' ? '[Suspensa]' : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden md:inline-block text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            NUIT: {currentStore.nuit} • {currentStore.address}
          </span>
        </div>

        {/* Center: Dica Sem Sangria Badge (from Photo 1, 2 & 4) */}
        {isSemSangria && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-950/60 border border-orange-500/40 text-[11px] text-orange-300">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span><strong>PDV SEM SANGRIA:</strong> Gaveta abre apenas no Fechar Caixa</span>
          </div>
        )}

        {/* Right: Personalize Button & View Tabs */}
        <div className="flex items-center gap-2">
          {/* Main POS / History / Shift Tabs */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pos'
                  ? `${activeThemeConfig.buttonClass}`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PDV Caixa
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? `${activeThemeConfig.buttonClass}`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Minhas Vendas ({mySales.length})
            </button>
            <button
              onClick={() => setActiveTab('shift')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'shift'
                  ? `${activeThemeConfig.buttonClass}`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Início & Término de Sessão</span>
            </button>
          </div>

          {/* Theme & Customizer Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors shadow cursor-pointer"
            title="Personalizar Temas, Cores e Letras"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Temas & Letras</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 mt-3">
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SAFT Export Toast */}
      {saftExportMessage && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 mt-3">
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saftExportMessage}</span>
            </div>
            <button onClick={() => setSaftExportMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== TAB 1: PDV CAIXA VIEWPORT ===================== */}
      {activeTab === 'pos' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col">
          {/* Cashier Model Selector & Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {/* Badge: Escolha livre do modelo de caixa */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-sky-500/40 text-sky-300 font-bold text-xs shrink-0">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Modelo do Caixa:</span>
              </div>

              {/* Models List - Livre para o Caixa escolher */}
              {CASHIER_MODELS_LIST.map((model) => {
                const isActive = cashierModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setCashierModel(model.id);
                      if (model.id === 'modelo_ed_supermercado') setCashierLayoutMode('computador_3col');
                      else if (model.id === 'modelo_tablet_keypad') setCashierLayoutMode('tablet_keypad');
                      else if (model.id === 'modelo_celular_1col') setCashierLayoutMode('celular_1col');
                      else if (model.id === 'modelo_passo_a_passo') setCashierLayoutMode('passo_a_passo');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap text-xs ${
                      isActive
                        ? `${activeThemeConfig.buttonClass} shadow-md`
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                    title={`Ativar ${model.name}`}
                  >
                    <span>{model.name}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  </button>
                );
              })}
            </div>

            {/* Quick Tools: Camera, Sangria, Printer, Day/Night */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCameraBarcodeOpen(true)}
                title="Abrir Câmera de Telemóvel para ler código de barras"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Câmera Bipar</span>
              </button>

              <button
                onClick={() => setIsSangriaModalOpen(true)}
                title="Realizar Sangria ou Reforço de Caixa"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sangria</span>
              </button>

              <button
                onClick={() => setIsPrinterModalOpen(true)}
                title="Configurar impressoras térmicas portáteis (58mm / 80mm)"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-[10px] text-sky-300">{activePrinterWidth}</span>
              </button>

              <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs pl-2 border-l border-slate-800 font-mono">
                <span>{cart.length} itens</span>
                <span>•</span>
                <span className="font-bold text-emerald-400">{cartTotal.toFixed(2)} MZN</span>
              </div>
            </div>
          </div>

          {/* ==================== LAYOUT 1: MODELO ED SUPERMERCADO (3 COLUNAS) ==================== */}
          {(cashierModel === 'modelo_ed_supermercado' || (cashierModel !== 'modelo_nati' && cashierLayoutMode === 'computador_3col')) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
              {/* COLUNA 1: 1. LISTA DE PRODUTOS & BUSCA (5 cols) */}
              <div className={`lg:col-span-4 ${activeThemeConfig.cardClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                        Lista de Produtos
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{cart.length} no carrinho</span>
                  </div>

                  {/* Search Bar with Mobile Camera Scanner */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome ou código..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCameraBarcodeOpen(true)}
                      title="Abrir Câmera do Telemóvel / Tablet para bipar código"
                      className="p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Categories Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors ${
                          selectedCategory === c
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {c === 'ALL' ? 'Todos' : c}
                      </button>
                    ))}
                  </div>

                  {/* Product Catalog List with Barcodes */}
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredProducts.map((p) => {
                      const storeStock = p.stockByStore[currentStore.id] ?? 0;
                      const isOutOfStock = p.category !== 'Serviços Gráficos & Digitais' && storeStock <= 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => !isOutOfStock && addToCart(p)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isOutOfStock
                              ? 'bg-slate-950/40 border-red-950/40 opacity-40 cursor-not-allowed'
                              : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-orange-500/50 cursor-pointer active:scale-[0.99]'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-100 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-orange-400 flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> {p.code}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Estoque: <strong className={storeStock <= p.minStock ? 'text-amber-400' : 'text-emerald-400'}>{storeStock}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-400 whitespace-nowrap">
                              {p.salePrice.toFixed(2)} MZN
                            </span>
                            <button
                              disabled={isOutOfStock}
                              className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cart summary counter */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total de Itens:</span>
                  <span className="font-bold text-white font-mono">{cart.reduce((a, b) => a + b.quantity, 0)} unid</span>
                </div>
              </div>

              {/* COLUNA 2: 2. TOTAL DA COMPRA & 3. FORMAS DE PAGAMENTO (4 cols) */}
              <div className={`lg:col-span-5 ${activeThemeConfig.cardClass} rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl`}>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                        Resumo da Compra
                      </h3>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar
                      </button>
                    )}
                  </div>

                  {/* Cart Items Table */}
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        <ShoppingCart className="w-7 h-7 mx-auto mb-1 text-slate-700" />
                        <p>Nenhum produto adicionado ao carrinho.</p>
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="truncate mr-2">
                            <p className="font-bold text-slate-200 truncate">{item.product.name}</p>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.quantity} x {item.product.salePrice.toFixed(2)} MZN
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono font-bold text-emerald-400">
                              {(item.quantity * item.product.salePrice).toFixed(2)} MZN
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="w-5 h-5 rounded hover:bg-red-950 text-slate-500 hover:text-red-400 flex items-center justify-center"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary Breakdown (Subtotal, Desconto, IVA 17%) */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono">{cartSubtotal.toFixed(2)} MZN</span>
                    </div>

                    <div className="flex justify-between text-amber-400">
                      <span>- Desconto ({discountPercent}%):</span>
                      <span className="font-mono">-{discountAmount.toFixed(2)} MZN</span>
                    </div>

                    {includeIVA && (
                      <div className="flex justify-between text-slate-400">
                        <span>IVA (17%):</span>
                        <span className="font-mono">{ivaAmount.toFixed(2)} MZN</span>
                      </div>
                    )}

                    {/* PROMINENT TOTAL A PAGAR BOX (MATCHING PHOTO 1, 2, 3) */}
                    <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-extrabold text-xs uppercase tracking-wider text-slate-300">
                        TOTAL A PAGAR:
                      </span>
                      <div className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-mono font-black text-lg sm:text-xl shadow-lg">
                        {cartTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN
                      </div>
                    </div>
                  </div>

                  {/* FORMAS DE PAGAMENTO: [Dinheiro] [M-Pesa] [Cartão] */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DINHEIRO')}
                        className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                          paymentMethod === 'DINHEIRO'
                            ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Dinheiro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('M_PESA')}
                        className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                          paymentMethod === 'M_PESA'
                            ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>M-Pesa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('POS_CARTAO')}
                        className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                          paymentMethod === 'POS_CARTAO'
                            ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Cartão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('E_MOLA')}
                        className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                          paymentMethod === 'E_MOLA'
                            ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>e-Mola</span>
                      </button>
                    </div>

                    {/* Dinheiro details (Valor Recebido & Troco) */}
                    {paymentMethod === 'DINHEIRO' && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Valor recebido (Dinheiro):</span>
                          <input
                            type="number"
                            value={cashTendered}
                            onChange={(e) => setCashTendered(e.target.value)}
                            placeholder="1500"
                            className="w-28 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-right font-mono font-bold text-white text-xs outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Troco a Devolver:</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            {changeDue.toFixed(2)} MZN →
                          </span>
                        </div>
                      </div>
                    )}

                    {/* M-Pesa / e-Mola input */}
                    {(paymentMethod === 'M_PESA' || paymentMethod === 'E_MOLA') && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          Número {paymentMethod === 'M_PESA' ? 'M-Pesa (84/85...)' : 'e-Mola (86/87...)'}
                        </label>
                        <input
                          type="text"
                          value={phoneForPayment}
                          onChange={(e) => setPhoneForPayment(e.target.value)}
                          placeholder="+258 84 123 456"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-orange-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Big Button: FECHAR CAIXA (SEM SANGRIA) */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-950/60 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{isSubmitting ? 'Processando Venda...' : 'FECHAR VENDA & IMPRIMIR TALÃO'}</span>
                  </button>
                </div>
              </div>

              {/* COLUNA 3: 4. FUNÇÕES DO SISTEMA (3 cols, 10 BOTÕES RÁPIDOS) */}
              <div className={`lg:col-span-3 ${activeThemeConfig.cardClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl`}>
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                      Funções do PDV
                    </h3>
                  </div>

                  {/* 10 Action Buttons Grid with Camera, Sangria, Printers & Shortcuts */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* 1. BIPAR CÂMERA */}
                    <button
                      onClick={() => setIsCameraBarcodeOpen(true)}
                      className="p-3 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow"
                    >
                      <Camera className="w-5 h-5 text-emerald-400" />
                      <span>BIPAR CÂMERA</span>
                    </button>

                    {/* 2. SANGRIA / REFORÇO */}
                    <button
                      onClick={() => setIsSangriaModalOpen(true)}
                      className="p-3 rounded-2xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow"
                    >
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      <span>SANGRIA / RETIRADA</span>
                    </button>

                    {/* 3. IMPRESSORAS TÉRMICAS PORTÁTEIS */}
                    <button
                      onClick={() => setIsPrinterModalOpen(true)}
                      className="p-3 rounded-2xl bg-sky-950/70 hover:bg-sky-900/80 border border-sky-500/50 text-sky-200 font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow"
                    >
                      <Printer className="w-5 h-5 text-sky-400" />
                      <span>IMPRESSORA ({activePrinterWidth})</span>
                    </button>

                    {/* 4. ESTOQUE */}
                    <button
                      onClick={() => alert(`Estoque atual na ${currentStore.name}:\n` + products.map((p) => `• ${p.name}: ${p.stockByStore[currentStore.id] ?? 0} ${p.unit}`).join('\n'))}
                      className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <Layers className="w-5 h-5 text-slate-300" />
                      <span>VER ESTOQUE</span>
                    </button>

                    {/* 5. % DESCONTO */}
                    <button
                      onClick={() => {
                        const val = prompt('Informe a percentagem de desconto (Ex: 5, 10):', '5');
                        if (val !== null) setDiscountPercent(parseFloat(val) || 0);
                      }}
                      className="p-3 rounded-2xl bg-orange-950/60 hover:bg-orange-900/80 border border-orange-500/40 text-orange-200 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <Tag className="w-5 h-5 text-orange-400" />
                      <span>% DESCONTO</span>
                    </button>

                    {/* 6. CLIENTE (CADASTRO COM FIDELIDADE 5%) */}
                    <button
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-200 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <UserCheck className="w-5 h-5 text-sky-400" />
                      <span>CLIENTE FIDELIDADE</span>
                    </button>

                    {/* 7. CANCELAR ITEM */}
                    <button
                      onClick={() => {
                        if (cart.length > 0) removeFromCart(cart[cart.length - 1].product.id);
                      }}
                      className="p-3 rounded-2xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                      <span>CANCELAR ITEM</span>
                    </button>

                    {/* 8. FECHAR CAIXA */}
                    <button
                      onClick={() => setActiveTab('shift')}
                      className="p-3 rounded-2xl bg-amber-950 hover:bg-amber-900 border border-amber-600/50 text-amber-300 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <Clock className="w-5 h-5 text-amber-400" />
                      <span>FECHAR CAIXA</span>
                    </button>

                    {/* 9. HISTÓRICO */}
                    <button
                      onClick={() => setActiveTab('history')}
                      className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <History className="w-5 h-5 text-purple-400" />
                      <span>HISTÓRICO</span>
                    </button>

                    {/* 10. TEMAS & LETRAS */}
                    <button
                      onClick={() => setIsThemeModalOpen(true)}
                      className="p-3 rounded-2xl bg-gradient-to-br from-orange-950 to-slate-900 border border-orange-500/40 text-orange-300 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <Palette className="w-5 h-5 text-orange-400" />
                      <span>TEMAS & CORES</span>
                    </button>
                  </div>
                </div>

                {/* Status footer bar matching Photo 4 */}
                <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> STATUS: CAIXA ABERTO
                  </p>
                  <p>Operador: {currentUser.name}</p>
                  <p>Impressora: Conectada • Conexão Online</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== LAYOUT NATI: MODELO NATI (TOUCH & TABLET ULTRA-RÁPIDO) ==================== */}
          {cashierModel === 'modelo_nati' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
              {/* Left Column: Visual Touch Product Catalog (7 Cols) */}
              <div className={`lg:col-span-7 ${activeThemeConfig.cardClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl`}>
                <div className="space-y-3">
                  {/* Model Banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-black text-xs flex items-center justify-center shadow">
                        N
                      </span>
                      <div>
                        <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                          Modelo Nati • PDV Touch & Tablet
                        </h3>
                        <p className="text-[10px] text-slate-400">Layout tátil otimizado para vendas de alta frequência</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsCameraBarcodeOpen(true)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1 shadow"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Câmera</span>
                      </button>
                      <button
                        onClick={() => setIsSangriaModalOpen(true)}
                        className="px-2.5 py-1 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1 shadow"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Sangria</span>
                      </button>
                    </div>
                  </div>

                  {/* Search bar & Categories */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar produto ou código no Modelo Nati..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                      />
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all ${
                          selectedCategory === c
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {c === 'ALL' ? 'Todos os Produtos' : c}
                      </button>
                    ))}
                  </div>

                  {/* Big Touch Product Tiles Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {filteredProducts.map((p) => {
                      const storeStock = p.stockByStore[currentStore.id] ?? 0;
                      const isOutOfStock = p.category !== 'Serviços Gráficos & Digitais' && storeStock <= 0;

                      return (
                        <button
                          key={p.id}
                          disabled={isOutOfStock}
                          onClick={() => {
                            addToCart(p);
                            sound.beep();
                          }}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.97] min-h-[110px] ${
                            isOutOfStock
                              ? 'bg-slate-950/40 border-red-950/50 opacity-40 cursor-not-allowed'
                              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-rose-500/60 shadow-lg'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[9px] text-slate-400 truncate max-w-[80px]">
                                {p.code}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isOutOfStock
                                    ? 'bg-red-950 text-red-400'
                                    : storeStock <= p.minStock
                                    ? 'bg-amber-950 text-amber-400'
                                    : 'bg-emerald-950 text-emerald-400'
                                }`}
                              >
                                {storeStock} {p.unit}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-white line-clamp-2 leading-tight">
                              {p.name}
                            </h4>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="font-mono font-black text-sm text-rose-400">
                              {p.salePrice.toFixed(2)} <span className="text-[10px]">MZN</span>
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-rose-600/30 text-rose-300 flex items-center justify-center font-bold text-xs">
                              +
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer in Nati Left Column */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">Catálogo: {filteredProducts.length} itens</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Modelo Nati Touch Ativo
                  </span>
                </div>
              </div>

              {/* Right Column: Nati Cart & Instant Checkout (5 Cols) */}
              <div className={`lg:col-span-5 ${activeThemeConfig.cardClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl space-y-4`}>
                <div className="space-y-3">
                  {/* Cart Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-rose-400" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                        Comanda / Carrinho ({cart.length})
                      </h3>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar Tudo
                      </button>
                    )}
                  </div>

                  {/* Cart Items List with Big Steppers */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-1 text-slate-700" />
                        Toque nos produtos ao lado ou use a câmera para adicionar itens ao Modelo Nati.
                      </div>
                    ) : (
                      cart.map((it) => (
                        <div
                          key={it.product.id}
                          className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 shadow"
                        >
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-white truncate">{it.product.name}</h5>
                            <span className="font-mono text-[10px] text-slate-400">
                              {it.product.salePrice.toFixed(2)} MZN unid.
                            </span>
                          </div>

                          {/* Big Touch Stepper */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(it.product.id, -1)}
                              className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center text-sm active:scale-95"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-xs text-white min-w-[20px] text-center">
                              {it.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(it.product.id, 1)}
                              className="w-7 h-7 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-bold flex items-center justify-center text-sm active:scale-95"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right shrink-0 min-w-[60px]">
                            <span className="font-mono font-bold text-xs text-emerald-400">
                              {(it.quantity * it.product.salePrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Payment Method Pills */}
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">
                      Método de Pagamento (Moçambique):
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                      {(['DINHEIRO', 'M-PESA', 'E-MOLA', 'CARTAO'] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-xl text-center transition-all ${
                            paymentMethod === m
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m === 'DINHEIRO' ? 'Numerário' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Quick Tender Notes if DINHEIRO */}
                  {paymentMethod === 'DINHEIRO' && (
                    <div className="space-y-1.5 p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Notas Rápidas (MZN):</span>
                        <span className="font-mono text-xs text-white font-bold">
                          Recebido: {cashTendered} MZN
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-[11px] font-mono font-bold">
                        {['50', '100', '200', '500', '1000'].map((val) => (
                          <button
                            key={val}
                            onClick={() => setCashTendered(val)}
                            className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-center active:scale-95"
                          >
                            +{val}
                          </button>
                        ))}
                      </div>

                      {/* Change Due Indicator */}
                      {parseFloat(cashTendered || '0') >= cartTotal && cartTotal > 0 && (
                        <div className="pt-1 flex items-center justify-between text-xs text-emerald-400 font-mono">
                          <span>Troco a Devolver:</span>
                          <span className="font-black text-sm">
                            {(parseFloat(cashTendered || '0') - cartTotal).toFixed(2)} MZN
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Totals Summary */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal Itens:</span>
                      <span className="font-mono text-slate-200">{cartSubtotal.toFixed(2)} MZN</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Desconto Aplicado ({discountPercent}%):</span>
                        <span className="font-mono">-{discountAmount.toFixed(2)} MZN</span>
                      </div>
                    )}
                    {includeIVA && (
                      <div className="flex justify-between text-slate-400">
                        <span>IVA (17%):</span>
                        <span className="font-mono text-slate-200">{ivaAmount.toFixed(2)} MZN</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="font-black text-xs text-white uppercase">TOTAL NATI:</span>
                      <span className="font-mono font-black text-2xl text-emerald-400">
                        {cartTotal.toFixed(2)} <span className="text-xs font-normal text-emerald-300">MZN</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Giant 1-Touch Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm uppercase tracking-wider shadow-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>CONCLUIR VENDA (MODELO NATI) • {cartTotal.toFixed(2)} MZN</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== LAYOUT 2: TABLET COM TECLADO NUMÉRICO (PHOTO 2 & 7) ==================== */}
          {(cashierModel === 'modelo_tablet_keypad' || (cashierModel !== 'modelo_nati' && cashierLayoutMode === 'tablet_keypad')) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
              {/* Left Column: Product List & Cart (7 cols) */}
              <div className={`md:col-span-7 ${activeThemeConfig.cardClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white uppercase">Lista de Produtos</h3>
                    <span className="font-mono text-xs text-orange-400">{cart.length} itens</span>
                  </div>

                  {/* Cart preview */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {cart.map((it) => (
                      <div key={it.product.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{it.product.name}</p>
                          <span className="text-slate-400 font-mono">{it.quantity} x {it.product.salePrice.toFixed(2)} MZN</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {(it.quantity * it.product.salePrice).toFixed(2)} MZN
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick catalog pills */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    {products.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs"
                      >
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <span className="font-mono text-emerald-400">{p.salePrice.toFixed(2)} MZN</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">TOTAL:</span>
                  <span className="font-mono font-black text-xl text-orange-400">{cartTotal.toFixed(2)} MZN</span>
                </div>
              </div>

              {/* Right Column: Numeric Keypad for Barcode or Cash (5 cols) */}
              <div className={`md:col-span-5 ${activeThemeConfig.cardClass} rounded-3xl p-5 flex flex-col justify-between shadow-xl`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">Teclado Numérico</h3>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        onClick={() => {
                          setKeypadTarget('cash');
                          setKeypadInput('');
                        }}
                        className={`px-2 py-0.5 rounded ${keypadTarget === 'cash' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}
                      >
                        Valor Recebido
                      </button>
                      <button
                        onClick={() => {
                          setKeypadTarget('barcode');
                          setKeypadInput('');
                        }}
                        className={`px-2 py-0.5 rounded ${keypadTarget === 'barcode' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}
                      >
                        Código/Barra
                      </button>
                    </div>
                  </div>

                  {/* Keypad Display */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-500 block">
                      {keypadTarget === 'cash' ? 'Digitar Valor Recebido (MZN):' : 'Digitar Código do Produto:'}
                    </span>
                    <span className="font-mono font-bold text-xl text-white">
                      {keypadInput || (keypadTarget === 'cash' ? cashTendered || '0.00' : '-')}
                    </span>
                  </div>

                  {/* Keypad Grid 1-9, 0, ENT, LIMPAR (Photo 2) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleKeypadPress(digit)}
                        className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-lg font-bold text-white transition-all active:scale-95 shadow"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      onClick={() => handleKeypadPress('LIMPAR')}
                      className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400 active:scale-95"
                    >
                      LIMPAR
                    </button>
                    <button
                      onClick={() => handleKeypadPress('0')}
                      className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-lg font-bold text-white active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleKeypadPress('ENT')}
                      className="h-12 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-sm active:scale-95 shadow-lg"
                    >
                      ENT
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="mt-4 w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider"
                >
                  FECHAR CAIXA
                </button>
              </div>
            </div>
          )}

          {/* ==================== LAYOUT 3: CELULAR 1 COLUNA (PHOTO 7) ==================== */}
          {(cashierModel === 'modelo_celular_1col' || (cashierModel !== 'modelo_nati' && cashierLayoutMode === 'celular_1col')) && (
            <div className="max-w-md mx-auto w-full space-y-4">
              {/* Products search & quick items */}
              <div className={`${activeThemeConfig.cardClass} rounded-2xl p-4 space-y-3`}>
                <h3 className="font-bold text-xs uppercase text-white">1. Adicionar Produtos</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <span className="font-mono text-[10px] text-orange-400">{p.code}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 shrink-0">{p.salePrice.toFixed(2)} MZN</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Items */}
              <div className={`${activeThemeConfig.cardClass} rounded-2xl p-4 space-y-3`}>
                <h3 className="font-bold text-xs uppercase text-white">2. Carrinho ({cart.length})</h3>
                <div className="space-y-1 max-h-[160px] overflow-y-auto">
                  {cart.map((it) => (
                    <div key={it.product.id} className="p-2 rounded-lg bg-slate-950 flex justify-between text-xs">
                      <span>{it.quantity}x {it.product.name}</span>
                      <span className="font-mono font-bold text-emerald-400">{(it.quantity * it.product.salePrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 flex justify-between items-center text-xs">
                  <span className="font-bold text-white">TOTAL A PAGAR:</span>
                  <span className="font-mono font-bold text-base text-orange-400">{cartTotal.toFixed(2)} MZN</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase"
                >
                  FECHAR CAIXA
                </button>
              </div>
            </div>
          )}

          {/* ==================== LAYOUT 4: PASSO A PASSO (1 AO 5 - PHOTO 1 & 2) ==================== */}
          {(cashierModel === 'modelo_passo_a_passo' || (cashierModel !== 'modelo_nati' && cashierLayoutMode === 'passo_a_passo')) && (
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {/* Wizard Steps Navigation Pills (1 to 5) */}
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-bold">
                {[
                  { step: 1, label: 'Passo 1 • Bipar' },
                  { step: 2, label: 'Passo 2 • Itens' },
                  { step: 3, label: 'Passo 3 • Resumo' },
                  { step: 4, label: 'Passo 4 • Pagamento' },
                  { step: 5, label: 'Passo 5 • Fechar & Talão' },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setWizardStep(s.step)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      wizardStep === s.step
                        ? 'bg-orange-600 border-orange-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Wizard Step 1: Bipar Produto */}
              {wizardStep === 1 && (
                <div className={`${activeThemeConfig.cardClass} rounded-3xl p-6 text-center space-y-4`}>
                  <Barcode className="w-12 h-12 mx-auto text-orange-400" />
                  <h3 className="text-base font-bold text-white">Passo 1 • Bipar ou Selecionar Produto</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Aproxime o leitor de código de barras ou pesquise o produto para adicionar ao sistema sem movimentar a gaveta.
                  </p>
                  <div className="max-w-sm mx-auto">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Digitar nome ou bipar código..."
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-bold text-white text-sm outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {filteredProducts.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addToCart(p);
                          setWizardStep(2);
                        }}
                        className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs"
                      >
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <span className="font-mono text-emerald-400">{p.salePrice.toFixed(2)} MZN</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wizard Step 2: Itens Adicionados */}
              {wizardStep === 2 && (
                <div className={`${activeThemeConfig.cardClass} rounded-3xl p-6 space-y-4`}>
                  <h3 className="text-base font-bold text-white">Passo 2 • Confirmar Itens Adicionados</h3>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {cart.map((it) => (
                      <div key={it.product.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{it.quantity}x {it.product.name}</span>
                        <span className="font-mono font-bold text-emerald-400">{(it.quantity * it.product.salePrice).toFixed(2)} MZN</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-3">
                    <button onClick={() => setWizardStep(1)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">
                      ← Bipar Mais
                    </button>
                    <button onClick={() => setWizardStep(3)} className="px-5 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs">
                      Avançar para Resumo →
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Step 3: Resumo e Desconto */}
              {wizardStep === 3 && (
                <div className={`${activeThemeConfig.cardClass} rounded-3xl p-6 space-y-4`}>
                  <h3 className="text-base font-bold text-white">Passo 3 • Resumo, Desconto & IVA (17%)</h3>
                  <div className="p-4 rounded-2xl bg-slate-950 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>{cartSubtotal.toFixed(2)} MZN</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Desconto ({discountPercent}%):</span>
                      <span>-{discountAmount.toFixed(2)} MZN</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IVA (17%):</span>
                      <span>{ivaAmount.toFixed(2)} MZN</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black text-orange-400">
                      <span>TOTAL A PAGAR:</span>
                      <span>{cartTotal.toFixed(2)} MZN</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <button onClick={() => setWizardStep(2)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">
                      ← Voltar
                    </button>
                    <button onClick={() => setWizardStep(4)} className="px-5 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs">
                      Escolher Forma de Pagamento →
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Step 4: Forma de Pagamento */}
              {wizardStep === 4 && (
                <div className={`${activeThemeConfig.cardClass} rounded-3xl p-6 space-y-4`}>
                  <h3 className="text-base font-bold text-white">Passo 4 • Forma de Pagamento</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['DINHEIRO', 'M_PESA', 'POS_CARTAO'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold ${
                          paymentMethod === m ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'DINHEIRO' && (
                    <div className="p-4 rounded-2xl bg-slate-950 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span>Valor recebido:</span>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="w-32 p-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-right text-white font-bold"
                        />
                      </div>
                      <div className="flex justify-between font-bold text-emerald-400">
                        <span>Troco:</span>
                        <span>{changeDue.toFixed(2)} MZN</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setWizardStep(3)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">
                      ← Voltar
                    </button>
                    <button onClick={handleCheckout} className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase">
                      Passo 5 • Fechar Venda & Imprimir Talão
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: MINHAS VENDAS ===================== */}
      {activeTab === 'history' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <div className={`${activeThemeConfig.cardClass} rounded-3xl p-5 shadow-xl`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-white">Minhas Vendas Realizadas</h3>
                <p className="text-xs text-slate-400">{currentStore.name} • {currentUser.name}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Arrecadado:</span>
                <span className="font-mono font-bold text-emerald-400 text-lg">{todayTotalRevenue.toFixed(2)} MZN</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-2.5">Nº Venda</th>
                    <th className="pb-2.5">Hora</th>
                    <th className="pb-2.5">Cliente</th>
                    <th className="pb-2.5">Pagamento</th>
                    <th className="pb-2.5 text-right">Total MZN</th>
                    <th className="pb-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mySales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-bold text-orange-400">{s.saleNumber}</td>
                      <td className="py-2.5 text-slate-400">{new Date(s.timestamp).toLocaleTimeString('pt-MZ')}</td>
                      <td className="py-2.5 text-white">{s.customerName}</td>
                      <td className="py-2.5 font-mono">{s.paymentMethod}</td>
                      <td className="py-2.5 font-mono font-bold text-emerald-400 text-right">{s.total.toFixed(2)}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setCompletedSale(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                        >
                          Ver Talão
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: INÍCIO E TÉRMINO DE SESSÃO ===================== */}
      {activeTab === 'shift' && (
        <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-5">
          <div className={`${activeThemeConfig.cardClass} rounded-3xl p-6 shadow-2xl space-y-5`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    Início e Término de Sessão de Caixa
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentStore.name} • Operador: <strong className="text-white">{currentUser.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    sessionStatus === 'OPEN'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950'
                      : 'bg-red-950 text-red-400 border-red-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sessionStatus === 'OPEN' ? 'bg-emerald-400 animate-ping' : 'bg-red-400'
                    }`}
                  />
                  <span>{sessionStatus === 'OPEN' ? 'Sessão ABERTA' : 'Sessão ENCERRADA'}</span>
                </span>
              </div>
            </div>

            {/* IF SESSION IS CLOSED: START SESSION FORM */}
            {sessionStatus === 'CLOSED' && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <CheckCircle className="w-4 h-4 text-orange-400" />
                  <span>Abertura de Turno / Iniciar Nova Sessão</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Informe o Fundo de Maneio / Troco Inicial disponível na gaveta para iniciar as operações de venda neste terminal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1 font-semibold">
                      Fundo de Troco Inicial (MZN):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={sessionInitialCash}
                      onChange={(e) => setSessionInitialCash(parseFloat(e.target.value) || 0)}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1 font-semibold">
                      Loja / Terminal Atribuído:
                    </label>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs truncate">
                      {currentStore.name} ({currentStore.city})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSessionStatus('OPEN');
                    setSessionOpenedAt(new Date().toISOString());
                    setRegisteredClosureNotice(null);
                    sound.success();
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 cursor-pointer active:scale-98 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  <span>🚀 Iniciar Sessão & Abrir Caixa</span>
                </button>
              </div>
            )}

            {/* IF SESSION IS OPEN: SESSION DASHBOARD & CLOSURE FORM */}
            {sessionStatus === 'OPEN' && (
              <div className="space-y-4">
                {/* Session Live Details */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      Iniciada em:{' '}
                      <strong className="text-white font-mono">
                        {new Date(sessionOpenedAt).toLocaleTimeString('pt-MZ')}{' '}
                        ({new Date(sessionOpenedAt).toLocaleDateString('pt-MZ')})
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSangriaModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Sangria / Suprimento</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Fundo Inicial</span>
                      <span className="font-bold text-blue-400 text-sm">{sessionInitialCash.toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vendas Concluídas</span>
                      <span className="font-bold text-white text-sm">{mySales.length}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total do Turno</span>
                      <span className="font-bold text-emerald-400 text-sm">{todayTotalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Gaveta Esperada</span>
                      {(() => {
                        const cashSales = mySales
                          .filter((s) => s.paymentMethod === 'DINHEIRO')
                          .reduce((a, b) => a + b.total, 0);
                        const expectedCash = sessionInitialCash + cashSales;
                        return (
                          <span className="font-bold text-amber-400 text-sm">
                            {expectedCash.toFixed(2)} MZN
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Discriminação por Forma de Pagamento */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
                  <p className="font-bold text-slate-300 uppercase mb-2 font-sans">
                    Apuração por Método de Pagamento no Turno:
                  </p>
                  {['DINHEIRO', 'M_PESA', 'E_MOLA', 'POS_CARTAO'].map((m) => {
                    const sub = mySales.filter((s) => s.paymentMethod === m).reduce((a, b) => a + b.total, 0);
                    return (
                      <div key={m} className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">{m}:</span>
                        <span className="font-bold text-white">{sub.toFixed(2)} MZN</span>
                      </div>
                    );
                  })}
                </div>

                {/* Form: Término de Sessão */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-orange-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider text-orange-400">
                    <Clock className="w-4 h-4" />
                    <span>Conferência de Término de Sessão</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">
                        Dinheiro Contado na Gaveta (MZN):
                      </label>
                      {(() => {
                        const cashSales = mySales
                          .filter((s) => s.paymentMethod === 'DINHEIRO')
                          .reduce((a, b) => a + b.total, 0);
                        const expectedCash = sessionInitialCash + cashSales;
                        const counted = parseFloat(sessionCountedCash) || expectedCash;
                        const diff = counted - expectedCash;

                        return (
                          <div>
                            <input
                              type="number"
                              step="50"
                              value={sessionCountedCash || expectedCash.toString()}
                              onChange={(e) => setSessionCountedCash(e.target.value)}
                              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm outline-none"
                            />
                            <span
                              className={`text-[11px] block mt-1 font-mono font-semibold ${
                                diff === 0
                                  ? 'text-emerald-400'
                                  : diff < 0
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              Diferença: {diff === 0 ? '0.00 MZN (Exato)' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} MZN`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Observações do Fecho:</label>
                      <input
                        type="text"
                        value={sessionClosureNotes}
                        onChange={(e) => setSessionClosureNotes(e.target.value)}
                        placeholder="Ex: Turno encerrado sem divergências / Sangria realizada"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cashTotal = mySales
                          .filter((s) => s.paymentMethod === 'DINHEIRO')
                          .reduce((a, b) => a + b.total, 0);
                        const mpesaTotal = mySales
                          .filter((s) => s.paymentMethod === 'M_PESA')
                          .reduce((a, b) => a + b.total, 0);
                        const emolaTotal = mySales
                          .filter((s) => s.paymentMethod === 'E_MOLA')
                          .reduce((a, b) => a + b.total, 0);
                        const cardTotal = mySales
                          .filter((s) => s.paymentMethod === 'POS_CARTAO')
                          .reduce((a, b) => a + b.total, 0);

                        const expectedCash = sessionInitialCash + cashTotal;
                        const counted = parseFloat(sessionCountedCash) || expectedCash;
                        const diff = counted - expectedCash;

                        const closure = registerShiftClosure({
                          storeId: currentStore.id,
                          storeName: currentStore.name,
                          cashierId: currentUser.id,
                          cashierName: currentUser.name,
                          openedAt: sessionOpenedAt,
                          initialCash: sessionInitialCash,
                          totalSalesCash: cashTotal,
                          totalSalesMpesa: mpesaTotal,
                          totalSalesEmola: emolaTotal,
                          totalSalesCard: cardTotal,
                          totalSalesGross: todayTotalRevenue,
                          totalDiscounts: 0,
                          totalSangrias: 0,
                          totalReforcos: 0,
                          expectedCashInDrawer: expectedCash,
                          actualCashInDrawer: counted,
                          difference: diff,
                          salesCount: mySales.length,
                          notes: sessionClosureNotes || 'Fecho de turno encerrado com sucesso',
                        });

                        setSessionStatus('CLOSED');
                        sound.success();
                        setRegisteredClosureNotice(
                          `Sessão encerrada com sucesso! Fecho nº ${closure.closureNumber} gravado e transmitido ao Servidor Mãe.`
                        );
                      }}
                      className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-98 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Encerrar Sessão & Gravar Fecho</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4 text-orange-400" />
                      <span>Imprimir Comprovativo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {registeredClosureNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-white">{registeredClosureNotice}</p>
                  <p className="text-[11px] text-emerald-300">
                    Dados gravados e transmitidos ao Servidor Mãe Supabase com sucesso.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TALÃO DE VENDA TÉRMICO (PORTÁTIL 58MM / 80MM) ===================== */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className={`w-full ${activePrinterWidth === '58mm' ? 'max-w-[280px] p-4 text-[10px]' : 'max-w-sm p-6 text-xs'} bg-white text-slate-950 rounded-3xl shadow-2xl relative transition-all my-auto`}>
            <button
              onClick={() => setCompletedSale(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Formatted Invoice / Receipt with Store Logo and Full Header */}
            {(() => {
              const saleStore = stores.find((s) => s.id === completedSale.storeId) || currentStore;
              return (
                <div className="receipt-content font-mono text-center space-y-2">
                  <div className="border-b border-slate-300 pb-2">
                    {/* Store Logo or Emblem */}
                    {saleStore.logoUrl ? (
                      <div className="flex justify-center mb-1.5">
                        <img
                          src={saleStore.logoUrl}
                          alt={saleStore.name}
                          className="w-14 h-14 object-contain rounded-xl border border-slate-200 shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-1.5 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center border border-slate-700 shadow-sm">
                        {saleStore.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Prominent Store Name in Bold Uppercase */}
                    <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 leading-tight">
                      {saleStore.name}
                    </h3>

                    {/* Fiscal Information & Address */}
                    <div className="text-[10px] text-slate-600 mt-1 space-y-0.5">
                      <p className="font-bold text-slate-800">NUIT: {saleStore.nuit || '400192837'}</p>
                      <p>{saleStore.address}, {saleStore.city}</p>
                      <p>Tel: {saleStore.phone || '+258 84 000 0000'}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-dashed border-slate-300">
                      <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                        FACTURA / TALÃO DE VENDA (VD)
                      </h4>
                      <p className="font-mono font-bold text-[11px] text-emerald-800">
                        Venda Nº: {completedSale.saleNumber}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Data: {new Date(completedSale.timestamp).toLocaleDateString('pt-MZ')}{' '}
                        {new Date(completedSale.timestamp).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-500">Operador: {completedSale.cashierName}</p>
                      {completedSale.customerName && completedSale.customerName !== 'Cliente Balcão' && (
                        <p className="text-[10px] text-slate-700 font-semibold">Cliente: {completedSale.customerName}</p>
                      )}
                    </div>
                  </div>

              {/* Items List */}
              <div className="text-left py-1 space-y-1">
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">{it.quantity}x {it.productName}</span>
                    <span className="font-bold shrink-0">{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-300 pt-2 text-right space-y-1">
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto ({completedSale.discountPercent}%):</span>
                    <span>-{completedSale.discount.toFixed(2)} MZN</span>
                  </div>
                )}
                {(completedSale.ivaAmount || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (17%):</span>
                    <span>{(completedSale.ivaAmount || 0).toFixed(2)} MZN</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-black border-t border-slate-300 pt-1">
                  <span>TOTAL:</span>
                  <span>{completedSale.total.toFixed(2)} MZN</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>PAGO:</span>
                  <span className="font-bold uppercase">{completedSale.paymentMethod} - APROVADO</span>
                </div>
                {completedSale.changeDue !== undefined && completedSale.changeDue > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>TROCO:</span>
                    <span className="font-bold">{completedSale.changeDue.toFixed(2)} MZN</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="font-bold text-xs uppercase tracking-widest text-black">
                  OBRIGADO! VOLTE SEMPRE
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">SL VENDAS • PDV Moçambique</p>
              </div>
            </div>
          );
        })()}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => window.print()}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Factura / Talão
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Próxima Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Customer Registration Modal */}
      <CustomerRegistrationModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={(cName, cPhone, loyaltyPct) => {
          setCustomerName(cName);
          setCustomerPhone(cPhone);
          if (loyaltyPct > 0) setDiscountPercent(loyaltyPct);
        }}
      />

      {/* Mobile Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraBarcodeOpen}
        onClose={() => setIsCameraBarcodeOpen(false)}
        onScan={(detectedCode) => {
          const found = products.find((p) => p.code === detectedCode || p.barcode === detectedCode);
          if (found) {
            addToCart(found);
            sound.beep();
            setIsCameraBarcodeOpen(false);
          } else {
            setErrorMessage(`Código "${detectedCode}" lido pela câmera, mas não está cadastrado.`);
          }
        }}
      />

      {/* Sangria & Reforço de Caixa Modal */}
      <SangriaModal
        isOpen={isSangriaModalOpen}
        onClose={() => setIsSangriaModalOpen(false)}
      />

      {/* Portable Thermal Printer Configuration Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />
    </div>
  );
};
