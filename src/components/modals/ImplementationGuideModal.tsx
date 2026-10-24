import React, { useState } from 'react';
import {
  HelpCircle,
  Database,
  UserPlus,
  Store as StoreIcon,
  Smartphone,
  Bell,
  Globe,
  HardDriveDownload,
  CheckCircle,
  Copy,
  Check,
  X,
  Upload,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ImplementationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImplementationGuideModal: React.FC<ImplementationGuideModalProps> = ({ isOpen, onClose }) => {
  const { exportBackup, restoreBackup, resetToDefaultData } = useStore();
  const [activeStep, setActiveStep] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = restoreBackup(content);
        setRestoreSuccess(ok);
        setTimeout(() => setRestoreSuccess(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const steps = [
    {
      num: 1,
      title: 'Configurar a Base de Dados Central',
      icon: Database,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            O sistema <strong>SL VENDAS</strong> utiliza uma arquitetura unificada de dados.
            Atualmente, as transações estão sincronizadas com armazenamento seguro no navegador e no backend Node/Express.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-white block">Para conectar ao Cloud Firestore ou Cloud SQL em produção:</span>
            <p className="text-slate-400">
              1. Acesse o console do Google Firebase ou Cloud SQL.
              <br />
              2. Defina as coleções: <code className="text-emerald-400">stores</code>, <code className="text-emerald-400">products</code>, <code className="text-emerald-400">sales</code>, <code className="text-emerald-400">users</code>, <code className="text-emerald-400">devices</code>.
              <br />
              3. Configure as regras de segurança no arquivo <code className="text-emerald-400">firestore.rules</code> para isolar vendedores por filial.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: 'Criar o Primeiro Gestor Geral',
      icon: UserPlus,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            O Gestor Geral possui acesso irrestrito a todas as lojas, relatórios de lucro, auditoria e permissões.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              • Já existe uma conta de Gestor Geral pré-configurada: <strong>kelssonmoises@gmail.com</strong> (PIN padrão: <code className="text-emerald-400">1234</code>).
              <br />
              • A autenticação por 2FA (Código de E-mail) pode ser acionada a qualquer momento na aba de Segurança.
              <br />
              • Você pode criar gestores adicionais na aba <em>Usuários & Permissões</em>.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: 'Adicionar a Primeira Loja Física',
      icon: StoreIcon,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            Cada filial opera com seu próprio estoque, número NUIT e registros de venda.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              1. Acesse a aba <strong>Lojas & Unidades</strong>.
              <br />
              2. Clique no botão <strong>Nova Loja</strong>.
              <br />
              3. Preencha o nome (ex: <em>Loja Maputo Central</em>), código (ex: <em>LOJA-01</em>), endereço, cidade e NUIT fiscal.
              <br />
              4. A nova loja ficará imediatamente disponível para vincular vendedores e receber vendas.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 4,
      title: 'Criar Contas de Vendedores e Caixas',
      icon: UserPlus,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            Os vendedores possuem interface azul própria e têm seus acessos restritos <strong>apenas à loja atribuída</strong>.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              • Vendedores <strong>não</strong> podem visualizar lucros gerais, custos de aquisição ou dados de outras cidades.
              <br />
              • Cada operador possui um PIN rápido de 4 dígitos para troca de turno sem fechar o navegador.
              <br />
              • Para testar, use o menu superior e alterne entre <em>Kelsson Moisés (Gestor)</em> e <em>Amélia Cossa (Vendedora Maputo)</em>.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 5,
      title: 'Ligar e Autorizar Outros Dispositivos',
      icon: Smartphone,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            O sistema é híbrido e responsivo para Android, tablets e computadores.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              1. Abra o link da aplicação no navegador Chrome ou Safari do celular/tablet do vendedor.
              <br />
              2. O aparelho registrará um token de dispositivo na aba <strong>Dispositivos Autorizados</strong>.
              <br />
              3. O Gestor Geral pode aprovar o dispositivo ou revogar o acesso imediatamente em caso de perda ou furto.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 6,
      title: 'Configurar as Notificações em Tempo Real',
      icon: Bell,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            O Gestor Geral recebe avisos instantâneos para cada movimentação relevante na rede de lojas:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              ✓ Cada venda concluída por um vendedor.
              <br />
              ✓ Estoque baixo ou produto esgotado.
              <br />
              ✓ Tentativas de acesso com falha ou desconto aplicado acima do limite.
              <br />
              ✓ Cancelamentos ou estornos de vendas.
              <br />
              ✓ Notificações internas ativas com registro real do estado de envio.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 7,
      title: 'Publicar a Aplicação Online',
      icon: Globe,
      content: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            O aplicativo já conta com servidor full-stack (Express + Vite + Gemini AI) pronto para deploy:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400">
              • Execução em contêiner Docker / Google Cloud Run / Render / VPS.
              <br />
              • Comando de build: <code className="text-emerald-400">npm run build</code>
              <br />
              • Comando de início: <code className="text-emerald-400">npm start</code>
              <br />
              • Pode ser adicionado à tela inicial no Android como PWA Web App.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 8,
      title: 'Fazer Cópia de Segurança & Recuperação (Backup)',
      icon: HardDriveDownload,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            Nunca perca o histórico financeiro da sua empresa. Faça downloads periódicos do backup em JSON:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold text-white block">Download do Banco de Dados Completo:</span>
              <span className="text-[11px] text-slate-400">Inclui lojas, produtos, estoques, vendas e auditorias</span>
            </div>
            <button
              onClick={exportBackup}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>Baixar Backup JSON</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold text-white block">Restaurar a Partir de Ficheiro JSON:</span>
              <span className="text-[11px] text-slate-400">Carrega dados previamente salvos</span>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Importar Arquivo</span>
              <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
            </label>
          </div>

          {restoreSuccess === true && (
            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Backup restaurado com sucesso!</span>
            </div>
          )}

          {restoreSuccess === false && (
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Ficheiro de backup inválido ou corrompido.</span>
            </div>
          )}

          <div className="pt-2 text-right">
            <button
              onClick={() => {
                if (confirm('Tem certeza? Isso restaurará os dados para o estado inicial de demonstração.')) {
                  resetToDefaultData();
                  onClose();
                }
              }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Redefinir Dados para Padrão de Demonstração
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Instruções de Implantação & Gestão de Backups
              </h2>
              <p className="text-xs text-slate-400">Guia passo a passo obrigatório para operação real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 shrink-0 scrollbar-none border-b border-slate-800/60">
          {steps.map((st) => (
            <button
              key={st.num}
              onClick={() => setActiveStep(st.num)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeStep === st.num
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{st.num}.</span>
              <span>{st.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {steps.map((st) => {
            if (st.num !== activeStep) return null;
            const Icon = st.icon;

            return (
              <div key={st.num} className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Passo {st.num} de 8
                    </span>
                    <h3 className="text-base font-bold text-white">{st.title}</h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  {st.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs shrink-0 mt-3">
          <button
            onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
            disabled={activeStep === 1}
            className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-40"
          >
            Anterior
          </button>

          <span className="text-slate-500 font-mono">
            {activeStep} de {steps.length}
          </span>

          <button
            onClick={() => {
              if (activeStep < steps.length) {
                setActiveStep((p) => p + 1);
              } else {
                onClose();
              }
            }}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            {activeStep === steps.length ? 'Concluir' : 'Próximo Passo'}
          </button>
        </div>
      </div>
    </div>
  );
};
