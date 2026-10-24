import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side Gemini client using modern @google/genai SDK
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Assistant endpoint: answers questions & analyzes live store data
  app.post('/api/ai/query', async (req, res) => {
    try {
      const { prompt, storeContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Pergunta não informada' });
      }

      const systemInstruction = `Você é o "SL Inteligência", assistente comercial e analítico de alto nível do sistema SL VENDAS (Moçambique - Moeda: Metical MZN, Fuso: África/Maputo).
Você analisa dados reais de lojas, produtos, estoques, vendas e despesas do sistema.
Regras fundamentais:
1. NUNCA invente números, produtos ou vendas que não existam no contexto recebido.
2. Seja claro, conciso, profissional e estratégico.
3. Se o gestor perguntar sobre estoque crítico, lucros, vendedores ou lojas, forneça dados precisos com valores em MZN e quantidades exatas.
4. Dê recomendações acionáveis (ex: reabastecer itens abaixo do mínimo, recompensar vendedores destacados, investigar produtos com margem baixa).
5. Responda em Português limpo e bem formatado com tópicos.`;

      const contents = `DADOS REAIS DO SISTEMA SL VENDAS:
${JSON.stringify(storeContext || {}, null, 2)}

SOLICITAÇÃO DO GESTOR GERAL:
${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      return res.json({ success: true, text: response.text });
    } catch (err: any) {
      console.error('Erro na rota Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Erro ao processar análise inteligente no servidor.',
      });
    }
  });

  // Security Email Code dispatch endpoint (simulates real email notification & returns confirmation)
  app.post('/api/security/send-code', (req, res) => {
    try {
      const { email, purpose } = req.body;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      return res.json({
        success: true,
        email: email || 'gestor@slvendas.co.mz',
        code,
        expiresAt,
        purpose: purpose || 'Confirmação de Segurança 2FA',
        sentAt: new Date().toISOString(),
        message: `Código de verificação 2FA gerado e despachado para ${email || 'o endereço cadastrado'}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
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
