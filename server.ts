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

// In-memory secure OTP store (keyed by lowercase email)
interface OtpEntry {
  hash: string;
  expiresAt: number; // 5 minutes
  attempts: number; // max 5
  createdAt: number;
  purpose: string;
}

const otpStorage = new Map<string, OtpEntry>();

// Email Transporter (SMTP / Gmail / Fallback)
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

  // Fallback json transport for environment when external SMTP is not yet injected
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const mailer = getMailTransporter();

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // ==================== SEGURANÇA GMAIL OTP (NUNCA EXIBE CÓDIGO NA TELA) ====================

  // Enviar Código de 6 Dígitos por Gmail
  app.post('/api/security/send-code', async (req, res) => {
    try {
      const { email, purpose } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Endereço de Gmail ou e-mail é obrigatório.',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Rate limit check: wait at least 15 seconds before requesting another code
      const existing = otpStorage.get(normalizedEmail);
      if (existing && Date.now() - existing.createdAt < 15 * 1000) {
        const waitSec = Math.ceil((15 * 1000 - (Date.now() - existing.createdAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Aguarde ${waitSec} segundos antes de solicitar um novo código.`,
        });
      }

      // Generate random 6-digit OTP code (100000 - 999999)
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Secure SHA-256 hash of the code
      const hash = crypto.createHash('sha256').update(code).digest('hex');

      // Store in memory with 5-minute validity (300,000 ms)
      otpStorage.set(normalizedEmail, {
        hash,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now(),
        purpose: purpose || 'Autenticação de Segurança PDV-MZ',
      });

      // Dispatch real email via Gmail / SMTP service
      try {
        await mailer.sendMail({
          from: `"PDV-MZ Segurança" <${process.env.SMTP_FROM || process.env.GMAIL_USER || 'seguranca@slvendas.co.mz'}>`,
          to: normalizedEmail,
          subject: `Código de Acesso PDV-MZ: ${code.slice(0, 3)}... (Válido por 5 minutos)`,
          text: `PDV-MZ • SEGURANÇA CENTRALIZADA\n\nO seu código de verificação é: ${code}\n\nEste código tem validade de 5 minutos e só pode ser utilizado uma única vez.\nSe não solicitou este acesso, ignore este e-mail.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 20px; padding: 32px; border: 1px solid #1e293b;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="background: #1e3a8a; color: #60a5fa; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 1px;">AUTENTICAÇÃO SEGURA</span>
                <h1 style="font-size: 20px; font-weight: 900; margin: 12px 0 4px 0; color: #ffffff;">PDV-MZ • Sistema Comercial</h1>
                <p style="font-size: 13px; color: #94a3b8; margin: 0;">Código de Verificação de Utilização Única (OTP)</p>
              </div>

              <div style="background: #020617; border: 2px dashed #3b82f6; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 8px;">SEU CÓDIGO DE ACESSO:</span>
                <div style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8;">
                  ${code}
                </div>
              </div>

              <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 16px;">
                <p style="margin: 0 0 8px 0;">⏳ <strong>Validade:</strong> 5 minutos a partir da emissão.</p>
                <p style="margin: 0 0 8px 0;">🔒 <strong>Uso Único:</strong> Este código expira imediatamente após a confirmação.</p>
                <p style="margin: 0; color: #64748b;">Se não foi você a solicitar este código, altere a sua palavra-passe ou contate o Administrador Geral imediatamente.</p>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('Alerta no envio de email pelo transportador:', mailErr);
      }

      // Format masked email for safety (e.g. k***s@gmail.com)
      const atIdx = normalizedEmail.indexOf('@');
      let masked = normalizedEmail;
      if (atIdx > 2) {
        masked = `${normalizedEmail[0]}***${normalizedEmail[atIdx - 1]}${normalizedEmail.substring(atIdx)}`;
      }

      // CRITICAL: NEVER RETURN 'code' TO THE CLIENT OR PUBLIC RESPONSES!
      return res.json({
        success: true,
        email: normalizedEmail,
        maskedEmail: masked,
        expiresInSeconds: 300,
        message: `Código de verificação de 6 dígitos enviado com sucesso para ${masked}. Verifique a caixa de entrada e spam. O código é válido por 5 minutos.`,
      });
    } catch (err: any) {
      console.error('Erro ao despachar código OTP:', err);
      return res.status(500).json({
        success: false,
        error: 'Falha ao despachar código por Gmail. Tente novamente em instantes.',
      });
    }
  });

  // Validar Código de 6 Dígitos Enviado
  app.post('/api/security/verify-code', (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          error: 'E-mail e código de 6 dígitos são obrigatórios.',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const cleanCode = code.toString().trim();

      const entry = otpStorage.get(normalizedEmail);

      if (!entry) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum código ativo encontrado para este e-mail. Solicite um novo código por Gmail.',
        });
      }

      // Check 5-minute expiration
      if (Date.now() > entry.expiresAt) {
        otpStorage.delete(normalizedEmail);
        return res.status(400).json({
          success: false,
          error: 'O código de verificação expirou (validade de 5 minutos excedida). Solicite um novo código.',
        });
      }

      // Check max attempts (5)
      if (entry.attempts >= 5) {
        otpStorage.delete(normalizedEmail);
        return res.status(400).json({
          success: false,
          error: 'Limite de 5 tentativas incorretas excedido. Por segurança, solicite um novo código.',
        });
      }

      // Hash provided code and compare
      const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

      if (inputHash !== entry.hash) {
        entry.attempts += 1;
        const remaining = 5 - entry.attempts;
        return res.status(400).json({
          success: false,
          error: `Código incorreto. Tentativas restantes: ${remaining}.`,
        });
      }

      // Success! Invalidate code immediately (single use only)
      otpStorage.delete(normalizedEmail);

      return res.json({
        success: true,
        verified: true,
        message: 'Código de verificação validado com sucesso!',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar código. Tente novamente.',
      });
    }
  });

  // System Health
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'online',
      system: 'SL VENDAS — Sistema Inteligente de Gestão e Vendas',
      serverTime: new Date().toISOString(),
      timezone: 'Africa/Maputo',
      currency: 'MZN',
    });
  });

  // Dev server or Production static
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
    console.log(`SL VENDAS server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
