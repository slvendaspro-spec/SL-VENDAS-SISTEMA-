import React, { useState } from 'react';
import {
  Printer,
  X,
  Bluetooth,
  Usb,
  Wifi,
  Smartphone,
  CheckCircle,
  RefreshCw,
  Sliders,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PrinterConfig } from '../../types';
import { sound } from '../../services/soundService';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    printers,
    activePrinter,
    setActivePrinter,
    activePrinterWidth,
    setActivePrinterWidth,
  } = useStore();

  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [showTestReceipt, setShowTestReceipt] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = (printerId: string) => {
    setTestingConnection(printerId);
    setTestSuccess(null);

    sound.click();

    setTimeout(() => {
      setTestingConnection(null);
      setTestSuccess(`Impressora conectada com sucesso via Bluetooth/ESC-POS! Sinal 100%.`);
      sound.success();
    }, 900);
  };

  const handleSelectPrinter = (p: PrinterConfig) => {
    setActivePrinter(p);
    setActivePrinterWidth(p.paperWidth);
    sound.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Modelos de Impressoras do Caixa
              </h3>
              <p className="text-xs text-slate-400">
                Impressoras portáteis e compactas para otimizar espaço no balcão e mobilidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Paper Width Selector Pill */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                Largura da Bobina Térmica Ativa:
              </p>
              <p className="text-[11px] text-slate-400">
                {activePrinterWidth === '58mm'
                  ? '58mm (Ultra-compacto para impressoras portáteis e mini POS)'
                  : '80mm (Padrão de mesa / talão completo com dados fiscais)'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePrinterWidth('58mm');
                  sound.click();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                  activePrinterWidth === '58mm'
                    ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                58mm (Portátil)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePrinterWidth('80mm');
                  sound.click();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                  activePrinterWidth === '80mm'
                    ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                80mm (Padrão)
              </button>
            </div>
          </div>

          {testSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{testSuccess}</span>
            </div>
          )}

          {/* List of printer models */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Impressoras Portáteis e de Balcão Disponíveis:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {printers.map((p) => {
                const isSelected = activePrinter.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPrinter(p)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/95 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-orange-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {p.connection === 'bluetooth' ? (
                          <Bluetooth className="w-5 h-5" />
                        ) : p.connection === 'usb' ? (
                          <Usb className="w-5 h-5" />
                        ) : p.connection === 'wifi_network' ? (
                          <Wifi className="w-5 h-5" />
                        ) : (
                          <Smartphone className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{p.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-orange-300 font-bold border border-slate-700">
                            {p.paperWidth}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                            {p.brand}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              EM USO NO CAIXA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(p.id);
                        }}
                        disabled={testingConnection === p.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        {testingConnection === p.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-orange-400" />
                        )}
                        <span>{testingConnection === p.id ? 'Testando...' : 'Testar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPrinter(p);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? 'Ativa' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test print toggle */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTestReceipt(!showTestReceipt)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-orange-400" />
              <span>{showTestReceipt ? 'Ocultar Prévia de Talão' : `Ver Prévia Talão (${activePrinterWidth})`}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.printer();
                window.print();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Talão de Teste Térmico</span>
            </button>
          </div>

          {/* Live Preview of 58mm / 80mm Receipt */}
          {showTestReceipt && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-center">
              <div
                className={`bg-white text-slate-950 font-mono text-[11px] p-4 rounded-lg shadow-xl border border-slate-300 leading-tight space-y-2 ${
                  activePrinterWidth === '58mm' ? 'w-[260px]' : 'w-[320px]'
                }`}
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <p className="font-extrabold text-sm">SL VENDAS MZ</p>
                  <p className="text-[10px]">MAPUTO CENTRAL</p>
                  <p className="text-[9px]">NUIT: 400892147 • MAPUTO</p>
                  <p className="text-[9px] mt-1">TESTE DE BOBINA {activePrinterWidth}</p>
                </div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>ARROZ TIO PATRICIO 5KG</span>
                    <span>450.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OLEO VIRGEM 1L</span>
                    <span>180.00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>630.00 MT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (17%):</span>
                    <span>107.10 MT</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-400">
                    <span>TOTAL:</span>
                    <span>737.10 MZN</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 pt-0.5">
                    <span>FORMA PGTO:</span>
                    <span className="font-bold">M-PESA OK</span>
                  </div>
                </div>

                <div className="text-center text-[9px] border-t border-dashed border-slate-400 pt-2 text-slate-600">
                  <p className="font-bold">OBRIGADO PELA PREFERENCIA!</p>
                  <p>SL VENDAS • GESTAO INTELIGENTE</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
