import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Store as StoreIcon,
  Lock,
  Key,
  Camera,
  Upload,
  CheckCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User as UserType, Role } from '../../types';
import { sound } from '../../services/soundService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: UserType | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { stores, addUser, updateUser } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [assignedStoreId, setAssignedStoreId] = useState('');
  const [pin, setPin] = useState('1234');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+258 84 ');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const [permissions, setPermissions] = useState({
    canChangePrices: false,
    canApplyDiscountsOverLimit: false,
    canCancelSales: false,
    canViewReports: true,
    canManageProducts: false,
    canManageUsers: false,
    canManageStores: false,
    canAdjustStock: false,
  });

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setAssignedStoreId(userToEdit.assignedStoreId);
      setPin(userToEdit.pin || '1234');
      setPassword(userToEdit.password || 'senha123');
      setPhone(userToEdit.phone || '+258 84 ');
      setIdentificationNumber(userToEdit.identificationNumber || '');
      setAvatarUrl(userToEdit.avatarUrl || '');
      setPermissions({ ...userToEdit.permissions });
    } else {
      setName('');
      setEmail('');
      setRole('cashier');
      setAssignedStoreId(stores[0]?.id || 'store_1');
      setPin('1234');
      setPassword('senha123');
      setPhone('+258 84 ');
      setIdentificationNumber('');
      setAvatarUrl('');
      setPermissions({
        canChangePrices: false,
        canApplyDiscountsOverLimit: false,
        canCancelSales: false,
        canViewReports: false,
        canManageProducts: false,
        canManageUsers: false,
        canManageStores: false,
        canAdjustStock: false,
      });
    }
    setImageError(null);
  }, [userToEdit, stores, isOpen]);

  if (!isOpen) return null;

  // Handle image upload with 5MB support
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: up to 10MB accepted
    if (file.size > 10 * 1024 * 1024) {
      setImageError('A imagem selecionada ultrapassa 10MB. Escolha um arquivo menor.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        setImageError(null);
        sound.beep();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assignedStore = stores.find((s) => s.id === assignedStoreId);
    const assignedStoreName = assignedStore ? assignedStore.name : 'Loja Geral';

    const avatarColors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-indigo-600', 'bg-orange-600'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    if (userToEdit) {
      updateUser(userToEdit.id, {
        name,
        email,
        role,
        assignedStoreId,
        assignedStoreName,
        pin,
        password,
        phone,
        identificationNumber,
        avatarUrl,
        permissions: {
          ...permissions,
          canChangePrices: role === 'general_manager' ? true : permissions.canChangePrices,
        },
      });
    } else {
      addUser({
        name,
        email,
        role,
        assignedStoreId,
        assignedStoreName,
        pin,
        password,
        phone,
        identificationNumber,
        avatarUrl: avatarUrl || `https://images.unsplash.com/photo-${role === 'store_manager' ? '1507003211169-0a1dd7228f2d' : '1534528741775-53994a69daeb'}?w=200&auto=format&fit=crop&q=80`,
        isActive: true,
        avatarColor: randomColor,
        permissions,
      });
    }

    sound.success();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-blue-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-white">
              {userToEdit ? 'Editar Dados do Usuário' : 'Cadastrar Novo Gerente / Caixa'}
            </h3>
            <p className="text-xs text-slate-400">
              Dados completos catalogados manualmente com foto de alta resolução (mínimo 5MB suportado)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Photo Upload & Preview */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto do Usuário" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-bold text-white block mb-0.5">Foto de Perfil do Usuário</span>
              <p className="text-[11px] text-slate-400 mb-2">
                Suporta fotos tiradas pelo telemóvel ou upload de arquivos de alta qualidade (mínimo 5MB suportado).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Carregar Foto (5MB+)</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-red-400 hover:text-red-300 text-[11px]"
                  >
                    Remover
                  </button>
                )}
              </div>
              {imageError && <p className="text-red-400 text-[10px] mt-1">{imageError}</p>}
            </div>
          </div>

          {/* Role Selector: Gerente vs Caixa */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold uppercase text-[10px]">
              Função do Usuário no Sistema:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('store_manager');
                  setPermissions((prev) => ({ ...prev, canViewReports: true, canAdjustStock: false }));
                }}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                  role === 'store_manager'
                    ? 'bg-blue-950/80 border-blue-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Gerente de Loja</span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    Acesso exclusivo à sua filial. Consulta de estoque em tempo real (apenas leitura).
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('cashier')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                  role === 'cashier'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <StoreIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Operador de Caixa</span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    Acesso ao terminal PDV da loja atribuída. Registra vendas, pagamentos e sangrias.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Full cataloged data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alberto Cossa"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alberto.cossa@slvendas.co.mz"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Telefone (Moçambique)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+258 84 123 4567"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">BI / Documento de Identificação</label>
              <input
                type="text"
                value={identificationNumber}
                onChange={(e) => setIdentificationNumber(e.target.value)}
                placeholder="Ex: 110203040506M"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Store Assignment Dropdown */}
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Vincular à Loja (Filial):</label>
            <select
              value={assignedStoreId}
              onChange={(e) => setAssignedStoreId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500 font-bold"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city}) • {s.code}
                </option>
              ))}
            </select>
          </div>

          {/* Passwords & Security Keys */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="font-bold text-white block text-[11px] uppercase tracking-wider text-slate-300">
              Credenciais de Acesso & Autenticação
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Senha de Acesso</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: cossa2026"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">PIN Rápido (4 dígitos)</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-center outline-none"
                />
              </div>
            </div>
          </div>

          {/* Permissions Checkboxes */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-white block text-[11px] uppercase tracking-wider text-slate-300 mb-2">
              Permissões Específicas
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canViewReports}
                  onChange={(e) => setPermissions({ ...permissions, canViewReports: e.target.checked })}
                  className="accent-blue-500"
                />
                <span>Visualizar Relatórios</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canApplyDiscountsOverLimit}
                  onChange={(e) => setPermissions({ ...permissions, canApplyDiscountsOverLimit: e.target.checked })}
                  className="accent-blue-500"
                />
                <span>Aplicar Descontos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canCancelSales}
                  onChange={(e) => setPermissions({ ...permissions, canCancelSales: e.target.checked })}
                  className="accent-blue-500"
                />
                <span>Cancelar Vendas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canChangePrices}
                  disabled={role !== 'general_manager'}
                  onChange={(e) => setPermissions({ ...permissions, canChangePrices: e.target.checked })}
                  className="accent-blue-500"
                />
                <span>Alterar Preços (Admin)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase shadow-lg shadow-blue-900/40"
            >
              {userToEdit ? 'Salvar Alterações' : 'Criar Conta de Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
