import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CashierPOS } from './components/cashier/CashierPOS';
import { PinLockModal } from './components/security/PinLockModal';
import { TwoFactorModal } from './components/security/TwoFactorModal';
import { ImplementationGuideModal } from './components/modals/ImplementationGuideModal';
import { NotificationsDrawer } from './components/modals/NotificationsDrawer';
import { ThemeCustomizerModal } from './components/modals/ThemeCustomizerModal';
import { PrinterSettingsModal } from './components/modals/PrinterSettingsModal';

import { StoreManagerDashboard } from './components/manager/StoreManagerDashboard';
import { Laptop, Tablet, Smartphone, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    currentUser,
    twoFactorRequired,
    setTwoFactorRequired,
    colorMode,
    deviceViewMode,
    setDeviceViewMode,
  } = useStore();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-300 ${
        colorMode === 'dia'
          ? 'bg-slate-100 text-slate-900 selection:bg-orange-500 selection:text-white'
          : 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white'
      }`}
    >
      {/* Universal Top Navigation */}
      <Navbar
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenPrinters={() => setIsPrinterModalOpen(true)}
      />

      {/* Device Viewport Simulation Bar (Computador, Tablet, Celular, Responsivo) */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px] hidden sm:inline">Modo de Ecrã:</span>
          <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800">
            <button
              onClick={() => setDeviceViewMode('desktop')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold text-[11px] transition-all cursor-pointer ${
                deviceViewMode === 'desktop'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização para Computador / Desktop"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Computador</span>
            </button>
            <button
              onClick={() => setDeviceViewMode('tablet')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold text-[11px] transition-all cursor-pointer ${
                deviceViewMode === 'tablet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização para Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              onClick={() => setDeviceViewMode('mobile')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold text-[11px] transition-all cursor-pointer ${
                deviceViewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização para Telemóvel / Smartphone (412px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Celular</span>
            </button>
            <button
              onClick={() => setDeviceViewMode('responsive')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold text-[11px] transition-all cursor-pointer ${
                deviceViewMode === 'responsive'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Adaptação 100% Fluida à Janela"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Responsivo</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline font-mono">
            {deviceViewMode === 'mobile'
              ? 'Telemóvel (412px) • Toque & Câmera'
              : deviceViewMode === 'tablet'
              ? 'Tablet (768px) • Leitor & Sangria'
              : 'Ecrã Completo'}
          </span>
        </div>
      </div>

      {/* Main Role-Specific Viewport with Device Frame Adaptation */}
      <main className="flex-1 flex flex-col items-center w-full overflow-x-hidden">
        <div
          className={`w-full flex-1 flex flex-col transition-all duration-300 ${
            deviceViewMode === 'mobile'
              ? 'max-w-[414px] mx-auto border-x-2 border-slate-700 shadow-2xl my-3 rounded-3xl overflow-hidden bg-slate-950'
              : deviceViewMode === 'tablet'
              ? 'max-w-[768px] mx-auto border-x-2 border-slate-700 shadow-2xl my-3 rounded-3xl overflow-hidden bg-slate-950'
              : 'w-full'
          }`}
        >
          {currentUser.role === 'general_manager' ? (
            <AdminDashboard />
          ) : currentUser.role === 'store_manager' ? (
            <StoreManagerDashboard />
          ) : (
            <CashierPOS />
          )}
        </div>
      </main>

      {/* Security PIN Lock Overlay (Protects terminal when locked) */}
      <PinLockModal />

      {/* 2FA Email Code Verification Modal (When security action is requested) */}
      <TwoFactorModal
        isOpen={twoFactorRequired}
        onSuccess={() => setTwoFactorRequired(false)}
        onCancel={() => setTwoFactorRequired(false)}
        targetActionName="Validação de Acesso Seguro 2FA por E-mail"
      />

      {/* Theme Customizer Modal (15 themes, fonts, layouts, Mozambican settings) */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Printer Models Manager Modal (Portable 58mm/80mm) */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />

      {/* Implementation & Backup Guide Modal */}
      <ImplementationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Real-time Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
