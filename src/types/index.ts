export type Role = 'general_manager' | 'cashier';

export type PaymentMethod = 'M_PESA' | 'E_MOLA' | 'DINHEIRO' | 'POS_CARTAO' | 'TRANSFERENCIA';

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  nuit: string; // NUIT moçambicano
  status: 'active' | 'suspended';
  isOnline: boolean;
  lastSync: string;
  cashierIds: string[];
  responsibleName?: string;
  dailySalesTarget: number; // Meta diária em MZN
  imageUrl?: string; // Foto da Loja
  logoUrl?: string; // Logotipo oficial da loja para facturas
  createdAt: string;
}

export interface UserPermissions {
  canChangePrices: boolean;
  canApplyDiscountsOverLimit: boolean;
  canCancelSales: boolean;
  canViewReports: boolean;
  canManageProducts: boolean;
  canManageUsers: boolean;
  canManageStores: boolean;
  canAdjustStock: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedStoreId: string; // 'ALL' for general manager
  assignedStoreName: string;
  pin: string; // 4-digit PIN for quick cashier lock
  password?: string; // Senha completa para visualização/gestão pelo Administrador Geral
  phone: string;
  identificationNumber?: string; // BI / Documento de identificação
  avatarUrl?: string; // Foto de perfil (mínimo 5MB suportado)
  isActive: boolean;
  permissions: UserPermissions;
  lastLogin: string;
  avatarColor: string;
}

export interface Product {
  id: string;
  name: string;
  code: string; // SKU or Barcode
  category: string;
  costPrice: number; // MZN
  salePrice: number; // MZN
  stockQuantity: number;
  stockByStore: Record<string, number>;
  minStock: number;
  supplier: string;
  unit: string; // Unid, Kg, Caixa, Serviço
  imageUrl?: string;
  barcode?: string;
  isVisibleInCashier?: boolean; // Habilitar produto para estar visível no caixa
  visibleInStores?: Record<string, boolean>; // Habilitação específica por loja
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  type: 'ENTRADA' | 'SAIDA_VENDA' | 'AJUSTE' | 'ESTORNO' | 'TRANSFERENCIA';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  productCode: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  itemProfit: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  storeId: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  customerNuit?: string;
  customerBairro?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  ivaRate?: number; // 17% em Moçambique
  ivaAmount?: number;
  total: number;
  totalCost: number;
  estimatedProfit: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  cashTendered?: number;
  changeDue?: number;
  isSemSangria?: boolean;
  status: 'COMPLETED' | 'CANCELLED';
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  isSynced: boolean;
  deviceId: string;
  timestamp: string;
}

export interface Expense {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  category: 'Aluguel' | 'Energia/Água' | 'Salários' | 'Transporte' | 'Internet/Comunicação' | 'Manutenção' | 'Outros';
  amount: number;
  date: string;
  registeredBy: string;
  notes?: string;
}

export type NotificationType =
  | 'SALE_COMPLETED'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'NEW_DEVICE'
  | 'AUTH_FAILED'
  | 'PERMISSION_CHANGE'
  | 'SALE_CANCELLED'
  | 'HIGH_DISCOUNT'
  | 'STORE_OFFLINE'
  | 'SYNC_STATUS'
  | 'BACKUP_CREATED';

export type NotificationSeverity = 'info' | 'warning' | 'alert' | 'success';

export interface SystemNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  storeId: string;
  storeName: string;
  actionRecommended: string;
  timestamp: string;
  isRead: boolean;
  deliveryStatus: 'ENTREGUE_INTERNO' | 'ENVIADO_PUSH' | 'ENVIADO_EMAIL';
  meta?: Record<string, any>;
}

export interface AuthorizedDevice {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  ipAddress: string;
  assignedStoreId: string;
  assignedStoreName: string;
  status: 'AUTHORIZED' | 'PENDING' | 'REVOKED';
  lastActive: string;
  fingerprint: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  details: string;
  storeId?: string;
  storeName?: string;
  severity: 'normal' | 'critical';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  bairro: string;
  nuit?: string;
  status: 'PENDENTE' | 'APROVADO';
  loyaltyDiscountPercent: number; // Ex: 5% para clientes aprovados
  createdAt: string;
}

