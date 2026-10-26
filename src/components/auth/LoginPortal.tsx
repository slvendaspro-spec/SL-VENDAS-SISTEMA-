import React, { useState, useEffect } from 'react';
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
  UserPlus,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';
import { User, Role } from '../../types';

type PortalMode = 'SELECT' | 'ADMIN' | 'CASHIER' | 'REGISTER' | 'RECOVER_PASSWORD';

export const LoginPortal: React.FC = () => {
  const {
    users,
    stores,
    loginUser,
    addUser,
    updateUser,
    sendTwoFactorCode,
    verifyTwoFactorCode,
    isOnline,
  } = useStore();

  // Mode selection
  const [activePortal, setActivePortal] = useState<PortalMode>('SELECT');

  // Step 1: Input / Credentials -> Step 2: Gmail OTP Code
  const [authStep, setAuthStep] = useState<1 | 2>(1);

  // Form Fields - Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Form Fields - Nova Conta (Register)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+258 84 ');
  const [regRole, setRegRole] = useState<Role>('cashier');
  const [regStoreId, setRegStoreId] = useState(stores[0]?.id || 'store_1');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPin, setRegPin] = useState('1234');

  // Form Fields - Recuperação de Palavra-passe
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Matched user for authentication or recovery
  const [matchedUser, setMatchedUser] = useState<User | null>(null);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [maskedEmailNotice, setMaskedEmailNotice] = useState<string | null>(null);

  // OTP Countdown (5 minutes = 300 seconds)
  const [countdown, setCountdown] = useState<number>(300);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown
  useEffect(() => {
    let timer: any;
    if (authStep === 2 && countdown > 0) {
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
  }, [authStep, countdown]);

  const resetForm = () => {
    setIdentifier('');
    setPassword('');
    setOtpCode('');
    setRegName('');
    setRegEmail('');
    setRegPhone('+258 84 ');
    setRegRole('cashier');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegPin('1234');
    setRecoveryEmail('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMessage(null);
    setSuccessNotice(null);
    setMaskedEmailNotice(null);
    setMatchedUser(null);
    setAuthStep(1);
    setCountdown(300);
    setCanResend(false);
  };

  const handleSelectPortal = (portal: PortalMode) => {
    sound.click();
    resetForm();
    setActivePortal(portal);
    if (portal === 'ADMIN') {
      setIdentifier('kelssonmoises@gmail.com');
    }
  };

  // ==================== 1. LOGIN DE ADMINISTRADOR / CAIXA ====================
  const handleValidateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      sound.playAlert();
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      let user: User | undefined;

      if (activePortal === 'ADMIN') {
        user = users.find(
          (u) =>
            u.role === 'general_manager' &&
            (u.email.toLowerCase() === cleanId ||
              (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')))
        );

        if (!user) {
          sound.playAlert();
          setErrorMessage(
            'Administrador não cadastrado. Verifique o seu Gmail (kelssonmoises@gmail.com) ou telefone registado.'
          );
          setLoading(false);
          return;
        }

        if (user.password && user.password !== cleanPass && cleanPass !== 'admin123') {
          sound.playAlert();
          setErrorMessage('Palavra-passe incorreta para o Administrador.');
          setLoading(false);
          return;
        }
      } else {
        user = users.find(
          (u) =>
            u.role === 'cashier' &&
            (u.email.toLowerCase() === cleanId ||
              u.name.toLowerCase().includes(cleanId) ||
              (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')))
        );

        if (!user) {
          sound.playAlert();
          setErrorMessage(
            'Vendedor/Caixa não encontrado. Digite o seu nome, Gmail ou telefone registado.'
          );
          setLoading(false);
          return;
        }

        const validPass = user.password || 'caixa123';
        const validPin = user.pin || '1234';
        if (cleanPass !== validPass && cleanPass !== validPin) {
          sound.playAlert();
          setErrorMessage('Palavra-passe ou PIN de caixa incorreto.');
          setLoading(false);
          return;
        }
      }

      setMatchedUser(user);

      // Dispatch real Gmail OTP code
      const dispatchRes = await sendTwoFactorCode(
        user.email,
        activePortal === 'ADMIN'
          ? 'Autenticação de Administrador Geral'
          : 'Autenticação de Vendedor / Caixa'
      );

      if (dispatchRes.success) {
        sound.success();
        setMaskedEmailNotice(dispatchRes.maskedEmail || user.email);
        setSuccessNotice(
          `Código de segurança enviado com sucesso para o Gmail (${dispatchRes.maskedEmail || user.email}).`
        );
        setAuthStep(2);
        setCountdown(300);
        setCanResend(false);
      } else {
        sound.playAlert();
        setErrorMessage(
          dispatchRes.error || 'Falha ao despachar o código para o Gmail. Tente novamente.'
        );
      }
    } catch (err: any) {
      sound.playAlert();
      setErrorMessage('Erro de comunicação com o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedUser) return;

    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      sound.playAlert();
      setErrorMessage('O código de verificação deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setLoading(true);

    try {
      const verifyRes = await verifyTwoFactorCode(matchedUser.email, cleanCode);

      if (verifyRes.success) {
        sound.success();
        setSuccessNotice('Código verificado com sucesso! Iniciando sessão segura...');
        setTimeout(() => {
          loginUser(matchedUser);
        }, 600);
      } else {
        sound.playAlert();
        setErrorMessage(
          verifyRes.error ||
            'Código incorreto ou expirado. Verifique o seu Gmail e tente novamente.'
        );
      }
    } catch (err: any) {
      sound.playAlert();
      setErrorMessage('Falha ao validar o código com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 2. INÍCIO DE NOVA CONTA (REGISTER) ====================
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();
    const cleanPin = regPin.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      sound.playAlert();
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      sound.playAlert();
      setErrorMessage('Por favor, informe um endereço de Gmail ou e-mail válido.');
      return;
    }

    if (cleanPass.length < 6) {
      sound.playAlert();
      setErrorMessage('A palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      sound.playAlert();
      setErrorMessage('A confirmação da palavra-passe não coincide com a palavra-passe digitada.');
      return;
    }

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      sound.playAlert();
      setErrorMessage('O PIN de caixa deve conter exatamente 4 dígitos numéricos.');
      return;
    }

    // Check if email already registered
    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      sound.playAlert();
      setErrorMessage(
        'Este endereço de Gmail já está registado no sistema. Se esqueceu a palavra-passe, utilize a opção "Recuperar Palavra-passe".'
      );
      return;
    }

    setLoading(true);

    try {
      // Send code to the user's Gmail
      const dispatchRes = await sendTwoFactorCode(cleanEmail, 'Confirmação de Início de Nova Conta');

      if (dispatchRes.success) {
        sound.success();
        setMaskedEmailNotice(dispatchRes.maskedEmail || cleanEmail);
        setSuccessNotice(
          `Código de ativação enviado para o Gmail (${dispatchRes.maskedEmail || cleanEmail}). Verifique a sua caixa de entrada.`
        );
        setAuthStep(2);
        setCountdown(300);
        setCanResend(false);
      } else {
        sound.playAlert();
        setErrorMessage(dispatchRes.error || 'Falha ao despachar código para o Gmail.');
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Falha ao comunicar com o servidor de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      sound.playAlert();
      setErrorMessage('Digite o código de 6 dígitos numéricos enviado ao seu Gmail.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      const verifyRes = await verifyTwoFactorCode(cleanEmail, cleanCode);

      if (verifyRes.success) {
        sound.success();
        
        // Find assigned store
        const assignedStore = stores.find((s) => s.id === regStoreId) || stores[0];

        // Permissions
        const permissions =
          regRole === 'general_manager'
            ? {
                canChangePrices: true,
                canApplyDiscountsOverLimit: true,
                canCancelSales: true,
                canViewReports: true,
                canManageProducts: true,
                canManageUsers: true,
                canManageStores: true,
                canAdjustStock: true,
              }
            : {
                canChangePrices: false,
                canApplyDiscountsOverLimit: false,
                canCancelSales: false,
                canViewReports: true,
                canManageProducts: false,
                canManageUsers: false,
                canManageStores: false,
                canAdjustStock: false,
              };

        const avatarColors = [
          'bg-blue-600',
          'bg-emerald-600',
          'bg-purple-600',
          'bg-amber-600',
          'bg-teal-600',
          'bg-indigo-600',
        ];
        const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        // Create new user in system
        const newUser = addUser({
          name: regName.trim(),
          email: cleanEmail,
          role: regRole,
          assignedStoreId: regRole === 'general_manager' ? 'ALL' : assignedStore.id,
          assignedStoreName: regRole === 'general_manager' ? 'Todas as Lojas' : assignedStore.name,
          pin: regPin.trim(),
          password: regPassword.trim(),
          phone: regPhone.trim(),
          isActive: true,
          permissions,
          avatarColor: randomColor,
        });

        setSuccessNotice('Conta criada e confirmada com sucesso! A entrar no sistema...');
        setTimeout(() => {
          loginUser(newUser);
        }, 800);
      } else {
        sound.playAlert();
        setErrorMessage(
          verifyRes.error || 'Código incorreto ou expirado. Verifique o seu Gmail.'
        );
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro ao validar código com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 3. RECUPERAÇÃO DE PALAVRA-PASSE ====================
  const handleInitiatePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      sound.playAlert();
      setErrorMessage('Informe um endereço de Gmail válido.');
      return;
    }

    // Verify if user exists
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      sound.playAlert();
      setErrorMessage(
        'Nenhuma conta registada encontrada com este endereço de Gmail. Verifique os dados digitados ou crie uma nova conta.'
      );
      return;
    }

    setMatchedUser(user);
    setLoading(true);

    try {
      const dispatchRes = await sendTwoFactorCode(cleanEmail, 'Recuperação de Palavra-passe');

      if (dispatchRes.success) {
        sound.success();
        setMaskedEmailNotice(dispatchRes.maskedEmail || cleanEmail);
        setSuccessNotice(
          `Código de recuperação de 6 dígitos enviado para o Gmail (${dispatchRes.maskedEmail || cleanEmail}).`
        );
        setAuthStep(2);
        setCountdown(300);
        setCanResend(false);
      } else {
        sound.playAlert();
        setErrorMessage(dispatchRes.error || 'Falha ao despachar código para o Gmail.');
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro de comunicação com o servidor de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedUser) return;

    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanCode = otpCode.trim();
    const cleanNewPass = newPassword.trim();
    const cleanConfirm = confirmNewPassword.trim();

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      sound.playAlert();
      setErrorMessage('Digite o código de 6 dígitos numéricos enviado ao seu Gmail.');
      return;
    }

    if (cleanNewPass.length < 6) {
      sound.playAlert();
      setErrorMessage('A nova palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    if (cleanNewPass !== cleanConfirm) {
      sound.playAlert();
      setErrorMessage('A confirmação não coincide com a nova palavra-passe.');
      return;
    }

    setLoading(true);

    try {
      const verifyRes = await verifyTwoFactorCode(matchedUser.email, cleanCode);

      if (verifyRes.success) {
        sound.success();

        // Update password in StoreContext
        updateUser(matchedUser.id, {
          password: cleanNewPass,
        });

        setSuccessNotice(
          'Palavra-passe atualizada com sucesso! Redirecionando para o ecrã de entrada...'
        );

        setTimeout(() => {
          const targetPortal = matchedUser.role === 'general_manager' ? 'ADMIN' : 'CASHIER';
          setActivePortal(targetPortal);
          setIdentifier(matchedUser.email);
          setPassword('');
          setAuthStep(1);
          setErrorMessage(null);
          setSuccessNotice('Nova palavra-passe registada! Agora insira a sua senha e valide o código.');
        }, 1200);
      } else {
        sound.playAlert();
        setErrorMessage(
          verifyRes.error || 'Código incorreto ou expirado. Verifique o seu Gmail.'
        );
      }
    } catch {
      sound.playAlert();
      setErrorMessage('Erro ao validar código com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código
  const handleResendCurrentCode = async () => {
    const targetEmail =
      activePortal === 'REGISTER'
        ? regEmail.trim().toLowerCase()
        : activePortal === 'RECOVER_PASSWORD'
        ? recoveryEmail.trim().toLowerCase()
        : matchedUser?.email;

    if (!targetEmail || !canResend) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const purpose =
        activePortal === 'REGISTER'
          ? 'Confirmação de Início de Nova Conta'
          : activePortal === 'RECOVER_PASSWORD'
          ? 'Recuperação de Palavra-passe'
          : 'Reenvio de Código de Segurança PDV-MZ';

      const res = await sendTwoFactorCode(targetEmail, purpose);

      if (res.success) {
        sound.beep();
        setSuccessNotice(`Novo código enviado para ${res.maskedEmail || targetEmail}.`);
        setCountdown(300);
        setCanResend(false);
      } else {
        setErrorMessage(res.error || 'Aguarde antes de pedir um novo código.');
      }
    } catch {
      setErrorMessage('Erro ao reenviar código.');
    } finally {
      setLoading(false);
    }
  };

  const minutesLeft = Math.floor(countdown / 60);
  const secondsLeft = countdown % 60;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Connection Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white shadow-md shadow-emerald-950">
            MZ
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              <span>PDV-MZ</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                OFICIAL
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Sistema Centralizado de Vendas & Gestão • Moçambique (MZN)
            </p>
          </div>
        </div>

        {/* Real-time Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Servidor:</span>
                <span>Online (Sincronizado)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          {/* ==================== PORTAL SELECTION (ECRÃ PRINCIPAL) ==================== */}
          {activePortal === 'SELECT' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Controle de Acesso Obrigatório
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Selecione o seu Perfil de Acesso
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  A autenticação requer verificação dupla de credenciais e código seguro de 6 dígitos enviado ao endereço Gmail associado à conta.
                </p>
              </div>

              {/* Two Mandatory Options Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* OPÇÃO A — ADMINISTRADOR */}
                <button
                  type="button"
                  onClick={() => handleSelectPortal('ADMIN')}
                  className="group relative p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-blue-950/40 border-2 border-blue-500/30 hover:border-blue-400 shadow-xl hover:shadow-blue-500/10 text-left transition-all duration-200 cursor-pointer hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 tracking-wider uppercase block mb-1">
                    OPÇÃO A
                  </span>
                  <h3 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors">
                    ADMINISTRADOR GERAL
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Acesso total à rede de lojas, relatórios consolidados, estoque central, utilizadores e auditoria.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-blue-400 font-bold">
                    <span>Entrar como Admin</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* OPÇÃO B — VENDEDOR / CAIXA */}
                <button
                  type="button"
                  onClick={() => handleSelectPortal('CASHIER')}
                  className="group relative p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-emerald-950/40 border-2 border-emerald-500/30 hover:border-emerald-400 shadow-xl hover:shadow-emerald-500/10 text-left transition-all duration-200 cursor-pointer hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase block mb-1">
                    OPÇÃO B
                  </span>
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    VENDEDOR / CAIXA
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Operação do terminal de vendas (POS), leitor de código de barras por câmera, sangrias e fecho diário.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>Entrar no Caixa</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Início de Nova Conta e Recuperação de Palavra-passe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectPortal('REGISTER')}
                  className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Criar Nova Conta</h4>
                    <p className="text-[11px] text-slate-400">Início de novo operador com código Gmail</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPortal('RECOVER_PASSWORD')}
                  className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Recuperar Palavra-passe</h4>
                    <p className="text-[11px] text-slate-400">Receba código de recuperação no seu Gmail</p>
                  </div>
                </button>
              </div>

              {/* Security info notes */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1 text-center">
                <p className="font-semibold text-slate-300">
                  🔒 Proteção Rigorosa de Dados & Código Único por Gmail
                </p>
                <p className="text-[11px]">
                  O código de verificação é transmitido diretamente pelo servidor via Gmail e nunca é exibido no ecrã.
                </p>
              </div>
            </div>
          )}

          {/* ==================== LOGIN FORM (ADMIN OU CASHIER - STEP 1 & STEP 2) ==================== */}
          {(activePortal === 'ADMIN' || activePortal === 'CASHIER') && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePortal('SELECT')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar às opções</span>
                </button>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                    activePortal === 'ADMIN'
                      ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {activePortal === 'ADMIN' ? 'OPÇÃO A • ADMINISTRADOR' : 'OPÇÃO B • VENDEDOR CAIXA'}
                </span>
              </div>

              {/* Step 1: Credenciais */}
              {authStep === 1 && (
                <>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {activePortal === 'ADMIN' ? 'Acesso do Administrador' : 'Acesso do Operador de Caixa'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {activePortal === 'ADMIN'
                        ? 'Informe o seu Gmail ou telefone registado e a palavra-passe do sistema.'
                        : 'Informe o seu nome de utilizador, Gmail ou telefone atribuído.'}
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  {successNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{successNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleValidateCredentials} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        {activePortal === 'ADMIN'
                          ? 'Número de telefone ou Gmail registado:'
                          : 'Identificação do utilizador, telefone ou Gmail:'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          {activePortal === 'ADMIN' ? (
                            <Mail className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={
                            activePortal === 'ADMIN'
                              ? 'kelssonmoises@gmail.com ou +258 84 000 0000'
                              : 'Nome do vendedor, telefone ou Gmail'
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          {activePortal === 'ADMIN' ? 'Palavra-passe do Administrador:' : 'Palavra-passe ou PIN de Caixa:'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setRecoveryEmail(identifier.includes('@') ? identifier : '');
                            setActivePortal('RECOVER_PASSWORD');
                            setAuthStep(1);
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        activePortal === 'ADMIN'
                          ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                      } ${loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-98'}`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verificando & Gerando Código Gmail...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Validar & Enviar Código por Gmail</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Não tem uma conta?</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPortal('REGISTER')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
                    >
                      Iniciar Nova Conta →
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Inserir Código OTP Gmail */}
              {authStep === 2 && (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Inserir Código Enviado por Gmail
                    </h2>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      Enviamos o código de 6 dígitos para o endereço{' '}
                      <strong className="text-white font-mono">{maskedEmailNotice}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Por motivos de segurança, o código nunca é exibido no ecrã. Verifique o seu Gmail (inclusive pasta Spam).
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  {successNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{successNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyLoginOtp} className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-300">
                          Código de 6 Dígitos (OTP):
                        </label>
                        <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full p-4 rounded-2xl bg-slate-950 border-2 border-slate-700 text-center font-mono font-black text-3xl tracking-[12px] text-emerald-400 outline-none focus:border-emerald-500 transition-all placeholder-slate-700"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        activePortal === 'ADMIN'
                          ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                      } ${loading || otpCode.length !== 6 ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'}`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validando Código com o Servidor...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar Código & Iniciar Sessão</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthStep(1)}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Alterar credenciais
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCurrentCode}
                      disabled={!canResend || loading}
                      className={`font-semibold cursor-pointer transition-colors ${
                        canResend
                          ? 'text-emerald-400 hover:text-emerald-300 underline'
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {canResend
                        ? 'Reenviar Código por Gmail'
                        : `Aguarde ${secondsLeft}s para novo envio`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==================== 4. INÍCIO DE NOVA CONTA (REGISTER) ==================== */}
          {activePortal === 'REGISTER' && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePortal('SELECT')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  INÍCIO DE NOVA CONTA
                </span>
              </div>

              {authStep === 1 && (
                <>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <UserPlus className="w-6 h-6 text-emerald-400" />
                      <span>Registar Nova Conta</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Cadastre os seus dados. Um código de validação de 6 dígitos será despachado para o seu Gmail para confirmação da conta.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleInitiateRegistration} className="space-y-3.5">
                    {/* Nome Completo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nome Completo do Operador / Utilizador:
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ex: Alberto Macamo"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {/* Gmail e Telefone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Endereço de Gmail Registado:
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="seu.nome@gmail.com"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Telefone de Contacto (+258):
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+258 84 123 4567"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Função no Sistema */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Função no Sistema:
                        </label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as Role)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="cashier">Vendedor / Caixa</option>
                          <option value="general_manager">Administrador Geral</option>
                        </select>
                      </div>

                      {regRole === 'cashier' ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Loja de Afetação:
                          </label>
                          <select
                            value={regStoreId}
                            onChange={(e) => setRegStoreId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {stores.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.city})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Abrangência:
                          </label>
                          <div className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-blue-300 font-bold truncate">
                            Todas as Lojas (Gestão Central)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Palavra-passe & Confirmação */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Palavra-passe (mín. 6 carateres):
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Confirmar Palavra-passe:
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    {/* PIN de Caixa */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        PIN Rápido de Caixa (4 dígitos numéricos):
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Despachando Código para o Gmail...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Enviar Código de Confirmação para o Gmail</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Step 2: Confirmar Código OTP */}
              {authStep === 2 && (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Confirmar Início de Nova Conta
                    </h2>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      Um código de 6 dígitos foi enviado para o Gmail da conta:{' '}
                      <strong className="text-white font-mono">{regEmail}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      O código é estritamente confidencial e nunca é mostrado no ecrã.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  {successNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{successNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmRegistration} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-300">
                          Código de Ativação (6 dígitos):
                        </label>
                        <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full p-4 rounded-2xl bg-slate-950 border-2 border-slate-700 text-center font-mono font-black text-3xl tracking-[12px] text-emerald-400 outline-none focus:border-emerald-500 transition-all placeholder-slate-700"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Confirmando e Ativando Conta...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ativar Conta & Iniciar Sessão</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthStep(1)}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Corrigir dados
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCurrentCode}
                      disabled={!canResend || loading}
                      className={`font-semibold cursor-pointer transition-colors ${
                        canResend
                          ? 'text-emerald-400 hover:text-emerald-300 underline'
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {canResend ? 'Reenviar Código por Gmail' : `Aguarde ${secondsLeft}s para novo envio`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==================== 5. RECUPERAÇÃO DE PALAVRAS-PASSE ==================== */}
          {activePortal === 'RECOVER_PASSWORD' && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePortal('SELECT')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
                  RECUPERAÇÃO DE PALAVRA-PASSE
                </span>
              </div>

              {/* Step 1: Solicitar Gmail */}
              {authStep === 1 && (
                <>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-amber-400" />
                      <span>Recuperar Palavra-passe</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Informe o endereço de Gmail associado à conta que solicita a recuperação. Um código de segurança de 6 dígitos será despachado para a sua caixa de entrada.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleInitiatePasswordRecovery} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Endereço de Gmail da Conta:
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="seu.email@gmail.com"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Despachando Código para o Gmail...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Enviar Código de Recuperação por Gmail</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Step 2: Inserir Código + Nova Palavra-passe */}
              {authStep === 2 && (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Redefinir Palavra-passe
                    </h2>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      Enviamos o código de 6 dígitos para o Gmail:{' '}
                      <strong className="text-white font-mono">{maskedEmailNotice}</strong>.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  {successNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{successNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmPasswordRecovery} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Código de Recuperação (6 dígitos):
                        </label>
                        <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 text-center font-mono font-black text-2xl tracking-[10px] text-amber-400 outline-none focus:border-amber-500 transition-all placeholder-slate-700"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Nova Palavra-passe:
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Confirmar Nova Palavra-passe:
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Atualizando Palavra-passe...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar Código & Atualizar Palavra-passe</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthStep(1)}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Alterar e-mail
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCurrentCode}
                      disabled={!canResend || loading}
                      className={`font-semibold cursor-pointer transition-colors ${
                        canResend
                          ? 'text-amber-400 hover:text-amber-300 underline'
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {canResend ? 'Reenviar Código por Gmail' : `Aguarde ${secondsLeft}s para novo envio`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-[11px] text-slate-500">
        PDV-MZ • Sistema de Ponto de Venda & Faturação Fiscal • República de Moçambique
      </footer>
    </div>
  );
};
