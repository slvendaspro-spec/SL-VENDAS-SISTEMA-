import React, { useState } from 'react';
import {
  Shield,
  Store as StoreIcon,
  Bell,
  Lock,
  Wifi,
  WifiOff,
  UserCheck,
  Maximize2,
  RefreshCw,
  Palette,
  Check,
  HelpCircle,
  Database,
  Users,
  Sun,
  Moon,
  Printer,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NavbarProps {
  onOpenGuide?: () => void;
  onOpenNotifications?: () => void;
  onOpenThemeModal?: () => void;
  onOpenPrinters?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenGuide,
  onOpenNotifications,
  onOpenThemeModal,
  onOpenPrinters,
}) => {
  const {
    currentUser,
    logout,
    switchUser,
    users,
    lockScreen,
    stores,
    selectedAdminStoreId,
    setSelectedAdminStoreId,
    currentCashierStoreId,
    setCurrentCashierStoreId,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    notifications,
    activeThemeConfig,
    colorMode,
    toggleColorMode,
    cashierModel,
    activePrinterWidth,
  } = useStore();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isManager = currentUser.role === 'general_manager';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentStore = stores.find((s) => s.id === currentCashierStoreId) || stores[0];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 border-b select-none ${activeThemeConfig.headerBgClass} ${activeThemeConfig.borderClass} shadow-lg`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Role Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black tracking-tight text-white shadow-md border border-white/20"
            style={{ backgroundColor: activeThemeConfig.color2 }}
          >
            SL
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                SL VENDAS
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  currentUser.role === 'general_manager'
                    ? 'bg-blue-950 text-blue-300 border-blue-500/50 shadow-sm'
                    : 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-sm'
                }`}
              >
                {currentUser.role === 'general_manager'
                  ? 'ADMINISTRADOR GERAL 💙'
                  : 'VENDEDOR CAIXA'}
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400">
              {currentUser.role === 'general_manager'
                ? 'Painel Central Multi-Loja • Servidor Mãe Supabase'
                : `Loja Autorizada: ${currentStore.name} (${currentStore.city})`}
            </p>
          </div>
        </div>

        {/* Central Controls: Store Switcher for Admin OR Strict Lock for Cashier/Manager */}
        <div className="hidden md:flex items-center gap-2">
          {currentUser.role === 'general_manager' ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-blue-700/60 px-2.5 py-1 rounded-xl text-xs">
              <StoreIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Visão Geral:</span>
              <select
                value={selectedAdminStoreId}
                onChange={(e) => setSelectedAdminStoreId(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  Todas as Lojas ({stores.length})
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.city}) {s.status === 'suspended' ? '[Suspensa]' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-xl text-xs">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Loja Atribuída:</span>
              <span className="text-white font-bold">{currentStore.name} ({currentStore.city})</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Restrito</span>
              </span>
            </div>
          )}

          {/* Online/Offline Badge with Offline Queue */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border ${
              isOnline
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isOnline ? 'Conectado' : 'Offline'}</span>
            {offlineQueueCount > 0 && (
              <button
                onClick={syncOfflineQueue}
                title="Sincronizar vendas offline agora"
                className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold hover:bg-amber-500/50 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>{offlineQueueCount} pendentes</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side Utility Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Notificações e Alertas"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-500 text-white border-2 border-slate-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Day / Night Mode Toggle (Dia / Noite) */}
          <button
            onClick={toggleColorMode}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              colorMode === 'dia'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-400/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            title={colorMode === 'dia' ? 'Mudar para Modo Noite (Escuro)' : 'Mudar para Modo Dia (Claro)'}
          >
            {colorMode === 'dia' ? (
              <>
                <Sun className="w-4 h-4 text-slate-950 animate-spin-slow" />
                <span className="hidden lg:inline text-xs font-black">Dia</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-300" />
                <span className="hidden lg:inline text-xs font-semibold">Noite</span>
              </>
            )}
          </button>

          {/* Portable Printer Manager Button */}
          {onOpenPrinters && (
            <button
              onClick={onOpenPrinters}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Configurar Modelos de Impressoras Térmicas Portáteis (58mm / 80mm)"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span className="hidden xl:inline text-xs font-mono font-bold text-orange-300">
                {activePrinterWidth}
              </span>
            </button>
          )}

          {/* Theme Palette Switcher Button */}
          <button
            onClick={onOpenThemeModal}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-orange-400 hover:text-orange-300 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Personalizar Temas, Cores e Letras (15 Opções)"
          >
            <Palette className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">{activeThemeConfig.name}</span>
          </button>

          {/* Quick PIN Lock */}
          <button
            onClick={lockScreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors cursor-pointer"
            title="Bloquear Tela Rapidamente (PIN)"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:block p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Tela Inteira"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Help & Implementation Guide Modal */}
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Guia de Configuração e Instruções"
            >
              <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden md:inline">Guia & Backup</span>
            </button>
          )}

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-lg ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold leading-tight">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {currentUser.role === 'general_manager'
                    ? 'Administrador Geral'
                    : 'Vendedor Caixa'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-2 border-b border-slate-800 mb-2">
                  <p className="text-xs font-bold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-orange-300">
                    {currentStore.name}
                  </span>
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                  Alternar Operador:
                </p>

                <div className="space-y-1">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    const roleLabel =
                      u.role === 'general_manager'
                        ? 'Administrador Geral 💙'
                        : `Caixa • ${u.assignedStoreName}`;

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <div
                            className={`w-6 h-6 rounded-md ${u.avatarColor} flex items-center justify-center text-white text-[11px] font-bold overflow-hidden`}
                          >
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{roleLabel}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Terminar Sessão (Sair) Button */}
                <div className="pt-2 mt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-500/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Terminar Sessão (Sair)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
