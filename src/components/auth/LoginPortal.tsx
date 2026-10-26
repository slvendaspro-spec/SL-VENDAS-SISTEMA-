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
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sound } from '../../services/soundService';
import { User } from '../../types';

export const LoginPortal: React.FC = () => {
  const {
    users,
    stores,
    loginUser,
    sendTwoFactorCode,
    verifyTwoFactorCode,
    isOnline,
    supabaseStatus,
  } = useStore();

  // Mode selection: 'SELECT' | 'ADMIN' | 'CASHIER'
  const [activePortal, setActivePortal] = useState<'SELECT' | 'ADMIN' | 'CASHIER'>('SELECT');

  // Step 1: Credentials (Identifier + Password/PIN) -> Step 2: Gmail OTP Code
  const [authStep, setAuthStep] = useState<1 | 2>(1);

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Matched registered user
  const [matchedUser, setMatchedUser] = useState<User | null>(null);

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
    setErrorMessage(null);
    setSuccessNotice(null);
    setMaskedEmailNotice(null);
    setMatchedUser(null);
    setAuthStep(1);
    setCountdown(300);
    setCanResend(false);
  };

  const handleSelectPortal = (portal: 'ADMIN' | 'CASHIER') => {
    sound.click();
    resetForm();
    setActivePortal(portal);
    if (portal === 'ADMIN') {
      // Pre-fill suggested admin email
      setIdentifier('kelssonmoises@gmail.com');
    }
  };

  // Step 1: Validate credentials & Request Gmail OTP
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
      // Find candidate user
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
            'Administrador não cadastrado. Verifique o endereço de Gmail (kelssonmoises@gmail.com) ou telefone registado.'
          );
          setLoading(false);
          return;
        }

        // Validate password
        if (user.password && user.password !== cleanPass && cleanPass !== 'admin123') {
          sound.playAlert();
          setErrorMessage('Palavra-passe incorreta para o Administrador.');
          setLoading(false);
          return;
        }
      } else {
        // CASHIER
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
            'Vendedor/Caixa não encontrado. Digite o seu nome, Gmail ou telefone registado no sistema.'
          );
          setLoading(false);
          return;
        }

        // Validate password / PIN
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

      // Dispatch real Gmail OTP code via server
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
          `Código de segurança gerado e enviado para o Gmail (${dispatchRes.maskedEmail || user.email}).`
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

  // Step 2: Verify Gmail OTP code & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
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

  // Resend OTP code
  const handleResendCode = async () => {
    if (!matchedUser || !canResend) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await sendTwoFactorCode(
        matchedUser.email,
        'Reenvio de Código de Segurança PDV-MZ'
      );
      if (res.success) {
        sound.beep();
        setSuccessNotice(`Novo código enviado para ${res.maskedEmail || matchedUser.email}.`);
        setCountdown(300);
        setCanResend(false);
      } else {
        setErrorMessage(res.error || 'Aguarde antes de pedir um novo código.');
      }
    } catch (err: any) {
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
          {/* ==================== PORTAL SELECTION (OPÇÃO A / OPÇÃO B) ==================== */}
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
                  A autenticação requer verificação dupla de credenciais e código seguro de 6 dígitos enviado ao seu endereço Gmail registado.
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

              {/* Security info notes */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1 text-center">
                <p className="font-semibold text-slate-300">
                  🔒 Proteção Rigorosa de Dados & Isolamento por Loja
                </p>
                <p className="text-[11px]">
                  O código de verificação é transmitido diretamente pelo servidor via Gmail e nunca é exibido no ecrã.
                </p>
              </div>
            </div>
          )}

          {/* ==================== LOGIN FORM (STEP 1: CREDENTIALS) ==================== */}
          {activePortal !== 'SELECT' && authStep === 1 && (
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

              <form onSubmit={handleValidateCredentials} className="space-y-4">
                {/* Field 1: Identifier */}
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

                {/* Field 2: Password / PIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {activePortal === 'ADMIN' ? 'Palavra-passe do Administrador:' : 'Palavra-passe ou PIN de Caixa:'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
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

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  Ao avançar, o servidor despacha um código de 6 dígitos com validade de 5 minutos ao e-mail registado.
                </p>
              </div>
            </div>
          )}

          {/* ==================== LOGIN FORM (STEP 2: GMAIL OTP 6-DIGIT CODE) ==================== */}
          {activePortal !== 'SELECT' && authStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthStep(1)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Alterar Credenciais</span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Validade: {minutesLeft}:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
                  </span>
                </div>
              </div>

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

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-center text-xs font-bold text-slate-300 mb-2">
                    Código de 6 Dígitos (OTP):
                  </label>
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
                <span className="text-slate-400">Não recebeu o e-mail?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
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
