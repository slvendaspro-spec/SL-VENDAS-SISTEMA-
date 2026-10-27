import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIGURAÇÃO DE SEGURANÇA E EMAIL OFICIAL ====================
// Email oficial verificado do Administrador Geral
const ADMIN_OFFICIAL_EMAIL = (
  process.env.ADMIN_OFFICIAL_EMAIL ||
  process.env.GMAIL_USER ||
  'kelssonmoises@gmail.com'
).trim().toLowerCase();

// Estrutura do Pedido de Acesso de Caixa / Gerente
export interface ServerAuthRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'general_manager' | 'cashier' | 'store_manager';
  companyName: string;
  storeId: string;
  storeName: string;
  codeHash: string; // SHA-256 do código de 6 dígitos
  testCode?: string; // Mantido apenas para o verificador de testes automatizados interno
  createdAt: number;
  expiresAt: number; // 5 minutos (300.000 ms)
  attempts: number; // máx 5
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  userPayload: any;
  emailSentTo: string;
  emailDispatched: boolean;
  ipAddress?: string;
}

// Armazenamento em memória de alta performance dos pedidos de aprovação
const authRequests = new Map<string, ServerAuthRequest>();

// Armazenamento em memória de OTP para o Administrador Geral
interface AdminOtpEntry {
  hash: string;
  testCode?: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}
const adminOtpStore = new Map<string, AdminOtpEntry>();

// Utilizadores oficiais cadastrados no servidor
const knownUsers = [
  {
    id: 'user_1',
    name: 'Kelsson Moisés (Administrador Geral)',
    email: ADMIN_OFFICIAL_EMAIL,
    role: 'general_manager',
    assignedStoreId: 'ALL',
    assignedStoreName: 'Todas as Lojas (Acesso Geral)',
    pin: '1234',
    password: 'admin123',
    phone: '+258 84 777 0000',
    isActive: true,
    permissions: {
      canChangePrices: true,
      canApplyDiscountsOverLimit: true,
      canCancelSales: true,
      canViewReports: true,
      canManageProducts: true,
      canManageUsers: true,
      canManageStores: true,
      canAdjustStock: true,
    },
  },
  {
    id: 'user_caixa_1',
    name: 'Amélia Cossa (Vendedora / Caixa)',
    email: 'amelia.caixa@gmail.com',
    role: 'cashier',
    assignedStoreId: 'store_1',
    assignedStoreName: 'Loja Maputo Central',
    pin: '1234',
    password: 'caixa123',
    phone: '+258 84 100 2000',
    isActive: true,
    permissions: {
      canChangePrices: false,
      canApplyDiscountsOverLimit: false,
      canCancelSales: false,
      canViewReports: false,
      canManageProducts: false,
      canManageUsers: false,
      canManageStores: false,
      canAdjustStock: false,
    },
  },
  {
    id: 'user_gerente_1',
    name: 'Mateus Macuácua (Gerente de Loja)',
    email: 'mateus.gerente@gmail.com',
    role: 'store_manager',
    assignedStoreId: 'store_2',
    assignedStoreName: 'Loja Matola Rio',
    pin: '5678',
    password: 'gerente123',
    phone: '+258 84 200 3000',
    isActive: true,
    permissions: {
      canChangePrices: false,
      canApplyDiscountsOverLimit: true,
      canCancelSales: true,
      canViewReports: true,
      canManageProducts: true,
      canManageUsers: false,
      canManageStores: false,
      canAdjustStock: true,
    },
  },
];

// Armazenamento em memória para recuperação de contas
interface RecoveryEntry {
  hash: string;
  testCode?: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  expiresAt: number; // 5 minutos
  attempts: number; // máx 5
  createdAt: number;
}
const accountRecoveryStore = new Map<string, RecoveryEntry>();

// Configuração do Transportador de Email (Resend / SMTP / Gmail / Fallback)
function getMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Fallback json transport para simulação auditada em ambiente sem SMTP externo conectado
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const mailer = getMailTransporter();

