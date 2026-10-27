import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  Phone,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  ChevronLeft,
  Building2,
  Check,
  Briefcase,
  Users,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';
import { User, Role } from '../../types';

export const LoginPortal: React.FC = () => {
  const {
    stores,
    loginUser,
    requestAdminOtp,
    verifyAdminOtp,
    requestCashierAccess,
    checkCashierRequestStatus,
    validateCashierAccessCode,
    requestAccountRecovery,
    confirmAccountRecovery,
    isOnline,
  } = useStore();

  // Mode selection: 'SELECT' | 'ADMIN' | 'CASHIER' | 'RECOVERY'
  const [activePortal, setActivePortal] = useState<'SELECT' | 'ADMIN' | 'CASHIER' | 'RECOVERY'>('SELECT');

  // Step: 1 = Credenciais, 2 = Validação de Código / Aguardando Aprovação
  const [authStep, setAuthStep] = useState<1 | 2>(1);

  // Formulário comum de Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Formulário Opção B (Caixa / Gerente)
  const [selectedCompany] = useState('SL VENDAS');
  const [selectedStoreId, setSelectedStoreId] = useState(() => stores[0]?.id || 'store_1');
  const [selectedRole, setSelectedRole] = useState<Role>('cashier');

  // Estado do Pedido de Aprovação (Opção B)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestAdminMaskedEmail, setRequestAdminMaskedEmail] = useState<string>('k***s@gmail.com');
  const [pendingStoreName, setPendingStoreName] = useState<string>('');
  const [pendingUserName, setPendingUserName] = useState<string>('');

  // Estados exclusivos de Recuperação de Conta
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryUserNotice, setRecoveryUserNotice] = useState<string | null>(null);

  // Estados de carregamento e feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Temporizador de 5 minutos (300 segundos)
  const [countdown, setCountdown] = useState<number>(300);
  const [canResend, setCanResend] = useState(false);

  // Polling ref para cancelamento limpo
  const pollingRef = useRef<any>(null);

  // Temporizador regressivo de 5 minutos
  useEffect(() => {
    let timer: any;
    if ((authStep === 2 || recoveryStep === 2) && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, recoveryStep, countdown]);

  // Polling automático no terminal de caixa (Opção B) para detetar aprovação direta do Admin
  useEffect(() => {
    if (authStep === 2 && activePortal === 'CASHIER' && activeRequestId) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await checkCashierRequestStatus(activeRequestId);
          if (res.success && res.status === 'APPROVED' && res.user) {
            clearInterval(pollingRef.current);
            sound.success();
            setSuccessNotice('Acesso aprovado pelo Administrador Geral! A iniciar sessão...');
            setTimeout(() => {
              if (res.user) loginUser(res.user);
            }, 800);
          } else if (res.status === 'REJECTED') {
            clearInterval(pollingRef.current);
            sound.playAlert();
            setErrorMessage(res.error || 'O seu pedido de acesso foi rejeitado pelo Administrador Geral.');
          } else if (res.status === 'EXPIRED') {
            clearInterval(pollingRef.current);
            sound.playAlert();
            setErrorMessage('O pedido de acesso expirou após 5 minutos. Inicie um novo pedido.');
          }
        } catch (e) {
          // Erro de rede temporário
        }
      }, 2500);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [authStep, activePortal, activeRequestId, checkCashierRequestStatus, loginUser]);

  const resetForm = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIdentifier('');
    setPassword('');
    setOtpCode('');
    setRecoveryCode('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryNewPin('');
    setRecoveryUserNotice(null);
    setErrorMessage(null);
    setSuccessNotice(null);
    setActiveRequestId(null);
    setAuthStep(1);
    setRecoveryStep(1);
    setCountdown(300);
    setCanResend(false);
  };

  const handleSelectPortal = (portal: 'ADMIN' | 'CASHIER') => {
    sound.click();
    resetForm();
    setActivePortal(portal);
    if (portal === 'ADMIN') {
      setIdentifier('kelssonmoises@gmail.com');
      setPassword('admin123');
    } else {
      setIdentifier('Amélia Cossa');
      setPassword('caixa123');
      setSelectedRole('cashier');
    }
  };

  const handleOpenRecovery = (defaultId?: string) => {
    sound.click();
    resetForm();
    if (defaultId) setRecoveryIdentifier(defaultId);
    setActivePortal('RECOVERY');
  };

  // ==================== SUBMISSÃO DO PASSO 1 (LOGIN) ====================
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      sound.playAlert();
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      if (activePortal === 'ADMIN') {
        // OPÇÃO A: ADMINISTRADOR GERAL
        const res = await requestAdminOtp(cleanId, cleanPass);
        if (res.success) {
          sound.success();
          setRequestAdminMaskedEmail(res.maskedEmail || 'k***s@gmail.com');
          setSuccessNotice(res.message || 'Código de confirmação enviado para o Gmail oficial.');
          setAuthStep(2);
          setCountdown(300);
          setCanResend(false);
        } else {
          sound.playAlert();
          setErrorMessage(res.error || 'Credenciais de Administrador inválidas.');
        }
      } else {
        // OPÇÃO B: GERENTE / VENDEDOR / CAIXA
        // Cria pedido e envia código EXCLUSIVAMENTE para kelssonmoises@gmail.com
        const res = await requestCashierAccess({
          identifier: cleanId,
          passwordOrPin: cleanPass,
          storeId: selectedStoreId,
          role: selectedRole,
          companyName: selectedCompany,
        });

        if (res.success && res.requestId) {
          sound.success();
          setActiveRequestId(res.requestId);
          setRequestAdminMaskedEmail(res.adminMaskedEmail || 'k***s@gmail.com');
          setPendingStoreName(res.storeName || 'Loja Selecionada');
          setPendingUserName(res.userName || cleanId);
          setSuccessNotice(
            `Pedido #${res.requestId} criado. Notificação e código de aprovação enviados para o Gmail oficial do Administrador Geral (${res.adminMaskedEmail || 'k***s@gmail.com'}).`
          );
          setAuthStep(2);
          setCountdown(300);
          setCanResend(false);
        } else {
          sound.playAlert();
          setErrorMessage(res.error || 'Credenciais inválidas ou utilizador não autorizado.');
        }
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro de comunicação com o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SUBMISSÃO DO PASSO 2 (VALIDAÇÃO DE CÓDIGO LOGIN) ====================
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      sound.playAlert();
      setErrorMessage('O código de aprovação deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setLoading(true);

    try {
      if (activePortal === 'ADMIN') {
        // Validar código do Administrador Geral
        const res = await verifyAdminOtp(identifier, cleanCode);
        if (res.success && res.user) {
          sound.success();
          setSuccessNotice('Código validado com sucesso! Abrindo Painel do Administrador Geral...');
          setTimeout(() => {
            if (res.user) loginUser(res.user);
          }, 600);
        } else {
          sound.playAlert();
          setErrorMessage(res.error || 'Código incorreto ou expirado.');
        }
      } else {
        // Validar código fornecido pelo Administrador ao Caixa
        if (!activeRequestId) {
          setErrorMessage('Identificador do pedido em falta. Reinicie o pedido.');
          setLoading(false);
          return;
        }

        const res = await validateCashierAccessCode(activeRequestId, cleanCode);
        if (res.success && res.user) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          sound.success();
          setSuccessNotice('Código de autorização validado com sucesso! Abrindo terminal de venda...');
          setTimeout(() => {
            if (res.user) loginUser(res.user);
          }, 600);
        } else {
          sound.playAlert();
          setErrorMessage(res.error || 'Código de autorização inválido ou expirado.');
        }
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro ao validar código no servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SUBMISSÃO DA RECUPERAÇÃO DE CONTA (PASSO 1) ====================
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanId = recoveryIdentifier.trim();
    if (!cleanId) {
      sound.playAlert();
      setErrorMessage('Por favor, introduza o seu email, nome ou telefone registado.');
      return;
    }

    setLoading(true);

    try {
      const res = await requestAccountRecovery({ identifier: cleanId });
      if (res.success) {
        sound.success();
        setRequestAdminMaskedEmail(res.maskedEmail || 'k***s@gmail.com');
        setRecoveryUserNotice(`${res.userName} (${res.userEmail})`);
        setSuccessNotice(
          `Código de recuperação de 6 dígitos gerado e enviado para o email oficial do Administrador Geral (${res.maskedEmail || 'k***s@gmail.com'}).`
        );
        setRecoveryStep(2);
        setCountdown(300);
        setCanResend(false);
      } else {
        sound.playAlert();
        setErrorMessage(res.error || 'Não foi possível localizar uma conta com os dados fornecidos.');
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro ao comunicar com o servidor de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SUBMISSÃO DA RECUPERAÇÃO DE CONTA (PASSO 2) ====================
  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanCode = recoveryCode.trim();
    const cleanPass = recoveryNewPassword.trim();
    const cleanConfirm = recoveryConfirmPassword.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      sound.playAlert();
      setErrorMessage('O código de recuperação deve ter exatamente 6 dígitos.');
      return;
    }

    if (cleanPass.length < 4) {
      sound.playAlert();
      setErrorMessage('A nova palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      sound.playAlert();
      setErrorMessage('A confirmação da palavra-passe não coincide.');
      return;
    }

    setLoading(true);

    try {
      const res = await confirmAccountRecovery({
        identifier: recoveryIdentifier.trim(),
        code: cleanCode,
        newPassword: cleanPass,
        newPin: recoveryNewPin.trim() || undefined,
      });

      if (res.success) {
        sound.success();
        setSuccessNotice('Palavra-passe redefinida com sucesso! A redirecionar para o ecrã de início de sessão...');
        setTimeout(() => {
          resetForm();
          setActivePortal('SELECT');
        }, 1800);
      } else {
        sound.playAlert();
        setErrorMessage(res.error || 'Código incorreto ou expirado.');
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro ao confirmar recuperação no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const minutesLeft = Math.floor(countdown / 60);
  const secondsLeft = countdown % 60;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-900/20 via-blue-950/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-900/40 border border-blue-400/30">
            SL
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>SL VENDAS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30">
                PDV-MZ v4.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Sistema Comercial & Ponto de Venda • Moçambique</p>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Servidor Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">Modo Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-xl">
          {/* ==================== 1. TELA DE SELEÇÃO INICIAL ==================== */}
          {activePortal === 'SELECT' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 border border-blue-500/30 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Portal de Autenticação Centralizado
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Selecione a sua Opção de Acesso
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Por motivos de segurança financeira, todos os acessos são autenticados e os pedidos dos caixas
                  são encaminhados ao Administrador Geral.
                </p>
              </div>

              {/* Duas Opções Obrigatórias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* OPÇÃO A — ADMINISTRADOR GERAL */}
                <button
                  type="button"
                  onClick={() => handleSelectPortal('ADMIN')}
                  className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500/40 hover:border-blue-400 text-left transition-all hover:scale-[1.02] shadow-xl hover:shadow-blue-900/20 group cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                        OPÇÃO A
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-200">
                        ADMINISTRADOR GERAL
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Gestão central de todas as lojas, aprovações em tempo real, auditoria e stocks.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                    <span>Acesso com Confirmação Gmail</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* OPÇÃO B — GERENTE / VENDEDOR / CAIXA */}
                <button
                  type="button"
                  onClick={() => handleSelectPortal('CASHIER')}
                  className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 hover:border-emerald-400 text-left transition-all hover:scale-[1.02] shadow-xl hover:shadow-emerald-900/20 group cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                        OPÇÃO B
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-200">
                        GERENTE / VENDEDOR / CAIXA
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Terminal de venda (POS), bipagem de códigos de barra, faturação e fecho de caixa.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                    <span>Aprovação Obrigatória do Admin</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Botão de Recuperação de Conta no Menu Inicial */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => handleOpenRecovery()}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors py-2 px-4 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>
                    Esqueceu a palavra-passe ou PIN? <strong className="text-blue-400 underline">Recuperar Conta</strong>
                  </span>
                </button>
              </div>

              {/* Informação sobre o Fluxo de Segurança */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-1.5 text-center">
                <p className="text-slate-300 font-semibold flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" /> Regra Absoluta de Segurança Centralizada
                </p>
                <p className="text-[11px] leading-relaxed">
                  Os códigos de aprovação e pedidos de abertura de caixa são enviados exclusivamente para o email oficial
                  do Administrador Geral (<strong className="text-slate-200">kelssonmoises@gmail.com</strong>).
                </p>
              </div>
            </div>
          )}

          {/* ==================== 2. FORMULÁRIO DE AUTENTICAÇÃO (PASSO 1) ==================== */}
          {(activePortal === 'ADMIN' || activePortal === 'CASHIER') && authStep === 1 && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setActivePortal('SELECT')}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar à seleção de perfil
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold ${
                    activePortal === 'ADMIN' ? 'bg-blue-600 shadow-blue-900/50' : 'bg-emerald-600 shadow-emerald-900/50'
                  } shadow-lg`}
                >
                  {activePortal === 'ADMIN' ? <ShieldCheck className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {activePortal === 'ADMIN' ? 'OPÇÃO A — ADMINISTRADOR GERAL' : 'OPÇÃO B — GERENTE / VENDEDOR / CAIXA'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activePortal === 'ADMIN'
                      ? 'Validação de credenciais e confirmação de segurança'
                      : 'Seleção de empresa, loja e envio do pedido ao Administrador'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitCredentials} className="space-y-4">
                {/* Campos adicionais exclusivos para OPÇÃO B: Empresa, Loja e Função */}
                {activePortal === 'CASHIER' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Empresa */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Empresa Autorizada:
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            value={selectedCompany}
                            readOnly
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Função */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Função Requisitada:
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as Role)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:border-emerald-500 outline-none cursor-pointer"
                          >
                            <option value="cashier">Vendedor / Caixa</option>
                            <option value="store_manager">Gerente de Loja</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Selecção da Loja */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Loja / Ponto de Venda:
                      </label>
                      <div className="relative">
                        <StoreIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          value={selectedStoreId}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:border-emerald-500 outline-none cursor-pointer"
                        >
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} — {s.city} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Identificador (Email, Nome ou Telefone) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {activePortal === 'ADMIN' ? 'Email do Administrador Geral ou Telefone:' : 'Nome do Operador, Gmail ou Telefone:'}
                  </label>
                  <div className="relative">
                    {activePortal === 'ADMIN' ? (
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    ) : (
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    )}
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={activePortal === 'ADMIN' ? 'kelssonmoises@gmail.com' : 'Ex: Amélia Cossa ou +258 84 100 2000'}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-blue-500 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Palavra-passe ou PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {activePortal === 'ADMIN' ? 'Palavra-passe de Administrador:' : 'Palavra-passe ou PIN de Caixa:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenRecovery(identifier)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-blue-500 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    activePortal === 'ADMIN'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                  } ${loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'}`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>A validar no servidor...</span>
                    </>
                  ) : (
                    <>
                      <span>{activePortal === 'ADMIN' ? 'Autenticar & Enviar Código OTP' : 'Submeter Pedido ao Administrador Geral'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ==================== 3. PASSO 2: CÓDIGO / APROVAÇÃO PENDENTE (LOGIN) ==================== */}
          {(activePortal === 'ADMIN' || activePortal === 'CASHIER') && authStep === 2 && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in duration-200">
              <button
                type="button"
                onClick={resetForm}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Cancelar e voltar ao início
              </button>

              {/* Cabeçalho do Passo 2 */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold ${
                    activePortal === 'ADMIN' ? 'bg-blue-600' : 'bg-amber-600'
                  } shadow-lg`}
                >
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {activePortal === 'ADMIN' ? 'Confirmação OTP do Administrador' : 'Aguardando Aprovação do Administrador'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activePortal === 'ADMIN'
                      ? 'Introduza o código de 6 dígitos recebido no seu Gmail'
                      : 'O pedido foi encaminhado diretamente ao Administrador Geral'}
                  </p>
                </div>
              </div>

              {/* Banner Informativo do Pedido */}
              <div className="mb-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    {activePortal === 'ADMIN' ? 'Destinatário Oficial:' : 'Código Enviado Exclusivamente ao Administrador:'}
                  </span>
                  <span className="font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>
                    Gmail do Administrador: <strong className="text-white font-mono">{requestAdminMaskedEmail}</strong>
                  </p>
                  {activePortal === 'CASHIER' && (
                    <>
                      <p>
                        Operador: <strong className="text-white">{pendingUserName}</strong> • Loja:{' '}
                        <strong className="text-emerald-400">{pendingStoreName}</strong>
                      </p>
                      {activeRequestId && (
                        <p>
                          ID do Pedido: <strong className="font-mono text-blue-400">#{activeRequestId}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {activePortal === 'CASHIER' && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-emerald-400 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Deteção em tempo real: Se o Administrador aprovar no painel dele, o acesso abre automaticamente.</span>
                  </div>
                )}
              </div>

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Formulário de Inserção do Código */}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {activePortal === 'ADMIN'
                      ? 'Introduza o Código de 6 Dígitos do seu Gmail:'
                      : 'Introduza o Código de 6 Dígitos Fornecido pelo Administrador:'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 849201"
                      autoFocus
                      className="w-full py-3 px-4 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-blue-500 text-center font-mono text-2xl tracking-[10px] text-white placeholder-slate-700 outline-none transition-colors"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    activePortal === 'ADMIN'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                  } ${loading || otpCode.length !== 6 ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'}`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando código no servidor...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Validar Código e Iniciar Sessão</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ==================== 4. RECUPERAÇÃO DE CONTA (PASSO 1 & 2) ==================== */}
          {activePortal === 'RECOVERY' && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActivePortal('SELECT');
                }}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar ao ecrã inicial
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-900/40">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Recuperação Segura de Conta</h3>
                  <p className="text-xs text-slate-400">
                    Redefina a sua palavra-passe e PIN através de verificação OTP
                  </p>
                </div>
              </div>

              {/* Informação sobre Segurança */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1 mb-5">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Confirmação Centralizada de Segurança
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Por norma de auditoria, o código de 6 dígitos para redefinição é enviado para o email oficial
                  do Administrador Geral (<strong className="text-white font-mono">{requestAdminMaskedEmail}</strong>).
                </p>
              </div>

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* PASSO 1 DA RECUPERAÇÃO: IDENTIFICADOR */}
              {recoveryStep === 1 && (
                <form onSubmit={handleRequestRecovery} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Identificador da Conta (Email, Telefone ou Nome):
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={recoveryIdentifier}
                        onChange={(e) => setRecoveryIdentifier(e.target.value)}
                        placeholder="Ex: kelssonmoises@gmail.com ou Amélia Cossa"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 ${
                      loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A localizar conta & gerar código...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Enviar Código de Recuperação</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* PASSO 2 DA RECUPERAÇÃO: CÓDIGO + NOVA PALAVRA-PASSE */}
              {recoveryStep === 2 && (
                <form onSubmit={handleConfirmRecovery} className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Conta a Redefinir:</span>
                      <span className="text-white font-semibold">{recoveryUserNotice || recoveryIdentifier}</span>
                    </div>
                    <span className="font-mono text-amber-400 text-xs flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5" /> {minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Código de Recuperação (6 Dígitos):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 582914"
                      required
                      autoFocus
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-center font-mono text-xl tracking-[6px] text-white placeholder-slate-700 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Nova Palavra-passe:
                      </label>
                      <input
                        type="password"
                        value={recoveryNewPassword}
                        onChange={(e) => setRecoveryNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        required
                        className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Confirmar Palavra-passe:
                      </label>
                      <input
                        type="password"
                        value={recoveryConfirmPassword}
                        onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                        placeholder="Repita a palavra-passe"
                        required
                        className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Novo PIN de Caixa (Opcional - 4 Dígitos):
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={recoveryNewPin}
                      onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 1234"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || recoveryCode.length !== 6 || !recoveryNewPassword}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 ${
                      loading || recoveryCode.length !== 6 || !recoveryNewPassword ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A redefinir credenciais...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Validar Código e Redefinir Palavra-passe</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-slate-800/80 text-center text-xs text-slate-400 bg-slate-950/80 backdrop-blur z-10">
        <p className="font-mono text-[11px]">
          PDV-MZ • Sl Vendas Moçambique • Todos os Direitos Reservados • Moeda Oficial: Metical (MZN)
        </p>
      </footer>
    </div>
  );
};
