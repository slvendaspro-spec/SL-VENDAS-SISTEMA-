import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Laptop, Tablet, Smartphone, Check, Server } from 'lucide-react';
import { AuthorizedDevice } from '../../types';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';

interface DeviceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToEdit?: AuthorizedDevice | null;
}

export const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({
  isOpen,
  onClose,
  deviceToEdit,
}) => {
  const { stores, addDevice, updateDevice } = useStore();

  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [browser, setBrowser] = useState('Google Chrome (Android / iOS)');
  const [ipAddress, setIpAddress] = useState('197.235.10.15');
  const [assignedStoreId, setAssignedStoreId] = useState(stores[0]?.id || 'store_1');
  const [status, setStatus] = useState<'AUTHORIZED' | 'PENDING' | 'REVOKED'>('AUTHORIZED');

  useEffect(() => {
    if (deviceToEdit) {
      setDeviceName(deviceToEdit.deviceName);
      setDeviceType(deviceToEdit.deviceType);
      setBrowser(deviceToEdit.browser);
      setIpAddress(deviceToEdit.ipAddress);
      setAssignedStoreId(deviceToEdit.assignedStoreId);
      setStatus(deviceToEdit.status);
    } else {
      setDeviceName('');
      setDeviceType('mobile');
      setBrowser('Google Chrome Mobile');
      setIpAddress('197.235.10.15');
      setAssignedStoreId(stores[0]?.id || 'store_1');
      setStatus('AUTHORIZED');
    }
  }, [deviceToEdit, stores, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStore = stores.find((s) => s.id === assignedStoreId);
    const assignedStoreName = selectedStore?.name || 'Loja Principal';

    if (deviceToEdit) {
      updateDevice(deviceToEdit.id, {
        deviceName,
        deviceType,
        browser,
        ipAddress,
        assignedStoreId,
        assignedStoreName,
        status,
      });
    } else {
      addDevice({
        deviceName,
        deviceType,
        browser,
        ipAddress,
        assignedStoreId,
        assignedStoreName,
        status,
      });
    }

    sound.success();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {deviceToEdit ? 'Editar Dispositivo Manualmente' : 'Cadastrar Novo Dispositivo'}
            </h3>
            <p className="text-xs text-slate-400">
              Autorização de hardware para operação nos caixas e filiais
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nome / Identificação do Dispositivo</label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ex: Xiaomi Redmi Note 13 (Caixa 01) ou POS Balcão"
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tipo de Aparelho</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'mobile', label: 'Celular', icon: Smartphone },
                { id: 'tablet', label: 'Tablet', icon: Tablet },
                { id: 'desktop', label: 'Computador', icon: Laptop },
              ].map((tp) => {
                const Icon = tp.icon;
                const isSel = deviceType === tp.id;
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => setDeviceType(tp.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-semibold transition-all cursor-pointer ${
                      isSel
                        ? 'bg-blue-600 text-white border-blue-400 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{tp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Navegador / Sistema</label>
              <input
                type="text"
                required
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                placeholder="Google Chrome"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Endereço IP / Rede</label>
              <input
                type="text"
                required
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="197.235.10.15"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Loja / Filial Atribuída</label>
            <select
              value={assignedStoreId}
              onChange={(e) => setAssignedStoreId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Estado de Autorização</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'AUTHORIZED', label: 'Autorizado', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' },
                { id: 'PENDING', label: 'Pendente', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
                { id: 'REVOKED', label: 'Bloqueado', color: 'text-red-400 border-red-500/40 bg-red-950/40' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id as any)}
                  className={`py-2 px-1 rounded-xl text-center border font-bold text-[11px] transition-all cursor-pointer ${
                    status === st.id ? st.color + ' ring-1 ring-white/20' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-950/50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{deviceToEdit ? 'Salvar Alterações' : 'Cadastrar Dispositivo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