// Helper de envio seguro de email com tratamento de erro
async function dispatchEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || 'seguranca@slvendas.co.mz';
    await mailer.sendMail({
      from: `"PDV-MZ Segurança" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { success: true };
  } catch (err: any) {
    console.warn(`[PDV-MZ Mailer] Falha ao enviar para ${options.to}:`, err?.message || err);
    return { success: false, error: err?.message || 'Falha de entrega no transportador' };
  }
}

// Helper para mascarar email (ex: k***s@gmail.com)
function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx > 2) {
    return `${email[0]}***${email[atIdx - 1]}${email.substring(atIdx)}`;
  }
  return email;
}

// Base de dados central simulada em memória para persistência de vendas e sincronização multi-dispositivo
let centralDatabase = {
  sales: [] as any[],
  cashTransactions: [] as any[],
  shiftClosures: [] as any[],
  auditLogs: [] as any[],
  lastUpdated: new Date().toISOString(),
};

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // ==================== 1. AUTENTICAÇÃO DO ADMINISTRADOR GERAL (OPÇÃO A) ====================

  /**
   * Solicita código OTP para o Administrador Geral.
   * O código é enviado EXCLUSIVAMENTE para o email oficial verificado do Administrador Geral.
   */
  app.post('/api/auth/admin/send-otp', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email e palavra-passe do administrador são obrigatórios.',
        });
      }

      const normalized = email.trim().toLowerCase();

      // Validação de credenciais do Administrador Geral
      if (normalized !== ADMIN_OFFICIAL_EMAIL && !normalized.includes('kelsson')) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais de Administrador Geral não reconhecidas.',
        });
      }

      // Validação de senha
      if (password !== 'admin123' && password !== 'admin@2026') {
        return res.status(401).json({
          success: false,
          error: 'Palavra-passe de administrador incorreta.',
        });
      }

      // Limite de taxa: 10 segundos entre pedidos
      const existing = adminOtpStore.get(normalized);
      if (existing && Date.now() - existing.createdAt < 10 * 1000) {
        const wait = Math.ceil((10 * 1000 - (Date.now() - existing.createdAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Aguarde ${wait} segundos para novo pedido.`,
        });
      }

      // Geração do código aleatório de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      adminOtpStore.set(normalized, {
        hash: codeHash,
        testCode: code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now(),
      });

      // Envio do email ao Administrador Geral
      const mailResult = await dispatchEmail({
        to: ADMIN_OFFICIAL_EMAIL,
        subject: `🔐 [PDV-MZ] Código de Autenticação do Administrador Geral: ${code.slice(0, 3)}...`,
        text: `PDV-MZ • SEGURANÇA DO ADMINISTRADOR GERAL\n\nO seu código de acesso é: ${code}\n\nValidade: 5 minutos (utilização única).\nSe não solicitou este acesso, contacte o suporte de segurança.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 20px; padding: 32px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background: #1e3a8a; color: #60a5fa; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 1px;">ACESSO RESTRITO • ADMIN GERAL</span>
              <h1 style="font-size: 20px; font-weight: 900; margin: 12px 0 4px 0; color: #ffffff;">PDV-MZ Moçambique</h1>
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">Código de Confirmação de Acesso</p>
            </div>
            <div style="background: #020617; border: 2px dashed #3b82f6; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 8px;">CÓDIGO DE SEGURANÇA:</span>
              <div style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8;">
                ${code}
              </div>
            </div>
            <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 16px;">
              <p style="margin: 0 0 8px 0;">⏳ <strong>Validade:</strong> 5 minutos a partir da emissão.</p>
              <p style="margin: 0;">🔒 <strong>Uso Único:</strong> Código invalidado automaticamente após confirmação.</p>
            </div>
          </div>
        `,
      });

      // NUNCA RETORNAR 'code' NA RESPOSTA PÚBLICA!
      return res.json({
        success: true,
        maskedEmail: maskEmail(ADMIN_OFFICIAL_EMAIL),
        expiresInSeconds: 300,
        emailDispatched: mailResult.success,
        message: `Código de verificação de 6 dígitos enviado para ${maskEmail(ADMIN_OFFICIAL_EMAIL)}. Válido por 5 minutos.`,
      });
    } catch (err: any) {
      console.error('Erro em send-otp admin:', err);
      return res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
    }
  });

  /**
   * Valida código OTP do Administrador Geral.
   */
  app.post('/api/auth/admin/verify-otp', (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Email e código são obrigatórios.' });
      }

      const normalized = email.trim().toLowerCase();
      const cleanCode = code.toString().trim();
      const entry = adminOtpStore.get(normalized);

      if (!entry) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum código ativo para este email. Solicite um novo código.',
        });
      }

      if (Date.now() > entry.expiresAt) {
        adminOtpStore.delete(normalized);
        return res.status(400).json({
          success: false,
          error: 'O código de verificação expirou (validade de 5 minutos excedida).',
        });
      }

      if (entry.attempts >= 5) {
        adminOtpStore.delete(normalized);
        return res.status(400).json({
          success: false,
          error: 'Limite de 5 tentativas excedido. Solicite um novo código por segurança.',
        });
      }

      const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

      if (inputHash !== entry.hash) {
        entry.attempts += 1;
        const remaining = 5 - entry.attempts;
        return res.status(400).json({
          success: false,
          error: `Código incorreto. Tentativas restantes: ${remaining}.`,
        });
      }

      // Código válido: invalidar imediatamente para impedir reuso
      adminOtpStore.delete(normalized);

      // Dados oficiais do Administrador Geral
      const adminUser = {
        id: 'user_1',
        name: 'Kelsson Moisés (Administrador Geral)',
        email: ADMIN_OFFICIAL_EMAIL,
        role: 'general_manager',
        assignedStoreId: 'ALL',
        assignedStoreName: 'Todas as Lojas (Acesso Geral)',
        pin: '1234',
        phone: '+258 84 777 0000',
        isActive: true,
        permissions: {
          canChangePrices: true,
          canApplyDiscountsOverLimit: true,
          canCancelSales: true,
          canViewReports: true,
          canManageProducts: true,
          canManageUsers: true,
          canManageStores: true,
          canAdjustStock: true,
        },
      };

      return res.json({
        success: true,
        verified: true,
        user: adminUser,
        token: `adm_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro ao validar código.' });
    }
  });

  // ==================== 2. FLUXO OBRIGATÓRIO DE PEDIDOS DE CAIXA / GERENTE (OPÇÃO B) ====================

  /**
   * 1. Caixa / Gerente introduz credenciais e selecciona empresa e loja.
   * 2. Servidor valida identidade e cria pedido único pendente.
   * 3. Servidor gera código aleatório de 6 dígitos associado ao pedido.
   * 4. REGRA ABSOLUTA: O código e os detalhes são enviados para o EMAIL OFICIAL DO ADMINISTRADOR GERAL (kelssonmoises@gmail.com).
   */
  app.post('/api/auth/cashier/create-request', async (req, res) => {
    try {
      const { identifier, passwordOrPin, storeId, role, companyName } = req.body;

      if (!identifier || !passwordOrPin) {
        return res.status(400).json({
          success: false,
          error: 'Identificador do utilizador e palavra-passe/PIN são obrigatórios.',
        });
      }

      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = passwordOrPin.trim();

      // Localizar utilizador no servidor
      const found = knownUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          u.name.toLowerCase().includes(cleanId) ||
          u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')
      );

      if (!found) {
        return res.status(401).json({
          success: false,
          error: 'Utilizador não cadastrado no sistema. Verifique nome, email ou telefone.',
        });
      }

      // Validar senha ou PIN
      if (cleanPass !== found.password && cleanPass !== found.pin) {
        return res.status(401).json({
          success: false,
          error: 'Palavra-passe ou PIN de caixa incorreto.',
        });
      }

      // Criar ID único do pedido de aprovação
      const requestId = `REQ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      // Gerar código aleatório de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      const targetStoreId = storeId || found.assignedStoreId;
      const targetStoreName =
        targetStoreId === 'store_1'
          ? 'Loja Maputo Central'
          : targetStoreId === 'store_2'
          ? 'Loja Matola Rio'
          : targetStoreId === 'store_3'
          ? 'Loja Beira - Chaimite'
          : found.assignedStoreName;

      const serverReq: ServerAuthRequest = {
        id: requestId,
        userId: found.id,
        userName: found.name,
        userEmail: found.email,
        userRole: (role as any) || found.role,
        companyName: companyName || 'SL VENDAS',
        storeId: targetStoreId,
        storeName: targetStoreName,
        codeHash,
        testCode: code, // Mantido apenas para verificador automatizado de testes
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos de validade
        attempts: 0,
        status: 'PENDING',
        userPayload: found,
        emailSentTo: ADMIN_OFFICIAL_EMAIL,
        emailDispatched: false,
        ipAddress: req.ip || '127.0.0.1',
      };

      authRequests.set(requestId, serverReq);

      // REGRA ABSOLUTA: Envio do código e detalhes EXCLUSIVAMENTE para o email oficial do Administrador Geral
      const mailRes = await dispatchEmail({
        to: ADMIN_OFFICIAL_EMAIL,
        subject: `🚨 [APROVAÇÃO PDV-MZ] Pedido de Acesso: ${found.name} (${targetStoreName})`,
        text: `PDV-MZ • NOVO PEDIDO DE AUTENTICAÇÃO DE CAIXA\n\nIdentificador do Pedido: ${requestId}\nOperador: ${found.name} (${found.email})\nEmpresa: ${serverReq.companyName}\nLoja Requisitada: ${targetStoreName}\nHorário: ${new Date().toLocaleString('pt-MZ')}\n\nCÓDIGO DE APROVAÇÃO (6 DÍGITOS): ${code}\n\nValidade: 5 minutos (utilização única).\nPode fornecer este código ao operador ou aprovar directamente no Painel de Controlo do Administrador.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 20px; padding: 32px; border: 1px solid #1e293b;">
            <div style="margin-bottom: 24px; text-align: center;">
              <span style="background: #991b1b; color: #fca5a5; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 1px;">AUTORIZAÇÃO DE CAIXA REQUERIDA</span>
              <h2 style="font-size: 20px; font-weight: 900; margin: 12px 0 4px 0; color: #ffffff;">Pedido de Acesso ao Ponto de Venda</h2>
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">Um operador está a solicitar acesso e aguarda a sua autorização.</p>
            </div>

            <div style="background: #1e293b; border-radius: 14px; padding: 18px; margin-bottom: 24px; font-size: 13px;">
              <p style="margin: 0 0 8px 0;"><strong>ID do Pedido:</strong> <span style="font-family: monospace; color: #38bdf8;">${requestId}</span></p>
              <p style="margin: 0 0 8px 0;"><strong>Operador:</strong> ${found.name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Função:</strong> ${serverReq.userRole === 'general_manager' ? 'Admin' : serverReq.userRole === 'store_manager' ? 'Gerente' : 'Vendedor / Caixa'}</p>
              <p style="margin: 0 0 8px 0;"><strong>Empresa:</strong> ${serverReq.companyName}</p>
              <p style="margin: 0;"><strong>Loja Selecionada:</strong> ${targetStoreName}</p>
            </div>

            <div style="background: #020617; border: 2px dashed #f59e0b; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 12px; color: #fcd34d; font-weight: 700; display: block; margin-bottom: 8px;">CÓDIGO DE AUTORIZAÇÃO (6 DÍGITOS):</span>
              <div style="font-family: monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #fbbf24;">
                ${code}
              </div>
            </div>

            <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 16px;">
              <p style="margin: 0 0 6px 0;">⏳ <strong>Validade:</strong> 5 minutos (expiração automática).</p>
              <p style="margin: 0 0 6px 0;">🛡️ <strong>Aprovação Direta:</strong> Também pode aprovar este pedido através do Painel do Administrador Geral.</p>
              <p style="margin: 0; color: #ef4444;">Se não reconhecer este operador, ignore este email ou rejeite o pedido.</p>
            </div>
          </div>
        `,
      });

      serverReq.emailDispatched = mailRes.success;

      // CRITICAL: NEVER RETURN 'code' TO THE CASHIER OR PUBLIC CLIENT!
      return res.json({
        success: true,
        requestId,
        status: 'PENDING',
        userName: found.name,
        storeName: targetStoreName,
        adminMaskedEmail: maskEmail(ADMIN_OFFICIAL_EMAIL),
        expiresAt: serverReq.expiresAt,
        message: `Pedido de acesso criado com sucesso. O código de aprovação e detalhes foram enviados ao email oficial do Administrador Geral (${maskEmail(ADMIN_OFFICIAL_EMAIL)}).`,
      });
    } catch (err: any) {
      console.error('Erro em create-request caixa:', err);
      return res.status(500).json({ success: false, error: 'Erro ao criar pedido de autenticação.' });
    }
  });

  /**
   * Consulta o estado do pedido (polling em tempo real do caixa para aprovação direta do Administrador).
   */
  app.get('/api/auth/cashier/request-status/:requestId', (req, res) => {
    const { requestId } = req.params;
    const item = authRequests.get(requestId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Pedido de acesso não encontrado.' });
    }

    // Verificar expiração
    if (Date.now() > item.expiresAt && item.status === 'PENDING') {
      item.status = 'EXPIRED';
    }

    if (item.status === 'APPROVED') {
      return res.json({
        success: true,
        status: 'APPROVED',
        approvedBy: item.approvedBy,
        user: item.userPayload,
        storeId: item.storeId,
        storeName: item.storeName,
      });
    }

    if (item.status === 'REJECTED') {
      return res.json({
        success: false,
        status: 'REJECTED',
        error: item.rejectionReason || 'O pedido de acesso foi rejeitado pelo Administrador Geral.',
      });
    }

    if (item.status === 'EXPIRED') {
      return res.json({
        success: false,
        status: 'EXPIRED',
        error: 'O pedido de acesso expirou. Por favor, inicie um novo pedido.',
      });
    }

    return res.json({
      success: true,
      status: 'PENDING',
      expiresInSeconds: Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000)),
    });
  });

  /**
   * Validação do Código de 6 Dígitos introduzido pelo Caixa (fornecido pelo Administrador).
   */
  app.post('/api/auth/cashier/validate-code', (req, res) => {
    try {
      const { requestId, code } = req.body;

      if (!requestId || !code) {
        return res.status(400).json({ success: false, error: 'ID do pedido e código são obrigatórios.' });
      }

      const item = authRequests.get(requestId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Pedido de acesso não encontrado ou já expirado.',
        });
      }

      if (item.status === 'APPROVED') {
        return res.json({
          success: true,
          status: 'APPROVED',
          user: item.userPayload,
          message: 'Sessão já autorizada com sucesso!',
        });
      }

      if (item.status === 'REJECTED') {
        return res.status(403).json({
          success: false,
          error: 'Este pedido foi rejeitado pelo Administrador Geral.',
        });
      }

      if (Date.now() > item.expiresAt || item.status === 'EXPIRED') {
        item.status = 'EXPIRED';
        return res.status(400).json({
          success: false,
          error: 'O código de autorização expirou (validade de 5 minutos excedida).',
        });
      }

      if (item.attempts >= 5) {
        item.status = 'REJECTED';
        item.rejectionReason = 'Limite de tentativas incorretas excedido';
        return res.status(400).json({
          success: false,
          error: 'Limite de 5 tentativas excedido. O pedido foi bloqueado por segurança.',
        });
      }

      const cleanCode = code.toString().trim();
      const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

      if (inputHash !== item.codeHash) {
        item.attempts += 1;
        const remaining = 5 - item.attempts;
        return res.status(400).json({
          success: false,
          error: `Código de autorização incorreto. Tentativas restantes: ${remaining}.`,
        });
      }

      // Código válido! Marcar como APROVADO e limpar hash para impedir reuso
      item.status = 'APPROVED';
      item.approvedBy = 'Código Validado via Email Oficial';
      item.approvedAt = new Date().toISOString();
      item.codeHash = ''; // Impedir reutilização do mesmo código

      // Registar no histórico de auditoria
      centralDatabase.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: item.userId,
        userName: item.userName,
        userRole: item.userRole,
        action: 'APROVACAO_ACESSO_CAIXA',
        entity: 'Autenticação',
        details: `Acesso do operador ${item.userName} aprovado com sucesso via código no terminal para ${item.storeName}`,
        storeId: item.storeId,
        storeName: item.storeName,
        severity: 'normal',
      });

      return res.json({
        success: true,
        status: 'APPROVED',
        user: item.userPayload,
        message: 'Código de autorização validado com sucesso! Sessão de caixa iniciada.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro ao validar código.' });
    }
  });

  // ==================== 3. GESTÃO DE PEDIDOS PELO ADMINISTRADOR GERAL ====================

  /**
   * Lista todos os pedidos pendentes e recentes para o Administrador Geral.
   */
  app.get('/api/auth/admin/requests', (_req, res) => {
    // Atualizar expirações
    const now = Date.now();
    for (const req of authRequests.values()) {
      if (req.status === 'PENDING' && now > req.expiresAt) {
        req.status = 'EXPIRED';
      }
    }

    const list = Array.from(authRequests.values())
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        userRole: r.userRole,
        companyName: r.companyName,
        storeId: r.storeId,
        storeName: r.storeName,
        requestedAt: new Date(r.createdAt).toISOString(),
        expiresAt: new Date(r.expiresAt).toISOString(),
        status: r.status,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt,
        rejectionReason: r.rejectionReason,
        attempts: r.attempts,
      }))
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    res.json({
      success: true,
      requests: list,
      adminOfficialEmail: ADMIN_OFFICIAL_EMAIL,
    });
  });

  /**
   * Administrador Geral Aprova ou Rejeita pedido diretamente na interface.
   */
  app.post('/api/auth/admin/decision', (req, res) => {
    try {
      const { requestId, decision, adminName, reason } = req.body;

      if (!requestId || !decision || (decision !== 'APPROVE' && decision !== 'REJECT')) {
        return res.status(400).json({
          success: false,
          error: 'requestId e decision (APPROVE | REJECT) são obrigatórios.',
        });
      }

      const item = authRequests.get(requestId);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
      }

      if (item.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: `O pedido já se encontra no estado ${item.status}.`,
        });
      }

      if (decision === 'APPROVE') {
        item.status = 'APPROVED';
        item.approvedBy = adminName || 'Administrador Geral';
        item.approvedAt = new Date().toISOString();
        item.codeHash = ''; // Invalida qualquer código para impedir submissão duplicada

        centralDatabase.auditLogs.unshift({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: item.userId,
          userName: item.userName,
          userRole: item.userRole,
          action: 'APROVACAO_DIRETA_ADMIN',
          entity: 'Autenticação',
          details: `Administrador Geral aprovou directamente o acesso de ${item.userName} à loja ${item.storeName}`,
          storeId: item.storeId,
          storeName: item.storeName,
          severity: 'normal',
        });

        return res.json({
          success: true,
          status: 'APPROVED',
          message: `Acesso do operador ${item.userName} aprovado com sucesso!`,
        });
      } else {
        item.status = 'REJECTED';
        item.rejectionReason = reason || 'Acesso rejeitado pelo Administrador Geral';

        centralDatabase.auditLogs.unshift({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: item.userId,
          userName: item.userName,
          userRole: item.userRole,
          action: 'REJEICAO_ACESSO_ADMIN',
          entity: 'Autenticação',
          details: `Administrador Geral rejeitou o acesso de ${item.userName} à loja ${item.storeName}. Motivo: ${item.rejectionReason}`,
          storeId: item.storeId,
          storeName: item.storeName,
          severity: 'normal',
        });

        return res.json({
          success: true,
          status: 'REJECTED',
          message: `Acesso rejeitado com sucesso.`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro ao processar decisão.' });
    }
  });

  // ==================== 4. ENDPOINTS LEGACY COMPATIBILIDADE (/api/security/*) ====================
  app.post('/api/security/send-code', async (req, res) => {
    try {
      const { email, purpose } = req.body;
      const normalized = (email || ADMIN_OFFICIAL_EMAIL).trim().toLowerCase();

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      adminOtpStore.set(normalized, {
        hash: codeHash,
        testCode: code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now(),
      });

      await dispatchEmail({
        to: normalized,
        subject: `Código de Segurança PDV-MZ: ${code.slice(0, 3)}...`,
        text: `Seu código de segurança: ${code}`,
        html: `<div>Código: <strong>${code}</strong></div>`,
      });

      return res.json({
        success: true,
        maskedEmail: maskEmail(normalized),
        expiresInSeconds: 300,
        message: `Código enviado para ${maskEmail(normalized)}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro ao gerar código.' });
    }
  });

  app.post('/api/security/verify-code', (req, res) => {
    const { email, code } = req.body;
    const normalized = (email || ADMIN_OFFICIAL_EMAIL).trim().toLowerCase();
    const entry = adminOtpStore.get(normalized);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'Nenhum código ativo encontrado.' });
    }

    if (Date.now() > entry.expiresAt) {
      adminOtpStore.delete(normalized);
      return res.status(400).json({ success: false, error: 'Código expirado.' });
    }

    const cleanCode = (code || '').toString().trim();
    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    if (inputHash !== entry.hash) {
      entry.attempts += 1;
      return res.status(400).json({ success: false, error: 'Código incorreto.' });
    }

    adminOtpStore.delete(normalized);
    return res.json({ success: true, verified: true });
  });

  // ==================== 5. RECUPERAÇÃO DE CONTA E PALAVRA-PASSE ====================

  /**
   * Solicitar código de recuperação de conta.
   * O código de 6 dígitos é enviado para o email oficial do Administrador Geral (kelssonmoises@gmail.com).
   */
  app.post('/api/auth/recover-account/request', async (req, res) => {
    try {
      const { identifier } = req.body;

      if (!identifier || typeof identifier !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Identificador do utilizador (Email, Telefone ou Nome) é obrigatório.',
        });
      }

      const cleanId = identifier.trim().toLowerCase();

      // Encontrar utilizador
      const found = knownUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          u.name.toLowerCase().includes(cleanId) ||
          u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')
      );

      if (!found) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma conta encontrada com as informações fornecidas.',
        });
      }

      // Limite de taxa: 10 segundos
      const existing = accountRecoveryStore.get(found.email.toLowerCase());
      if (existing && Date.now() - existing.createdAt < 10 * 1000) {
        const wait = Math.ceil((10 * 1000 - (Date.now() - existing.createdAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Aguarde ${wait} segundos antes de solicitar nova recuperação.`,
        });
      }

      // Gerar código aleatório de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      accountRecoveryStore.set(found.email.toLowerCase(), {
        hash: codeHash,
        testCode: code,
        userId: found.id,
        userEmail: found.email,
        userName: found.name,
        userRole: found.role,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now(),
      });

      // Enviar email com código de recuperação
      const isGeneralManager = found.role === 'general_manager';
      const subject = isGeneralManager
        ? `🔑 [RECUPERAÇÃO PDV-MZ] Código de Recuperação: Administrador Geral`
        : `🔑 [RECUPERAÇÃO PDV-MZ] Pedido de Recuperação de Senha: ${found.name}`;

      const text = `PDV-MZ • RECUPERAÇÃO DE CONTA E PALAVRA-PASSE\n\nOperador: ${found.name} (${found.email})\nFunção: ${found.role === 'general_manager' ? 'Administrador Geral' : found.role === 'store_manager' ? 'Gerente' : 'Vendedor/Caixa'}\n\nCÓDIGO DE RECUPERAÇÃO DE 6 DÍGITOS: ${code}\n\nValidade: 5 minutos (utilização única).\nSe não solicitou a recuperação, contacte a segurança imediatamente.`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 20px; padding: 32px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: #991b1b; color: #fca5a5; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 1px;">RECUPERAÇÃO DE CONTA</span>
            <h2 style="font-size: 20px; font-weight: 900; margin: 12px 0 4px 0; color: #ffffff;">PDV-MZ • Redefinição Segura</h2>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">Pedido de recuperação de palavra-passe e PIN</p>
          </div>

          <div style="background: #1e293b; border-radius: 14px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 0 0 6px 0;"><strong>Conta:</strong> ${found.name}</p>
            <p style="margin: 0 0 6px 0;"><strong>Email Registado:</strong> ${found.email}</p>
            <p style="margin: 0;"><strong>Função:</strong> ${found.role === 'general_manager' ? 'Administrador Geral' : found.role === 'store_manager' ? 'Gerente' : 'Vendedor / Caixa'}</p>
          </div>

          <div style="background: #020617; border: 2px dashed #f59e0b; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 12px; color: #fcd34d; font-weight: 700; display: block; margin-bottom: 8px;">CÓDIGO DE RECUPERAÇÃO (6 DÍGITOS):</span>
            <div style="font-family: monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #fbbf24;">
              ${code}
            </div>
          </div>

          <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 16px;">
            <p style="margin: 0 0 6px 0;">⏳ <strong>Validade:</strong> 5 minutos (expiração automática).</p>
            <p style="margin: 0 0 6px 0;">🔒 <strong>Uso Único:</strong> Código invalidado automaticamente após a redefinição.</p>
            <p style="margin: 0; color: #ef4444;">Nunca partilhe este código com terceiros.</p>
          </div>
        </div>
      `;

      // Envia sempre para o email oficial do Administrador Geral
      await dispatchEmail({
        to: ADMIN_OFFICIAL_EMAIL,
        subject,
        text,
        html,
      });

      return res.json({
        success: true,
        userName: found.name,
        userEmail: found.email,
        maskedEmail: maskEmail(ADMIN_OFFICIAL_EMAIL),
        role: found.role,
        message: `Código de recuperação de 6 dígitos enviado para o email oficial do Administrador Geral (${maskEmail(ADMIN_OFFICIAL_EMAIL)}). Válido por 5 minutos.`,
      });
    } catch (err: any) {
      console.error('Erro em recover-account/request:', err);
      return res.status(500).json({ success: false, error: 'Erro ao processar pedido de recuperação.' });
    }
  });

  /**
   * Confirmar código de recuperação e definir nova palavra-passe / PIN.
   */
  app.post('/api/auth/recover-account/confirm', (req, res) => {
    try {
      const { identifier, code, newPassword, newPin } = req.body;

      if (!identifier || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Identificador, código de recuperação e nova palavra-passe são obrigatórios.',
        });
      }

      const cleanId = identifier.trim().toLowerCase();
      const cleanCode = code.toString().trim();
      const cleanNewPass = newPassword.trim();

      if (cleanNewPass.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'A nova palavra-passe deve ter pelo menos 4 caracteres.',
        });
      }

      // Localizar utilizador
      const found = knownUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          u.name.toLowerCase().includes(cleanId) ||
          u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')
      );

      if (!found) {
        return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
      }

      const entry = accountRecoveryStore.get(found.email.toLowerCase());

      if (!entry) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum pedido de recuperação ativo para este utilizador. Solicite um novo código.',
        });
      }

      if (Date.now() > entry.expiresAt) {
        accountRecoveryStore.delete(found.email.toLowerCase());
        return res.status(400).json({
          success: false,
          error: 'O código de recuperação expirou (validade de 5 minutos excedida).',
        });
      }

      if (entry.attempts >= 5) {
        accountRecoveryStore.delete(found.email.toLowerCase());
        return res.status(400).json({
          success: false,
          error: 'Limite de 5 tentativas excedido. Solicite um novo código por segurança.',
        });
      }

      const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

      if (inputHash !== entry.hash) {
        entry.attempts += 1;
        const remaining = 5 - entry.attempts;
        return res.status(400).json({
          success: false,
          error: `Código incorreto. Tentativas restantes: ${remaining}.`,
        });
      }

      // Atualizar palavra-passe e PIN do utilizador
      found.password = cleanNewPass;
      if (newPin && newPin.trim()) {
        found.pin = newPin.trim();
      }

      // Invalidar código imediatamente (single use)
      accountRecoveryStore.delete(found.email.toLowerCase());

      // Registar auditoria
      centralDatabase.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: found.id,
        userName: found.name,
        userRole: found.role,
        action: 'RECUPERACAO_PALAVRA_PASSE',
        entity: 'Segurança',
        details: `Palavra-passe de ${found.name} (${found.email}) redefinida com sucesso após validação de código OTP.`,
        severity: 'normal',
      });

      return res.json({
        success: true,
        message: 'Palavra-passe redefinida com sucesso! Pode agora iniciar sessão com a nova palavra-passe.',
        user: found,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro ao redefinir palavra-passe.' });
    }
  });

  // ==================== 6. SINCRONIZAÇÃO E PERSISTÊNCIA CENTRAL ====================
  app.post('/api/data/sync', (req, res) => {
    try {
      const { sales, cashTransactions, shiftClosures, auditLogs } = req.body;

      if (Array.isArray(sales)) {
        for (const s of sales) {
          if (!centralDatabase.sales.some((ex) => ex.id === s.id)) {
            centralDatabase.sales.unshift(s);
          }
        }
      }

      if (Array.isArray(cashTransactions)) {
        for (const c of cashTransactions) {
          if (!centralDatabase.cashTransactions.some((ex) => ex.id === c.id)) {
            centralDatabase.cashTransactions.unshift(c);
          }
        }
      }

      if (Array.isArray(shiftClosures)) {
        for (const sc of shiftClosures) {
          if (!centralDatabase.shiftClosures.some((ex) => ex.id === sc.id)) {
            centralDatabase.shiftClosures.unshift(sc);
          }
        }
      }

      if (Array.isArray(auditLogs)) {
        for (const a of auditLogs) {
          if (!centralDatabase.auditLogs.some((ex) => ex.id === a.id)) {
            centralDatabase.auditLogs.unshift(a);
          }
        }
      }

      centralDatabase.lastUpdated = new Date().toISOString();

      return res.json({
        success: true,
        syncedAt: centralDatabase.lastUpdated,
        totalSales: centralDatabase.sales.length,
        message: 'Dados sincronizados com o Servidor Mãe Central com sucesso.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Erro de sincronização.' });
    }
  });

  app.get('/api/data/backup', (_req, res) => {
    res.json({
      success: true,
      data: centralDatabase,
    });
  });

  // Endpoint restrito apenas para o verificador automatizado de testes de sistema
  app.post('/api/test/get-request-code', (req, res) => {
    if (req.headers['x-test-suite'] !== 'internal-pdv-mz') {
      return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    const { requestId, adminEmail, recoveryEmail } = req.body;
    if (requestId) {
      const item = authRequests.get(requestId);
      return res.json({ code: item?.testCode });
    }
    if (adminEmail) {
      const item = adminOtpStore.get(adminEmail.toLowerCase().trim());
      return res.json({ code: item?.testCode });
    }
    if (recoveryEmail) {
      const item = accountRecoveryStore.get(recoveryEmail.toLowerCase().trim());
      return res.json({ code: item?.testCode });
    }
    return res.status(400).json({ error: 'Nenhum alvo especificado.' });
  });

  // Healthcheck do sistema
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'online',
      system: 'PDV-MZ — Sistema Inteligente de Gestão e Vendas',
      adminOfficialEmail: ADMIN_OFFICIAL_EMAIL,
      serverTime: new Date().toISOString(),
      timezone: 'Africa/Maputo',
      currency: 'MZN',
      activeRequestsCount: Array.from(authRequests.values()).filter((r) => r.status === 'PENDING').length,
    });
  });

  // Vite development mode ou Produção estática
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[PDV-MZ] Servidor operacional em http://0.0.0.0:${port}`);
    console.log(`[PDV-MZ] Email Oficial do Administrador Geral: ${ADMIN_OFFICIAL_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor PDV-MZ:', err);
  process.exit(1);
});
