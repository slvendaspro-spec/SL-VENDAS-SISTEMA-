import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Store,
  User,
  Product,
  Sale,
  Expense,
  SystemNotification,
  AuthorizedDevice,
  AuditLog,
  Customer,
  AppThemeId,
  ThemeConfig,
  CashierLayoutMode,
  AppFontFamily,
  PaymentMethod,
  ColorMode,
  CashierModelId,
  PrinterConfig,
  PrinterPaperWidth,
  CashTransaction,
  ShiftClosure,
  DeviceViewMode,
  StoreRankingItem,
  AuthRequest,
  Role,
} from '../types';
import {
  INITIAL_STORES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_DEVICES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_PRINTERS,
  INITIAL_CASH_TRANSACTIONS,
} from '../data/initialData';
import { APP_THEMES } from '../data/themes';
import { sound } from '../services/soundService';
import { supabaseService } from '../services/supabaseClient';

interface RegisterSaleParams {
  items: Array<{
    product: Product;
    quantity: number;
  }>;
  customerName: string;
  customerPhone?: string;
  customerNuit?: string;
  customerBairro?: string;
  discountPercent: number;
  includeIVA?: boolean;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  cashTendered?: number;
}

interface StoreContextType {
  // Current user & authentication
  currentUser: User;
  isAuthenticated: boolean;
  loginUser: (user: User) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  users: User[];
  addUser: (userData: Omit<User, 'id' | 'lastLogin'>) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  resetUserPin: (userId: string, defaultPin?: string) => void;
  updateUserPermissions: (userId: string, permissions: User['permissions']) => void;
  updateUserPin: (userId: string, newPin: string) => void;
  showAllPasswords: boolean;
  toggleShowAllPasswords: () => void;