// Exactly the 15 themes from the screenshot!
export type AppThemeId =
  | 'azul_profissional'
  | 'laranja_sl'
  | 'verde_mercado'
  | 'preto_premium'
  | 'branco_clean'
  | 'roxo_moderno'
  | 'vermelho_comercial'
  | 'turquesa'
  | 'cinza_elegante'
  | 'azul_oceano'
  | 'verde_esmeralda'
  | 'rosa_moderno'
  | 'castanho_classico'
  | 'moderno_noturno'
  | 'bandeira_mocambique'
  | 'preto_branco_pos';

export interface ThemeConfig {
  id: AppThemeId;
  name: string;
  color1: string; // primary dark / brand
  color2: string; // vivid accent / button
  bgClass: string;
  cardClass: string;
  borderClass: string;
  accentBgClass: string;
  accentTextClass: string;
  buttonClass: string;
  highlightBoxClass: string;
  headerBgClass: string;
  badgeClass: string;
  isLightMode?: boolean;
}

export type CashierLayoutMode = 'computador_3col' | 'tablet_keypad' | 'celular_1col' | 'passo_a_passo' | 'grade_catalogo';

export type AppFontFamily = 'jakarta' | 'mono' | 'condensed' | 'bold_retail';

// Day / Night mode (Dia e Noite)
export type ColorMode = 'dia' | 'noite';

// Modelos de Caixa (exclusivo para configuração pelo Administrador Geral)
export type CashierModelId =
  | 'modelo_ed_supermercado'
  | 'modelo_nati'
  | 'modelo_tablet_keypad'
  | 'modelo_celular_1col'
  | 'modelo_passo_a_passo';

export interface CashierModelOption {
  id: CashierModelId;
  name: string;
  badge: string;
  description: string;
  recommendedFor: string;
  features: string[];
}

// Modelos de Impressoras Portáteis e Pequenas para Caixa
export type PrinterPaperWidth = '58mm' | '80mm';

export interface PrinterConfig {
  id: string;
  name: string;
  modelType: 'mini_portable_58mm' | 'portable_bluetooth_80mm' | 'pocket_pos_58mm' | 'countertop_80mm' | 'digital_receipt';
  brand: string;
  paperWidth: PrinterPaperWidth;
  connection: 'bluetooth' | 'usb' | 'wifi_network' | 'digital';
  description: string;
  isDefault: boolean;
}

// Sangria e Reforço de Caixa
export interface CashTransaction {
  id: string;
  storeId: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  type: 'SANGRIA' | 'REFORCO';
  amount: number;
  reason: string;
  authorizedBy: string;
  timestamp: string;
  voucherCode?: string;
}

// Fecho Diário de Caixa Registrado
export interface ShiftClosure {
  id: string;
  closureNumber: string;
  storeId: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  initialCash: number;
  totalSalesCash: number;
  totalSalesMpesa: number;
  totalSalesEmola: number;
  totalSalesCard: number;
  totalSalesGross: number;
  totalDiscounts: number;
  totalSangrias: number;
  totalReforcos: number;
  expectedCashInDrawer: number;
  actualCashInDrawer: number;
  difference: number; // positive = excess, negative = missing
  salesCount: number;
  notes?: string;
  isSynced: boolean;
}

// Modo de visualização de dispositivos (Computador, Tablet, Celular)
export type DeviceViewMode = 'responsive' | 'desktop' | 'tablet' | 'mobile';

// Ranking das Lojas
export interface StoreRankingItem {
  storeId: string;
  storeName: string;
  storeCode: string;
  city: string;
  storeCity?: string;
  totalRevenue: number;
  salesCount: number;
  dailyTarget: number;
  dailySalesTarget?: number;
  targetPercent: number;
  targetProgress?: number;
  position: number;
  rank?: number;
}
