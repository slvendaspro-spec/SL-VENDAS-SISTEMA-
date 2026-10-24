import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, CheckCircle, MessageSquare, Tag, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface CustomerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer?: (customerName: string, phone: string, discountPct: number) => void;
}

export const CustomerRegistrationModal: React.FC<CustomerRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const { customers, addCustomer, approveCustomer } = useStore();

  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+258 84 ');
  const [bairro, setBairro] = useState('Polana Cimento');
  const [nuit, setNuit] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [justApproved, setJustApproved] = useState<{ name: string; phone: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      bairro: bairro.trim(),
      nuit: nuit.trim() || undefined,
      status: autoApprove ? 'APROVADO' : 'PENDENTE',
      loyaltyDiscountPercent: autoApprove ? 5 : 0,
    });

    if (autoApprove) {
      setJustApproved({ name, phone });
    }

    if (onSelectCustomer) {
      onSelectCustomer(name.trim(), phone.trim(), autoApprove ? 5 : 0);
    }

    setName('');
    setPhone('+258 84 ');
    setNuit('');
    if (!autoApprove) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Cadastro de Cliente & Fidelidade</h3>
            <p className="text-xs text-slate-400">
              Passo a passo no PDV até aprovação • Desconto de 5% automático
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('register');
              setJustApproved(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'register' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Novo Cadastro
          </button>
          <button
            onClick={() => {
              setActiveTab('list');
              setJustApproved(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'list' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Clientes Cadastrados ({customers.length})
          </button>
        </div>

        {/* WhatsApp Notification Banner if just approved */}
        {justApproved && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Mensagem WhatsApp Enviada ao Cliente:
              </span>
              <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200">
                10:33 • Entregue
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 font-mono text-[11px] text-slate-200">
              <p>Olá <strong>{justApproved.name}</strong>! 👋</p>
              <p className="text-emerald-400 font-bold mt-1">O seu cadastro foi APROVADO! ✅</p>
              <p className="text-slate-300 mt-1">
                Você já tem <strong>5% de desconto</strong> na sua primeira compra.
              </p>
              <p className="text-slate-400 text-[10px] mt-1">Válido em todas as lojas PDV Moçambique.</p>
            </div>
          </div>
        )}

        {activeTab === 'register' ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-orange-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone (Moçambique)</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+258 84..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono outline-none focus:border-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bairro / Localidade</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Polana, Matola..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-orange-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">NUIT Fiscal (Opcional)</label>
              <input
                type="text"
                value={nuit}
                onChange={(e) => setNuit(e.target.value)}
                placeholder="Ex: 100452331"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono outline-none focus:border-orange-500 text-xs"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <div>
                  <span className="font-bold text-white block">Aprovar Imediatamente</span>
                  <span className="text-[11px] text-slate-400">Ativa o desconto de 5% fidelidade nesta compra</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-5 h-5 accent-orange-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Cadastrar Cliente & Aplicar</span>
            </button>
          </form>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
            {customers.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{c.name}</p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.status === 'APROVADO'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {c.status} ({c.loyaltyDiscountPercent}% Desc)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {c.phone} • {c.bairro}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {c.status === 'PENDENTE' && (
                    <button
                      onClick={() => approveCustomer(c.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                    >
                      Aprovar 5%
                    </button>
                  )}
                  {onSelectCustomer && (
                    <button
                      onClick={() => {
                        onSelectCustomer(c.name, c.phone, c.loyaltyDiscountPercent);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold"
                    >
                      Selecionar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