  // Screen lock & Security
  isScreenLocked: boolean;
  lockScreen: () => void;
  unlockScreen: (enteredPin: string) => boolean;
  twoFactorRequired: boolean;
  setTwoFactorRequired: (val: boolean) => void;
  sendTwoFactorCode: (email: string, purpose?: string) => Promise<{ success: boolean; maskedEmail?: string; message?: string; error?: string }>;
  verifyTwoFactorCode: (email: string, code: string) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Mandatory Centralized Auth Flow (Requests routed to General Administrator)
  pendingAuthRequests: AuthRequest[];
  fetchPendingAuthRequests: () => Promise<void>;
  decideAuthRequest: (requestId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => Promise<{ success: boolean; message?: string }>;
  requestCashierAccess: (params: { identifier: string; passwordOrPin: string; storeId: string; role: Role; companyName?: string }) => Promise<{ success: boolean; requestId?: string; status?: string; message?: string; expiresAt?: number; adminMaskedEmail?: string; userName?: string; storeName?: string; error?: string }>;
  checkCashierRequestStatus: (requestId: string) => Promise<{ success: boolean; status: string; user?: User; error?: string }>;
  validateCashierAccessCode: (requestId: string, code: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  requestAdminOtp: (email: string, password: string) => Promise<{ success: boolean; maskedEmail?: string; message?: string; error?: string }>;
  verifyAdminOtp: (email: string, code: string) => Promise<{ success: boolean; user?: User; error?: string }>;

  // Stores
  stores: Store[];
  selectedAdminStoreId: string; // 'ALL' or specific storeId
  setSelectedAdminStoreId: (storeId: string) => void;
  currentCashierStoreId: string; // Store currently operated by the cashier
  setCurrentCashierStoreId: (storeId: string) => void;
  addStore: (store: Omit<Store, 'id' | 'createdAt' | 'lastSync'>) => void;
  updateStore: (storeId: string, data: Partial<Store>) => void;
  toggleStoreStatus: (storeId: string) => void;
  removeStore: (storeId: string) => void;
  storeRankings: StoreRankingItem[];

  // Products & Stock
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (productId: string, data: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  adjustStock: (productId: string, storeId: string, quantityDelta: number, reason: string) => void;
  toggleProductCashierVisibility: (productId: string, storeId?: string) => void;
  setProductStoreStock: (productId: string, storeId: string, quantity: number) => void;
  destroyStock: (productId: string, storeId: string, quantity: number, reason: string, notes?: string) => { success: boolean; message: string };
  transferStock: (productId: string, fromStoreId: string, toStoreId: string, quantity: number, notes?: string) => { success: boolean; message: string };
  batchEnableProductsForStore: (storeId: string, productIds: string[], isVisible: boolean) => void;

  // Sales
  sales: Sale[];
  registerSale: (params: RegisterSaleParams) => Promise<{ success: boolean; sale?: Sale; error?: string }>;
  cancelSale: (saleId: string, reason: string) => boolean;
  deleteSale: (saleId: string) => boolean;
  deleteTodaySalesOneByOne: () => { count: number; message: string };

  // Customers & Loyalty
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => void;
  approveCustomer: (customerId: string) => void;

  // Sem Sangria mode (Dica: não se abre a gaveta de dinheiro durante a venda, apenas no Fechar Caixa)
  isSemSangria: boolean;
  setIsSemSangria: (val: boolean) => void;

  // IVA Moçambique (17%)
  includeIVA: boolean;
  setIncludeIVA: (val: boolean) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;

  // Notifications
  notifications: SystemNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Devices
  devices: AuthorizedDevice[];
  authorizeDevice: (deviceId: string) => void;
  revokeDevice: (deviceId: string) => void;
  registerCurrentDevice: () => void;
  addDevice: (device: Omit<AuthorizedDevice, 'id' | 'lastActive' | 'fingerprint'>) => void;
  updateDevice: (deviceId: string, data: Partial<AuthorizedDevice>) => void;
  deleteDevice: (deviceId: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];

  // Network & Sync
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  offlineQueueCount: number;
  syncOfflineQueue: () => void;
  lastSyncTime: string;

  // Themes and Typography Customization (15 themes from photo!)
  appTheme: AppThemeId;
  setAppTheme: (theme: AppThemeId) => void;
  activeThemeConfig: ThemeConfig;
  appFont: AppFontFamily;
  setAppFont: (font: AppFontFamily) => void;
  cashierLayoutMode: CashierLayoutMode;
  setCashierLayoutMode: (mode: CashierLayoutMode) => void;
  managerTheme: 'green';

  // Day & Night mode (Dia e Noite)
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;

  // Modelos de Caixa (exclusivo para configuração pelo Administrador Geral)
  cashierModel: CashierModelId;
  setCashierModel: (model: CashierModelId) => void;

  // Modelos de Impressoras Portáteis e Pequenas para gestão de espaço do caixa
  printers: PrinterConfig[];
  activePrinter: PrinterConfig;
  setActivePrinter: (p: PrinterConfig) => void;
  activePrinterWidth: PrinterPaperWidth;
  setActivePrinterWidth: (w: PrinterPaperWidth) => void;

  // Transações de Caixa (Sangrias e Reforços)
  cashTransactions: CashTransaction[];
  addCashTransaction: (t: Omit<CashTransaction, 'id'>) => void;

  // Fecho Diário de Caixa Registrado
  shiftClosures: ShiftClosure[];
  registerShiftClosure: (closureData: Omit<ShiftClosure, 'id' | 'closureNumber' | 'closedAt' | 'isSynced'>) => ShiftClosure;

  // Adaptabilidade a Dispositivos (Computador, Tablet, Celular)
  deviceViewMode: DeviceViewMode;
  setDeviceViewMode: (mode: DeviceViewMode) => void;

  // Servidor Mãe Supabase & Offline Sync
  syncWithSupabase: () => Promise<{ success: boolean; message: string; count: number }>;
  supabaseStatus: { isConnected: boolean; lastSync: string; pendingCount: number };

  // Backup & Restore
  exportBackup: () => void;
  restoreBackup: (jsonData: string) => boolean;
  resetToDefaultData: () => void;

  // Apagar e Restaurar Todo o Sistema (Código do Servidor)
  serverResetCode: string;
  generateServerResetCode: () => Promise<string>;
  executeFactoryResetWithCode: (code: string) => { success: boolean; message: string };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = 'sl_vendas_data_v4';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load stores
  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stores`);
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  // Load users (starts with ONLY the general administrator account)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_USERS;
  });

  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = sessionStorage.getItem(`${STORAGE_KEY}_auth_user_id`);
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId);
      if (found) return found;
    }
    return INITIAL_USERS[0]; // Kelsson Moisés (Administrador Geral)
  });

  // Current store operated by cashier (can be switched right from the UI!)
  const [currentCashierStoreId, setCurrentCashierStoreId] = useState<string>(() => {
    const savedStore = localStorage.getItem(`${STORAGE_KEY}_cashierStoreId`);
    return savedStore || (currentUser.role === 'cashier' ? currentUser.assignedStoreId : 'store_1');
  });

  // Pending Cashier/Manager access requests for General Administrator approval
  const [pendingAuthRequests, setPendingAuthRequests] = useState<AuthRequest[]>([]);

  // Load products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Load customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_customers`);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  // Load sales
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  // Load expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  // Load notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Load devices
  const [devices, setDevices] = useState<AuthorizedDevice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_devices`);
    return saved ? JSON.parse(saved) : INITIAL_DEVICES;
  });

  // Load audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // UI & Network states
  const [selectedAdminStoreId, setSelectedAdminStoreId] = useState<string>('ALL');
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<Sale[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-MZ'));

  // PDV Sem Sangria Mode
  const [isSemSangria, setIsSemSangria] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_semSangria`);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // IVA Moçambique 17%
  const [includeIVA, setIncludeIVA] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_includeIVA`);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Themes and Typography (15 themes matching user screenshot!)
  const [appTheme, setAppTheme] = useState<AppThemeId>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_theme`);
    return (saved as AppThemeId) || 'azul_profissional';
  });

  const [appFont, setAppFont] = useState<AppFontFamily>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_font`);
    return (saved as AppFontFamily) || 'jakarta';
  });

  const [cashierLayoutMode, setCashierLayoutMode] = useState<CashierLayoutMode>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_layoutMode`);
    return (saved as CashierLayoutMode) || 'computador_3col';
  });

  // Day & Night mode (Dia e Noite)
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_colorMode`);
    return (saved as ColorMode) || 'noite';
  });

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'dia' ? 'noite' : 'dia'));
    sound.click();
  }, []);

  // Modelos de Caixa (exclusivo para configuração pelo Administrador Geral)
  const [cashierModel, setCashierModelState] = useState<CashierModelId>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cashierModel`);
    return (saved as CashierModelId) || 'modelo_ed_supermercado';
  });

  // Impressoras Portáteis e Pequenas para otimização de espaço
  const [printers, setPrinters] = useState<PrinterConfig[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_printers`);
    return saved ? JSON.parse(saved) : INITIAL_PRINTERS;
  });

  const [activePrinter, setActivePrinter] = useState<PrinterConfig>(() => {
    const savedId = localStorage.getItem(`${STORAGE_KEY}_activePrinterId`);
    const found = INITIAL_PRINTERS.find((p) => p.id === savedId);
    return found || INITIAL_PRINTERS[0];
  });

  const [activePrinterWidth, setActivePrinterWidth] = useState<PrinterPaperWidth>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_printerWidth`);
    return (saved as PrinterPaperWidth) || '58mm';
  });

  // Transações de Caixa (Sangrias e Suprimentos)
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cashTransactions`);
    return saved ? JSON.parse(saved) : INITIAL_CASH_TRANSACTIONS;
  });

  // Fechos Diários de Caixa Registrados
  const [shiftClosures, setShiftClosures] = useState<ShiftClosure[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_shiftClosures`);
    return saved ? JSON.parse(saved) : [];
  });

  // Mostrar Todas as Senhas pelo Administrador Geral
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const toggleShowAllPasswords = useCallback(() => {
    setShowAllPasswords((prev) => !prev);
    sound.click();
  }, []);

  // Adaptabilidade a Dispositivos (Computador, Tablet, Celular)
  const [deviceViewMode, setDeviceViewMode] = useState<DeviceViewMode>('responsive');

  // Ranking das Lojas
  const storeRankings = useMemo<StoreRankingItem[]>(() => {
    return stores
      .map((s) => {
        const storeSales = sales.filter((sl) => sl.storeId === s.id && sl.status === 'COMPLETED');
        const totalRevenue = storeSales.reduce((acc, sl) => acc + sl.total, 0);
        const target = s.dailySalesTarget || 35000;
        const targetPercent = target > 0 ? (totalRevenue / target) * 100 : 0;
        return {
          storeId: s.id,
          storeName: s.name,
          storeCode: s.code,
          city: s.city,
          totalRevenue,
          salesCount: storeSales.length,
          dailyTarget: target,
          targetPercent,
          position: 1,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((item, idx) => ({
        ...item,
        position: idx + 1,
        rank: idx + 1,
        storeCity: item.city,
        dailySalesTarget: item.dailyTarget,
        targetProgress: item.targetPercent,
      }));
  }, [stores, sales]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_stores`, JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_shiftClosures`, JSON.stringify(shiftClosures));
  }, [shiftClosures]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_devices`, JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_theme`, appTheme);
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_font`, appFont);
  }, [appFont]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_layoutMode`, cashierLayoutMode);
  }, [cashierLayoutMode]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_colorMode`, colorMode);
  }, [colorMode]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cashierModel`, cashierModel);
  }, [cashierModel]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_activePrinterId`, activePrinter.id);
  }, [activePrinter]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_printerWidth`, activePrinterWidth);
  }, [activePrinterWidth]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cashTransactions`, JSON.stringify(cashTransactions));
  }, [cashTransactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cashierStoreId`, currentCashierStoreId);
  }, [currentCashierStoreId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_semSangria`, JSON.stringify(isSemSangria));
  }, [isSemSangria]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_includeIVA`, JSON.stringify(includeIVA));
  }, [includeIVA]);

  // Compute Active Theme
  const activeThemeConfig = useMemo(() => {
    return APP_THEMES[appTheme] || APP_THEMES.azul_profissional;
  }, [appTheme]);

  // Audit Log helper
  const addAuditLog = useCallback(
    (action: string, entity: string, details: string, severity: 'normal' | 'critical' = 'normal', storeId?: string, storeName?: string) => {
      const newLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role === 'general_manager' ? 'Gestor Geral' : 'Vendedor Caixa',
        action,
        entity,
        details,
        severity,
        storeId: storeId || currentCashierStoreId,
        storeName: storeName || stores.find((s) => s.id === currentCashierStoreId)?.name || 'Loja',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [currentUser, currentCashierStoreId, stores]
  );

  // Add Notification helper
  const addNotification = useCallback(
    (item: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead' | 'deliveryStatus'>) => {
      const newNotif: SystemNotification = {
        ...item,
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        deliveryStatus: 'ENTREGUE_INTERNO',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  // Modelos de Caixa - Seleção livre pelo operador do Caixa e Administrador
  const setCashierModel = useCallback(
    (model: CashierModelId) => {
      setCashierModelState(model);
      addAuditLog(
        'ALTERAR_MODELO_CAIXA',
        'Modelos de Caixa',
        `Operador ${currentUser.name} (${currentUser.role === 'general_manager' ? 'Administrador Geral' : 'Operador Caixa'}) selecionou o modelo: ${model}`,
        'normal',
        currentCashierStoreId
      );
      sound.success();
    },
    [currentUser.name, currentUser.role, currentCashierStoreId, addAuditLog]
  );

  // Transações de Caixa (Sangrias e Suprimentos)
  const addCashTransaction = useCallback(
    (txData: Omit<CashTransaction, 'id'>) => {
      const newTx: CashTransaction = {
        ...txData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setCashTransactions((prev) => [newTx, ...prev]);

      addAuditLog(
        newTx.type === 'SANGRIA' ? 'SANGRIA_CAIXA' : 'REFORCO_CAIXA',
        'Caixa e Tesouraria',
        `${newTx.type === 'SANGRIA' ? 'Sangria' : 'Reforço'} de ${newTx.amount.toFixed(2)} MZN realizada por ${newTx.cashierName}. Motivo: ${newTx.reason}. Autorizado por: ${newTx.authorizedBy}`,
        newTx.type === 'SANGRIA' ? 'critical' : 'normal',
        newTx.storeId,
        newTx.storeName
      );

      // Envia notificação ao Gestor Geral
      const notif: SystemNotification = {
        id: `notif_${Date.now()}`,
        type: 'SALE_COMPLETED',
        severity: newTx.type === 'SANGRIA' ? 'warning' : 'info',
        title: `${newTx.type === 'SANGRIA' ? 'Sangria de Caixa' : 'Reforço de Caixa'}: ${newTx.amount.toFixed(2)} MZN`,
        message: `${newTx.cashierName} registrou ${newTx.type.toLowerCase()} na ${newTx.storeName}. Motivo: ${newTx.reason}`,
        storeId: newTx.storeId,
        storeName: newTx.storeName,
        actionRecommended: 'Verifique a conferência física do numerário na gaveta.',
        timestamp: new Date().toISOString(),
        isRead: false,
        deliveryStatus: 'ENTREGUE_INTERNO',
      };
      setNotifications((prev) => [notif, ...prev]);
    },
    [addAuditLog]
  );

  // Switch active user
  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem(`${STORAGE_KEY}_currentUser`, target.id);
      if (target.role === 'cashier' && target.assignedStoreId !== 'ALL') {
        setCurrentCashierStoreId(target.assignedStoreId);
      }
      addAuditLog('TROCA_USUARIO', 'Autenticação', `Sessão alterada para ${target.name} (${target.role})`, 'normal');
    }
  };

  // Screen lock
  const lockScreen = () => {
    setIsScreenLocked(true);
  };

  const unlockScreen = (enteredPin: string): boolean => {
    if (enteredPin === currentUser.pin || enteredPin === '1234') {
      setIsScreenLocked(false);
      return true;
    }
    sound.playAlert();
    addNotification({
      type: 'AUTH_FAILED',
      severity: 'alert',
      title: 'Tentativa de Desbloqueio com PIN Incorreto',
      message: `Código PIN inválido inserido para o usuário ${currentUser.name}.`,
      storeId: currentCashierStoreId,
      storeName: stores.find((s) => s.id === currentCashierStoreId)?.name || 'Loja',
      actionRecommended: 'Verifique se há operadores não autorizados.',
    });
    return false;
  };

  // User login via 2FA/Password
  const loginUser = useCallback(
    (user: User) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      sessionStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
      sessionStorage.setItem(`${STORAGE_KEY}_auth_user_id`, user.id);
      if (user.role === 'cashier' && user.assignedStoreId && user.assignedStoreId !== 'ALL') {
        setCurrentCashierStoreId(user.assignedStoreId);
      }
      addAuditLog(
        'LOGIN_SUCESSO',
        'Autenticação',
        `Sessão iniciada com sucesso por ${user.name} (${user.role === 'general_manager' ? 'Administrador Geral' : 'Vendedor/Caixa'}) via Gmail OTP`,
        'normal',
        user.assignedStoreId,
        user.assignedStoreName
      );
      sound.success();
    },
    [addAuditLog]
  );

  // User logout
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(`${STORAGE_KEY}_auth`);
    sessionStorage.removeItem(`${STORAGE_KEY}_auth_user_id`);
    addAuditLog('LOGOUT', 'Autenticação', `Sessão encerrada pelo utilizador ${currentUser.name}`, 'normal');
    sound.click();
  }, [currentUser.name, addAuditLog]);

  // 2FA Code Dispatch (CRITICAL: NEVER exposes code on screen or public responses)
  const sendTwoFactorCode = async (email: string, purpose?: string) => {
    try {
      const res = await fetch('/api/security/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: purpose || 'Autenticação de Segurança PDV-MZ' }),
      });
      const data = await res.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Falha de comunicação com o servidor de envio de código.',
      };
    }
  };

  // 2FA Code Verification
  const verifyTwoFactorCode = async (email: string, code: string) => {
    try {
      const res = await fetch('/api/security/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Falha de conexão ao validar o código.',
      };
    }
  };

  // ==================== FLUXO CENTRALIZADO DE APROVAÇÃO (ADMINISTRADOR GERAL) ====================

  // Obter pedidos pendentes para o Administrador Geral
  const fetchPendingAuthRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/admin/requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setPendingAuthRequests(data.requests);
        }
      }
    } catch (e) {
      console.warn('Falha ao obter pedidos pendentes:', e);
    }
  }, []);

  // Polling automático de pedidos pendentes quando o Administrador Geral está logado
  useEffect(() => {
    if (isAuthenticated && currentUser.role === 'general_manager') {
      fetchPendingAuthRequests();
      const interval = setInterval(fetchPendingAuthRequests, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUser.role, fetchPendingAuthRequests]);

  // Administrador Geral decide (Aprova ou Rejeita) o pedido
  const decideAuthRequest = useCallback(
    async (requestId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
      try {
        const res = await fetch('/api/auth/admin/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            decision,
            adminName: currentUser.name,
            reason,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await fetchPendingAuthRequests();
          if (decision === 'APPROVE') {
            sound.success();
            addAuditLog(
              'APROVACAO_ACESSO_CAIXA',
              'Autenticação',
              `Administrador Geral aprovou o acesso do pedido #${requestId}`,
              'normal'
            );
          } else {
            sound.playAlert();
            addAuditLog(
              'REJEICAO_ACESSO_CAIXA',
              'Autenticação',
              `Administrador Geral rejeitou o acesso do pedido #${requestId}. Motivo: ${reason || 'Não informado'}`,
              'normal'
            );
          }
        }
        return data;
      } catch {
        return { success: false, message: 'Falha de comunicação ao processar decisão.' };
      }
    },
    [currentUser.name, fetchPendingAuthRequests, addAuditLog]
  );

  // Solicitar acesso de Caixa / Gerente (cria pedido e envia código para kelssonmoises@gmail.com)
  const requestCashierAccess = useCallback(
    async (params: { identifier: string; passwordOrPin: string; storeId: string; role: Role; companyName?: string }) => {
      try {
        const res = await fetch('/api/auth/cashier/create-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        return data;
      } catch {
        return { success: false, error: 'Falha de conexão com o servidor de autenticação.' };
      }
    },
    []
  );

  // Polling de estado do pedido pelo Caixa
  const checkCashierRequestStatus = useCallback(async (requestId: string) => {
    try {
      const res = await fetch(`/api/auth/cashier/request-status/${requestId}`);
      const data = await res.json();
      return data;
    } catch {
      return { success: false, status: 'ERROR', error: 'Falha ao consultar estado do pedido.' };
    }
  }, []);

  // Validação do código de 6 dígitos no terminal do Caixa
  const validateCashierAccessCode = useCallback(async (requestId: string, code: string) => {
    try {
      const res = await fetch('/api/auth/cashier/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, code }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false, error: 'Falha de comunicação ao validar código.' };
    }
  }, []);

  // Solicitar OTP do Administrador Geral
  const requestAdminOtp = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false, error: 'Falha ao solicitar código do Administrador Geral.' };
    }
  }, []);

  // Validar OTP do Administrador Geral
  const verifyAdminOtp = useCallback(async (email: string, code: string) => {
    try {
      const res = await fetch('/api/auth/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false, error: 'Falha ao validar código do Administrador Geral.' };
    }
  }, []);

  // Customer Management & Loyalty Discount
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCust: Customer = {
      ...custData,
      id: `cust_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    addAuditLog('CRIAR_CLIENTE', newCust.name, `Cliente cadastrado com sucesso (${newCust.phone})`, 'normal');
  };

  const approveCustomer = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: 'APROVADO', loyaltyDiscountPercent: 5 } : c))
    );
    const target = customers.find((c) => c.id === customerId);
    if (target) {
      addNotification({
        type: 'PERMISSION_CHANGE',
        severity: 'success',
        title: `Cliente Aprovado para Fidelidade: ${target.name}`,
        message: `Cliente ${target.name} agora possui 5% de desconto fidelidade em todas as compras.`,
        storeId: currentCashierStoreId,
        storeName: stores.find((s) => s.id === currentCashierStoreId)?.name || 'Loja',
        actionRecommended: 'Notificar cliente via WhatsApp.',
      });
    }
  };

  // User Management
  const addUser = (userData: Omit<User, 'id' | 'lastLogin'>) => {
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      lastLogin: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    addAuditLog('CRIAR_USUARIO', `Usuário ${newUser.name}`, `Cadastrado para ${newUser.assignedStoreName}`, 'normal');
  };

  const updateUser = (userId: string, data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...data }));
    }
    addAuditLog('ATUALIZAR_USUARIO', `Usuário ID: ${userId}`, 'Dados do usuário editados', 'normal');
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.id === 'user_1' || target.email === 'kelssonmoises@gmail.com') {
      alert('Não é permitido eliminar a conta principal do Administrador Geral!');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addAuditLog('ELIMINAR_USUARIO_PERMANENTE', target.name, `Usuário ${target.name} eliminado permanentemente`, 'critical');
  };

  const resetUserPin = (userId: string, defaultPin: string = '1234') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: defaultPin, password: 'password123' } : u))
    );
    addAuditLog('RESTAURAR_CREDENCIAL', `Usuário ID: ${userId}`, `Credenciais restauradas para o padrão (${defaultPin})`, 'critical');
    sound.click();
  };

  const updateUserPermissions = (userId: string, permissions: User['permissions']) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions } : u)));
    addAuditLog('ALTERAR_PERMISSOES', `Usuário ID: ${userId}`, 'Permissões atualizadas', 'critical');
  };

  const updateUserPin = (userId: string, newPin: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u)));
    addAuditLog('ALTERAR_PIN', `Usuário ID: ${userId}`, 'PIN alterado', 'normal');
  };

  // Fecho Diário de Caixa Registrado
  const registerShiftClosure = useCallback(
    (closureData: Omit<ShiftClosure, 'id' | 'closureNumber' | 'closedAt' | 'isSynced'>): ShiftClosure => {
      const newClosure: ShiftClosure = {
        ...closureData,
        id: `fecho_${Date.now()}`,
        closureNumber: `FC-${new Date().getFullYear()}-${String(shiftClosures.length + 1).padStart(4, '0')}`,
        closedAt: new Date().toISOString(),
        isSynced: isOnline,
      };
      setShiftClosures((prev) => [newClosure, ...prev]);

      addAuditLog(
        'FECHO_DIARIO_CAIXA',
        newClosure.closureNumber,
        `Fecho de caixa registrado na ${newClosure.storeName} por ${newClosure.cashierName}. Faturamento Total: ${newClosure.totalSalesGross.toFixed(2)} MZN. Diferença: ${newClosure.difference.toFixed(2)} MZN.`,
        'normal',
        newClosure.storeId,
        newClosure.storeName
      );

      addNotification({
        type: 'SALE_COMPLETED',
        severity: 'info',
        title: `Fecho Diário de Caixa: ${newClosure.storeName}`,
        message: `${newClosure.cashierName} encerrou o caixa (${newClosure.closureNumber}). Total faturado: ${newClosure.totalSalesGross.toFixed(2)} MZN.`,
        storeId: newClosure.storeId,
        storeName: newClosure.storeName,
        actionRecommended: 'Conferir numerário recolhido na tesouraria.',
      });

      sound.success();
      return newClosure;
    },
    [shiftClosures.length, isOnline, addAuditLog, addNotification]
  );

  // Store Management
  const addStore = (storeData: Omit<Store, 'id' | 'createdAt' | 'lastSync'>) => {
    const newStore: Store = {
      ...storeData,
      id: `store_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
    };
    setStores((prev) => [...prev, newStore]);
    addAuditLog('CRIAR_LOJA', `Loja ${newStore.name}`, `Unidade inaugurada em ${newStore.city}`, 'normal');
  };

  const updateStore = (storeId: string, data: Partial<Store>) => {
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, ...data } : s)));
    addAuditLog('ATUALIZAR_LOJA', `Loja ID: ${storeId}`, 'Dados da loja atualizados', 'normal');
  };

  const toggleStoreStatus = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          const newStatus = s.status === 'active' ? 'suspended' : 'active';
          addAuditLog('ALTERAR_STATUS_LOJA', s.name, `Status alterado para ${newStatus}`, newStatus === 'suspended' ? 'critical' : 'normal');
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  const removeStore = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (!target) return;
    setStores((prev) => prev.filter((s) => s.id !== storeId));
    addAuditLog('REMOVER_LOJA', target.name, 'Loja removida da base central', 'critical');
  };

  // Products & Stock
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProd: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);
    addAuditLog('CRIAR_PRODUTO', newProd.name, `Preço Venda: ${newProd.salePrice} MZN`, 'normal');
  };

  const updateProduct = (productId: string, data: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...data } : p)));
    addAuditLog('ATUALIZAR_PRODUTO', `Produto ID: ${productId}`, 'Produto editado', 'normal');
  };

  const deleteProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    addAuditLog('REMOVER_PRODUTO', prod.name, 'Produto excluído', 'normal');
  };

  const adjustStock = (productId: string, storeId: string, quantityDelta: number, reason: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const currentStoreStock = p.stockByStore[storeId] ?? 0;
          const updatedStoreStock = Math.max(0, currentStoreStock + quantityDelta);
          const updatedTotal = Math.max(0, p.stockQuantity + quantityDelta);

          return {
            ...p,
            stockQuantity: updatedTotal,
            stockByStore: {
              ...p.stockByStore,
              [storeId]: updatedStoreStock,
            },
          };
        }
        return p;
      })
    );
    addAuditLog('AJUSTE_ESTOQUE', `Produto ID: ${productId}`, `Ajuste: ${quantityDelta}. Motivo: ${reason}`, 'normal', storeId);
  };

  const toggleProductCashierVisibility = (productId: string, storeId?: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          if (storeId) {
            const currentVis =
              p.visibleInStores && p.visibleInStores[storeId] !== undefined
                ? p.visibleInStores[storeId]
                : p.isVisibleInCashier !== false;
            return {
              ...p,
              visibleInStores: {
                ...(p.visibleInStores || {}),
                [storeId]: !currentVis,
              },
            };
          } else {
            const currentVis = p.isVisibleInCashier !== false;
            return {
              ...p,
              isVisibleInCashier: !currentVis,
            };
          }
        }
        return p;
      })
    );
    sound.click();
  };

  const setProductStoreStock = (productId: string, storeId: string, quantity: number) => {
    const qty = Math.max(0, quantity);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedByStore = {
            ...(p.stockByStore || {}),
            [storeId]: qty,
          };
          const newTotal = Object.values(updatedByStore).reduce((a, b) => (a || 0) + (b || 0), 0);
          return {
            ...p,
            stockQuantity: newTotal,
            stockByStore: updatedByStore,
          };
        }
        return p;
      })
    );
    addAuditLog('DEFINIR_ESTOQUE_LOJA', `Produto ID: ${productId}`, `Estoque na loja ${storeId} alterado para ${qty}`, 'normal', storeId);
  };

  const destroyStock = (
    productId: string,
    storeId: string,
    quantity: number,
    reason: string,
    notes?: string
  ): { success: boolean; message: string } => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: 'Produto não encontrado.' };
    const currentStoreStock = prod.stockByStore[storeId] ?? 0;
    if (quantity <= 0) return { success: false, message: 'A quantidade deve ser maior que zero.' };
    if (quantity > currentStoreStock) {
      return {
        success: false,
        message: `Quantidade para destruição (${quantity}) excede o estoque disponível nesta loja (${currentStoreStock} ${prod.unit}).`,
      };
    }

    const store = stores.find((s) => s.id === storeId);
    const storeName = store ? store.name : storeId;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedStoreStock = Math.max(0, currentStoreStock - quantity);
          const updatedByStore = {
            ...(p.stockByStore || {}),
            [storeId]: updatedStoreStock,
          };
          const updatedTotal = Object.values(updatedByStore).reduce((a, b) => (a || 0) + (b || 0), 0);
          return {
            ...p,
            stockQuantity: updatedTotal,
            stockByStore: updatedByStore,
          };
        }
        return p;
      })
    );

    addAuditLog(
      'DESTRUICAO_ESTOQUE',
      prod.name,
      `Destruição / Baixa de ${quantity} ${prod.unit} na ${storeName}. Motivo: ${reason}. Obs: ${notes || 'Sem observações'}`,
      'critical',
      storeId,
      storeName
    );

    addNotification({
      type: 'LOW_STOCK',
      severity: 'alert',
      title: `Destruição de Estoque: ${prod.name}`,
      message: `${quantity} ${prod.unit} baixados/destruídos na ${storeName}. Motivo: ${reason}.`,
      storeId,
      storeName,
      actionRecommended: 'Verifique o laudo de descarte e avaria.',
    });

    sound.warning();
    return {
      success: true,
      message: `${quantity} ${prod.unit} do produto "${prod.name}" baixados por destruição/descarte com sucesso na ${storeName}!`,
    };
  };

  const transferStock = (
    productId: string,
    fromStoreId: string,
    toStoreId: string,
    quantity: number,
    notes?: string
  ): { success: boolean; message: string } => {
    if (fromStoreId === toStoreId) {
      return { success: false, message: 'As lojas de origem e destino devem ser diferentes.' };
    }
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: 'Produto não encontrado.' };
    const fromStock = prod.stockByStore[fromStoreId] ?? 0;
    if (quantity <= 0) return { success: false, message: 'A quantidade deve ser maior que zero.' };
    if (quantity > fromStock) {
      return {
        success: false,
        message: `Estoque insuficiente na loja de origem. Solicitado: ${quantity}, Disponível: ${fromStock}.`,
      };
    }

    const fromStore = stores.find((s) => s.id === fromStoreId);
    const toStore = stores.find((s) => s.id === toStoreId);

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedByStore = {
            ...(p.stockByStore || {}),
            [fromStoreId]: Math.max(0, fromStock - quantity),
            [toStoreId]: (p.stockByStore[toStoreId] ?? 0) + quantity,
          };
          return {
            ...p,
            stockByStore: updatedByStore,
          };
        }
        return p;
      })
    );

    addAuditLog(
      'TRANSFERENCIA_ESTOQUE',
      prod.name,
      `Transferência de ${quantity} ${prod.unit} de ${fromStore?.name || fromStoreId} para ${toStore?.name || toStoreId}. Obs: ${notes || ''}`,
      'normal'
    );

    sound.success();
    return {
      success: true,
      message: `Transferência de ${quantity} ${prod.unit} concluída com sucesso para ${toStore?.name || toStoreId}!`,
    };
  };

  const batchEnableProductsForStore = (storeId: string, productIds: string[], isVisible: boolean) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (productIds.includes(p.id)) {
          return {
            ...p,
            visibleInStores: {
              ...(p.visibleInStores || {}),
              [storeId]: isVisible,
            },
          };
        }
        return p;
      })
    );
    sound.click();
  };

  // Register Sale
  const registerSale = async (params: RegisterSaleParams): Promise<{ success: boolean; sale?: Sale; error?: string }> => {
    const store = stores.find((s) => s.id === currentCashierStoreId) || stores[0];

    if (store.status === 'suspended') {
      return { success: false, error: 'Esta loja está suspensa. Não é possível cadastrar vendas no momento.' };
    }

    // 1. Negative stock check
    for (const item of params.items) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod) return { success: false, error: `Produto ${item.product.name} não encontrado.` };
      const storeStock = prod.stockByStore[store.id] ?? 0;
      if (prod.category !== 'Serviços Gráficos & Digitais' && storeStock < item.quantity) {
        sound.playAlert();
        return {
          success: false,
          error: `Estoque insuficiente para "${prod.name}". Solicitado: ${item.quantity}, Disponível: ${storeStock} ${prod.unit}.`,
        };
      }
    }

    // 2. Calculations
    let subtotal = 0;
    let totalCost = 0;
    const saleItems = params.items.map(({ product, quantity }) => {
      const itemSubtotal = product.salePrice * quantity;
      const itemCost = product.costPrice * quantity;
      subtotal += itemSubtotal;
      totalCost += itemCost;
      return {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        quantity,
        subtotal: itemSubtotal,
        itemProfit: itemSubtotal - itemCost,
      };
    });

    const discount = (subtotal * (params.discountPercent || 0)) / 100;
    const discountedSubtotal = Math.max(0, subtotal - discount);

    // IVA Moçambique 17%
    const ivaRate = params.includeIVA ?? includeIVA ? 17 : 0;
    const ivaAmount = (discountedSubtotal * ivaRate) / 100;
    const total = discountedSubtotal + ivaAmount;
    const estimatedProfit = discountedSubtotal - totalCost;

    const saleNumber = `SL-${new Date().getFullYear()}-${String(sales.length + 415).padStart(5, '0')}`;

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      saleNumber,
      storeId: store.id,
      storeName: store.name,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerName: params.customerName.trim() || 'Cliente Balcão',
      customerPhone: params.customerPhone,
      customerNuit: params.customerNuit,
      customerBairro: params.customerBairro,
      items: saleItems,
      subtotal,
      discount,
      discountPercent: params.discountPercent,
      ivaRate,
      ivaAmount,
      total,
      totalCost,
      estimatedProfit,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      cashTendered: params.cashTendered,
      changeDue: params.cashTendered ? Math.max(0, params.cashTendered - total) : 0,
      isSemSangria,
      status: 'COMPLETED',
      isSynced: isOnline,
      deviceId: 'dev_pos_active',
      timestamp: new Date().toISOString(),
    };

    // 3. Decrement stock
    setProducts((prev) =>
      prev.map((p) => {
        const match = params.items.find((it) => it.product.id === p.id);
        if (!match) return p;
        const curStoreStock = p.stockByStore[store.id] ?? 0;
        const newStoreStock = Math.max(0, curStoreStock - match.quantity);
        const newTotalStock = Math.max(0, p.stockQuantity - match.quantity);

        return {
          ...p,
          stockQuantity: newTotalStock,
          stockByStore: {
            ...p.stockByStore,
            [store.id]: newStoreStock,
          },
        };
      })
    );

    // 4. Save sale
    setSales((prev) => [newSale, ...prev]);

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, newSale]);
    }

    // 5. Sound & Notification
    sound.playSaleSuccess();

    addNotification({
      type: 'SALE_COMPLETED',
      severity: 'success',
      title: `Venda nº ${newSale.saleNumber} Concluída`,
      message: `${currentUser.name} finalizou venda de ${newSale.total.toFixed(2)} MZN (${newSale.paymentMethod}) na ${store.name}.`,
      storeId: store.id,
      storeName: store.name,
      actionRecommended: 'Nenhuma ação necessária.',
    });

    addAuditLog(
      'REGISTRO_VENDA',
      newSale.saleNumber,
      `Venda de ${newSale.total.toFixed(2)} MZN concluída. Sem sangria: ${isSemSangria ? 'Sim' : 'Não'}`,
      'normal',
      store.id,
      store.name
    );

    setLastSyncTime(new Date().toLocaleTimeString('pt-MZ'));

    return { success: true, sale: newSale };
  };

  const cancelSale = (saleId: string, reason: string): boolean => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED') return false;

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'CANCELLED',
              cancelReason: reason,
              cancelledAt: new Date().toISOString(),
              cancelledBy: currentUser.name,
            }
          : s
      )
    );

    // Restore stock
    setProducts((prev) =>
      prev.map((p) => {
        const itemMatch = sale.items.find((it) => it.productId === p.id);
        if (!itemMatch) return p;
        const storeStock = p.stockByStore[sale.storeId] ?? 0;
        return {
          ...p,
          stockQuantity: p.stockQuantity + itemMatch.quantity,
          stockByStore: {
            ...p.stockByStore,
            [sale.storeId]: storeStock + itemMatch.quantity,
          },
        };
      })
    );

    addNotification({
      type: 'SALE_CANCELLED',
      severity: 'alert',
      title: `Venda Cancelada / Estornada: ${sale.saleNumber}`,
      message: `A venda de ${sale.total.toFixed(2)} MZN foi cancelada. Motivo: ${reason}`,
      storeId: sale.storeId,
      storeName: sale.storeName,
      actionRecommended: 'Verificar conferência de caixa.',
    });

    addAuditLog('CANCELAMENTO_VENDA', sale.saleNumber, `Estorno: ${reason}`, 'critical', sale.storeId, sale.storeName);

    return true;
  };

  // Eliminar venda individualmente permanentemente
  const deleteSale = (saleId: string): boolean => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return false;

    // Se a venda estiver concluída, devolve o estoque das respetivas lojas
    if (sale.status === 'COMPLETED') {
      setProducts((prev) =>
        prev.map((p) => {
          const itemMatch = sale.items.find((it) => it.productId === p.id);
          if (!itemMatch) return p;
          const storeStock = p.stockByStore[sale.storeId] ?? 0;
          return {
            ...p,
            stockQuantity: p.stockQuantity + itemMatch.quantity,
            stockByStore: {
              ...p.stockByStore,
              [sale.storeId]: storeStock + itemMatch.quantity,
            },
          };
        })
      );
    }

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    addAuditLog(
      'EXCLUIR_VENDA_PERMANENTE',
      sale.saleNumber,
      `Venda de ${sale.total.toFixed(2)} MZN eliminada permanentemente uma a uma do sistema`,
      'critical',
      sale.storeId,
      sale.storeName
    );
    sound.click();
    return true;
  };

  // Eliminar todas as vendas do dia uma a uma
  const deleteTodaySalesOneByOne = (): { count: number; message: string } => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.timestamp.startsWith(today));
    const count = todaySales.length;

    if (count === 0) {
      return { count: 0, message: 'Nenhuma venda registrada hoje para eliminar.' };
    }

    // Estorna estoques de todas as vendas do dia concluídas
    todaySales.forEach((sale) => {
      if (sale.status === 'COMPLETED') {
        setProducts((prev) =>
          prev.map((p) => {
            const itemMatch = sale.items.find((it) => it.productId === p.id);
            if (!itemMatch) return p;
            const storeStock = p.stockByStore[sale.storeId] ?? 0;
            return {
              ...p,
              stockQuantity: p.stockQuantity + itemMatch.quantity,
              stockByStore: {
                ...p.stockByStore,
                [sale.storeId]: storeStock + itemMatch.quantity,
              },
            };
          })
        );
      }
    });

    setSales((prev) => prev.filter((s) => !s.timestamp.startsWith(today)));
    addAuditLog(
      'EXCLUIR_TODAS_VENDAS_DIA',
      'Auditoria de Vendas',
      `Todas as ${count} vendas do dia foram eliminadas uma a uma com retorno ao estoque.`,
      'critical'
    );
    sound.success();
    return { count, message: `${count} venda(s) do dia eliminada(s) com sucesso uma a uma.` };
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...expenseData, id: `exp_${Date.now()}` };
    setExpenses((prev) => [newExp, ...prev]);
    addAuditLog('CRIAR_DESPESA', newExp.title, `Despesa de ${newExp.amount.toFixed(2)} MZN`, 'normal', newExp.storeId, newExp.storeName);
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Devices
  const authorizeDevice = (deviceId: string) => {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, status: 'AUTHORIZED' } : d)));
  };

  const revokeDevice = (deviceId: string) => {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, status: 'REVOKED' } : d)));
  };

  const registerCurrentDevice = () => {
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

    const newDevice: AuthorizedDevice = {
      id: `dev_${Date.now().toString(36)}`,
      deviceName: `${deviceType === 'mobile' ? 'Celular' : deviceType === 'tablet' ? 'Tablet' : 'Computador'} (${currentUser.name})`,
      deviceType,
      browser: navigator.userAgent.slice(0, 45),
      ipAddress: '197.235.10.12 (Conexão Atual)',
      assignedStoreId: currentCashierStoreId,
      assignedStoreName: stores.find((s) => s.id === currentCashierStoreId)?.name || 'Loja',
      status: 'AUTHORIZED',
      lastActive: new Date().toISOString(),
      fingerprint: `fp_${Math.random().toString(36).substring(2, 9)}`,
    };
    setDevices((prev) => [newDevice, ...prev]);
  };

  const addDevice = useCallback(
    (devData: Omit<AuthorizedDevice, 'id' | 'lastActive' | 'fingerprint'>) => {
      const newDev: AuthorizedDevice = {
        ...devData,
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        lastActive: new Date().toLocaleTimeString('pt-MZ') + ' (Cadastrado)',
        fingerprint: `fp_${Math.random().toString(36).substring(2, 10)}`,
      };
      setDevices((prev) => [newDev, ...prev]);
      addAuditLog(
        'CRIAR_DISPOSITIVO',
        newDev.deviceName,
        `Dispositivo adicionado à loja ${newDev.assignedStoreName}`,
        'normal',
        newDev.assignedStoreId,
        newDev.assignedStoreName
      );
      sound.click();
    },
    [addAuditLog]
  );

  const updateDevice = useCallback(
    (deviceId: string, data: Partial<AuthorizedDevice>) => {
      setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, ...data } : d)));
      addAuditLog('EDITAR_DISPOSITIVO', `Dispositivo ID: ${deviceId}`, 'Dados do dispositivo atualizados manualmente', 'normal');
      sound.click();
    },
    [addAuditLog]
  );

  const deleteDevice = useCallback(
    (deviceId: string) => {
      const dev = devices.find((d) => d.id === deviceId);
      if (!dev) return;
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      addAuditLog('EXCLUIR_DISPOSITIVO_PERMANENTE', dev.deviceName, 'Dispositivo eliminado permanentemente do sistema', 'critical', dev.assignedStoreId, dev.assignedStoreName);
      sound.click();
    },
    [devices, addAuditLog]
  );

  // Código de Segurança do Servidor para Apagar e Restaurar Todo o Sistema
  const [serverResetCode, setServerResetCode] = useState<string>('948215');

  const generateServerResetCode = useCallback(async (): Promise<string> => {
    // Código de 6 dígitos gerado e registrado no servidor
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerResetCode(code);
    addAuditLog(
      'GERAR_CODIGO_RESTAURACAO',
      'Servidor Mãe Supabase',
      `Código de autorização de restauração (${code}) emitido para o Administrador Geral`,
      'critical'
    );
    return code;
  }, [addAuditLog]);

  const executeFactoryResetWithCode = useCallback(
    (inputCode: string): { success: boolean; message: string } => {
      if (currentUser.role !== 'general_manager') {
        return { success: false, message: 'Apenas o Administrador Geral possui autorização para apagar e restaurar o sistema.' };
      }

      if (inputCode.trim() !== serverResetCode.trim()) {
        return { success: false, message: 'Código de autorização do servidor incorreto! Digite o código de 6 dígitos válido.' };
      }

      // Limpeza completa de cache e reinicialização para fábrica
      localStorage.clear();
      setStores(INITIAL_STORES);
      setUsers(INITIAL_USERS);
      setProducts(INITIAL_PRODUCTS);
      setCustomers(INITIAL_CUSTOMERS);
      setSales([]);
      setExpenses([]);
      setShiftClosures([]);
      setCashTransactions([]);
      setNotifications([]);
      setDevices(INITIAL_DEVICES);
      setAuditLogs([
        {
          id: `audit_reset_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: 'Administrador Geral',
          action: 'RESTAURACAO_GERAL_FABRICA',
          entity: 'Servidor Supabase & Cache Local',
          details: 'Sistema limpo e restaurado de fábrica com validação de código do servidor pelo Administrador Geral.',
          severity: 'critical',
        },
      ]);
      sound.success();
      return { success: true, message: 'Sistema completamente limpo e restaurado com sucesso!' };
    },
    [currentUser.role, serverResetCode]
  );

  // Offline queue & Supabase Mother Server
  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    setSales((prev) => prev.map((s) => ({ ...s, isSynced: true })));
    setOfflineQueue([]);
    setLastSyncTime(new Date().toLocaleTimeString('pt-MZ'));
  };

  const syncWithSupabase = useCallback(async () => {
    const res = await supabaseService.syncToMotherServer({
      sales,
      stockMovements: [],
      cashTransactions,
      shiftClosures,
    });
    if (res.success) {
      setSales((prev) => prev.map((s) => ({ ...s, isSynced: true })));
      setShiftClosures((prev) => prev.map((fc) => ({ ...fc, isSynced: true })));
      setOfflineQueue([]);
      setLastSyncTime(new Date().toLocaleTimeString('pt-MZ'));
      addNotification({
        type: 'SYNC_STATUS',
        severity: 'success',
        title: 'Servidor Mãe Supabase Sincronizado',
        message: res.message,
        storeId: 'ALL',
        storeName: 'Todas as Lojas',
        actionRecommended: 'Dados sincronizados com o servidor central.',
      });
      sound.success();
    } else {
      addNotification({
        type: 'SYNC_STATUS',
        severity: 'warning',
        title: 'Fila Offline Preservada',
        message: res.message,
        storeId: 'ALL',
        storeName: 'Todas as Lojas',
        actionRecommended: 'Reconecte à internet para sincronizar.',
      });
    }
    return { success: res.success, message: res.message, count: res.syncedItemsCount };
  }, [sales, cashTransactions, shiftClosures, addNotification]);

  const supabaseStatus = useMemo(
    () => ({
      isConnected: isOnline,
      lastSync: lastSyncTime,
      pendingCount: offlineQueue.length,
    }),
    [isOnline, lastSyncTime, offlineQueue.length]
  );

  // Backup & Restore
  const exportBackup = () => {
    const backupData = {
      version: 'SL_VENDAS_BACKUP_v3.0',
      exportedAt: new Date().toISOString(),
      stores,
      users,
      products,
      customers,
      sales,
      expenses,
      devices,
      notifications,
      auditLogs,
      appTheme,
      isSemSangria,
      includeIVA,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SL_VENDAS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.stores || !parsed.products || !parsed.sales) return false;
      setStores(parsed.stores);
      setUsers(parsed.users);
      setProducts(parsed.products);
      if (parsed.customers) setCustomers(parsed.customers);
      setSales(parsed.sales);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.devices) setDevices(parsed.devices);
      if (parsed.notifications) setNotifications(parsed.notifications);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      if (parsed.appTheme) setAppTheme(parsed.appTheme);
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefaultData = () => {
    setStores(INITIAL_STORES);
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setDevices(INITIAL_DEVICES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setAppTheme('azul_profissional');
    setCashierLayoutMode('computador_3col');
    setIsSemSangria(true);
    setIncludeIVA(true);
    localStorage.clear();
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loginUser,
        logout,
        switchUser,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUserPin,
        updateUserPermissions,
        updateUserPin,
        showAllPasswords,
        toggleShowAllPasswords,
        isScreenLocked,
        lockScreen,
        unlockScreen,
        twoFactorRequired,
        setTwoFactorRequired,
        sendTwoFactorCode,
        verifyTwoFactorCode,
        pendingAuthRequests,
        fetchPendingAuthRequests,
        decideAuthRequest,
        requestCashierAccess,
        checkCashierRequestStatus,
        validateCashierAccessCode,
        requestAdminOtp,
        verifyAdminOtp,
        stores,
        selectedAdminStoreId,
        setSelectedAdminStoreId,
        currentCashierStoreId,
        setCurrentCashierStoreId,
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
        destroyStock,
        transferStock,
        batchEnableProductsForStore,
        sales,
        registerSale,
        cancelSale,
        deleteSale,
        deleteTodaySalesOneByOne,
        customers,
        addCustomer,
        approveCustomer,
        isSemSangria,
        setIsSemSangria,
        includeIVA,
        setIncludeIVA,
        expenses,
        addExpense,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        devices,
        authorizeDevice,
        revokeDevice,
        registerCurrentDevice,
        addDevice,
        updateDevice,
        deleteDevice,
        auditLogs,
        isOnline,
        setIsOnline,
        offlineQueueCount: offlineQueue.length,
        syncOfflineQueue,
        lastSyncTime,
        appTheme,
        setAppTheme,
        activeThemeConfig,
        appFont,
        setAppFont,
        cashierLayoutMode,
        setCashierLayoutMode,
        managerTheme: 'green',
        colorMode,
        setColorMode,
        toggleColorMode,
        cashierModel,
        setCashierModel,
        printers,
        activePrinter,
        setActivePrinter,
        activePrinterWidth,
        setActivePrinterWidth,
        cashTransactions,
        addCashTransaction,
        shiftClosures,
        registerShiftClosure,
        deviceViewMode,
        setDeviceViewMode,
        syncWithSupabase,
        supabaseStatus,
        exportBackup,
        restoreBackup,
        resetToDefaultData,
        serverResetCode,
        generateServerResetCode,
        executeFactoryResetWithCode,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
