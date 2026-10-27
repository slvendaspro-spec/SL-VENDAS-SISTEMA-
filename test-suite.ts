/**
 * PDV-MZ: SUÍTE DE TESTES AUTOMATIZADOS MASTER
 * Verificação e Auditoria de Produção
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(num: number, name: string, passed: boolean, details: string) {
  results.push({ num, name, passed, details });
  const status = passed ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`[TESTE ${num}] ${status}: ${name}`);
  if (!passed || process.env.VERBOSE) {
    console.log(`   Detalhes: ${details}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  INICIANDO SUÍTE DE TESTES AUTOMATIZADOS MASTER — PDV-MZ');
  console.log(`  Alvo do Servidor: ${BASE_URL}`);
  console.log('================================================================\n');

  // Teste 1: Saúde do Servidor e Configuração do Email Oficial
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    const passed = data.status === 'online' && data.adminOfficialEmail.includes('kelssonmoises@gmail.com');
    recordTest(
      1,
      'Verificação do Servidor & Email Oficial do Administrador Geral',
      passed,
      `Status: ${data.status}, Email Admin: ${data.adminOfficialEmail}, Timezone: ${data.timezone}`
    );
  } catch (err: any) {
    recordTest(1, 'Verificação do Servidor & Email Oficial do Administrador Geral', false, err.message);
  }

  // Teste 2: Autenticação do Administrador Geral — Envio de OTP Seguro
  let adminTestCode = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kelssonmoises@gmail.com',
        password: 'admin123',
      }),
    });
    const data = await res.json();
    // CRITICAL SECURITY ASSERTION: 'code' MUST NEVER BE EXPOSED IN RESPONSE
    const isCodeNotExposed = !data.code && !data.otp;
    const isSuccess = data.success === true && data.maskedEmail.includes('@');

    // Recuperar código internamente para validação do teste seguinte
    const codeRes = await fetch(`${BASE_URL}/api/test/get-request-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'internal-pdv-mz',
      },
      body: JSON.stringify({ adminEmail: 'kelssonmoises@gmail.com' }),
    });
    const codeData = await codeRes.json();
    adminTestCode = codeData.code || '';

    recordTest(
      2,
      'Autenticação Admin Geral: Envio de OTP Seguro (Código Oculto)',
      isSuccess && isCodeNotExposed && adminTestCode.length === 6,
      `Sucesso: ${isSuccess}, Código Oculto no Cliente: ${isCodeNotExposed}, Código Gerado: ${adminTestCode ? '6 dígitos numéricos' : 'vazio'}`
    );
  } catch (err: any) {
    recordTest(2, 'Autenticação Admin Geral: Envio de OTP Seguro (Código Oculto)', false, err.message);
  }

  // Teste 3: Validação do OTP do Administrador Geral com Código Correto
  try {
    const res = await fetch(`${BASE_URL}/api/auth/admin/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kelssonmoises@gmail.com',
        code: adminTestCode,
      }),
    });
    const data = await res.json();
    const passed = data.success === true && data.user && data.user.role === 'general_manager';
    recordTest(
      3,
      'Validação de OTP do Administrador Geral & Emissão de Sessão',
      passed,
      `Sessão emitida para: ${data.user?.name} (Role: ${data.user?.role})`
    );
  } catch (err: any) {
    recordTest(3, 'Validação de OTP do Administrador Geral & Emissão de Sessão', false, err.message);
  }

  // Teste 4: Impedimento de Reutilização de Código OTP do Administrador (Single-use)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/admin/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kelssonmoises@gmail.com',
        code: adminTestCode, // Mesmo código já validado
      }),
    });
    const data = await res.json();
    const passed = data.success === false && res.status === 400;
    recordTest(
      4,
      'Bloqueio de Reutilização de Código OTP do Administrador (Uso Único)',
      passed,
      `Tentativa de reutilização rejeitada com status ${res.status}: ${data.error}`
    );
  } catch (err: any) {
    recordTest(4, 'Bloqueio de Reutilização de Código OTP do Administrador (Uso Único)', false, err.message);
  }

  // Teste 5: Criação do Pedido de Acesso de Caixa / Vendedor (Opção B)
  let cashierRequestId = '';
  let cashierTestCode = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/cashier/create-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Amélia Cossa',
        passwordOrPin: 'caixa123',
        storeId: 'store_1',
        role: 'cashier',
        companyName: 'SL VENDAS',
      }),
    });
    const data = await res.json();
    cashierRequestId = data.requestId;

    // REGRA ABSOLUTA: O código NÃO pode ser enviado na resposta do caixa
    const isCodeNotExposed = !data.code && !data.otpCode;
    const isPending = data.status === 'PENDING';
    const isEmailRoutedToAdmin = data.adminMaskedEmail.includes('k***s@gmail.com');

    // Obter código gerado pelo servidor internamente
    const codeRes = await fetch(`${BASE_URL}/api/test/get-request-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'internal-pdv-mz',
      },
      body: JSON.stringify({ requestId: cashierRequestId }),
    });
    const codeData = await codeRes.json();
    cashierTestCode = codeData.code || '';

    const passed = isPending && isCodeNotExposed && isEmailRoutedToAdmin && cashierTestCode.length === 6;
    recordTest(
      5,
      'Regra Absoluta: Pedido de Caixa criado & Código Roteado para kelssonmoises@gmail.com',
      passed,
      `ID: ${cashierRequestId}, Status: ${data.status}, Email Admin: ${data.adminMaskedEmail}, Código Não Exposto ao Caixa: ${isCodeNotExposed}`
    );
  } catch (err: any) {
    recordTest(5, 'Regra Absoluta: Pedido de Caixa criado & Código Roteado para kelssonmoises@gmail.com', false, err.message);
  }

  // Teste 6: Rejeição de Código Incorreto no Terminal de Caixa com Limite de Tentativas
  try {
    const res = await fetch(`${BASE_URL}/api/auth/cashier/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: cashierRequestId,
        code: '000000', // Código errado
      }),
    });
    const data = await res.json();
    const passed = data.success === false && data.error.includes('Código de autorização incorreto');
    recordTest(
      6,
      'Rejeição de Código de Autorização Incorreto & Contagem de Tentativas',
      passed,
      `Erro retornado: ${data.error}`
    );
  } catch (err: any) {
    recordTest(6, 'Rejeição de Código de Autorização Incorreto & Contagem de Tentativas', false, err.message);
  }

  // Teste 7: Validação Bem-Sucedida de Código de Acesso do Caixa
  try {
    const res = await fetch(`${BASE_URL}/api/auth/cashier/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: cashierRequestId,
        code: cashierTestCode,
      }),
    });
    const data = await res.json();
    const passed = data.success === true && data.status === 'APPROVED' && data.user;
    recordTest(
      7,
      'Aprovação de Acesso do Caixa via Código Válido',
      passed,
      `Operador autenticado: ${data.user?.name} na ${data.user?.assignedStoreName}`
    );
  } catch (err: any) {
    recordTest(7, 'Aprovação de Acesso do Caixa via Código Válido', false, err.message);
  }

  // Teste 8: Aprovação Direta do Administrador Geral pelo Painel (Sem necessidade de digitação)
  let directApproveRequestId = '';
  try {
    // 1. Criar novo pedido
    const reqRes = await fetch(`${BASE_URL}/api/auth/cashier/create-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'amelia.caixa@gmail.com',
        passwordOrPin: '1234',
        storeId: 'store_2',
        role: 'cashier',
      }),
    });
    const reqData = await reqRes.json();
    directApproveRequestId = reqData.requestId;

    // 2. Administrador Geral aprova diretamente
    const decRes = await fetch(`${BASE_URL}/api/auth/admin/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: directApproveRequestId,
        decision: 'APPROVE',
        adminName: 'Kelsson Moisés (Administrador Geral)',
      }),
    });
    const decData = await decRes.json();

    // 3. Terminal do caixa deteta aprovação via polling de status
    const statusRes = await fetch(`${BASE_URL}/api/auth/cashier/request-status/${directApproveRequestId}`);
    const statusData = await statusRes.json();

    const passed = decData.status === 'APPROVED' && statusData.status === 'APPROVED' && statusData.user;
    recordTest(
      8,
      'Aprovação Direta pelo Administrador Geral no Painel & Deteção pelo Caixa',
      passed,
      `Decisão Admin: ${decData.status}, Polling do Caixa: ${statusData.status}, Aprovador: ${statusData.approvedBy}`
    );
  } catch (err: any) {
    recordTest(8, 'Aprovação Direta pelo Administrador Geral no Painel & Deteção pelo Caixa', false, err.message);
  }

  // Teste 9: Rejeição Direta de Pedido pelo Administrador Geral
  try {
    // 1. Criar pedido
    const reqRes = await fetch(`${BASE_URL}/api/auth/cashier/create-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'amelia.caixa@gmail.com',
        passwordOrPin: '1234',
        storeId: 'store_3',
        role: 'cashier',
      }),
    });
    const reqData = await reqRes.json();
    const rejectRequestId = reqData.requestId;

    // 2. Administrador rejeita
    const decRes = await fetch(`${BASE_URL}/api/auth/admin/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: rejectRequestId,
        decision: 'REJECT',
        adminName: 'Kelsson Moisés',
        reason: 'Operador não escalado para esta loja hoje',
      }),
    });
    const decData = await decRes.json();

    // 3. Terminal do caixa recebe bloqueio
    const statusRes = await fetch(`${BASE_URL}/api/auth/cashier/request-status/${rejectRequestId}`);
    const statusData = await statusRes.json();

    const passed = decData.status === 'REJECTED' && statusData.status === 'REJECTED';
    recordTest(
      9,
      'Rejeição de Pedido de Acesso pelo Administrador com Motivo Auditado',
      passed,
      `Status: ${statusData.status}, Motivo: ${statusData.error}`
    );
  } catch (err: any) {
    recordTest(9, 'Rejeição de Pedido de Acesso pelo Administrador com Motivo Auditado', false, err.message);
  }

  // Teste 10: Sincronização Central de Vendas & Persistência Multi-dispositivo
  try {
    const testSale = {
      id: `sale_test_${Date.now()}`,
      saleNumber: `VD-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      storeId: 'store_1',
      storeName: 'Loja Maputo Central',
      cashierId: 'user_caixa_1',
      cashierName: 'Amélia Cossa',
      customerName: 'Cliente Teste Automatizado',
      subtotal: 1500,
      discount: 0,
      discountPercent: 0,
      total: 1500,
      totalCost: 1000,
      estimatedProfit: 500,
      paymentMethod: 'M_PESA',
      status: 'COMPLETED',
      isSynced: true,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${BASE_URL}/api/data/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: [testSale] }),
    });
    const data = await res.json();

    // Conferir no backup central
    const backupRes = await fetch(`${BASE_URL}/api/data/backup`);
    const backupData = await backupRes.json();
    const salePersisted = backupData.data?.sales?.some((s: any) => s.id === testSale.id);

    const passed = data.success === true && salePersisted;
    recordTest(
      10,
      'Persistência Central de Vendas & Sincronização Multi-Dispositivo',
      passed,
      `Venda ${testSale.saleNumber} persistida na base central: ${salePersisted}`
    );
  } catch (err: any) {
    recordTest(10, 'Persistência Central de Vendas & Sincronização Multi-Dispositivo', false, err.message);
  }

  // Teste 11: Solicitação de Recuperação de Conta (Código Enviado ao Administrador Geral)
  let recoveryTestCode = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/recover-account/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'Amélia Cossa' }),
    });
    const data = await res.json();
    const isCodeNotExposed = !data.code && !data.otpCode;
    const isEmailRoutedToAdmin = data.maskedEmail.includes('k***s@gmail.com');

    // Recuperar código internamente para o verificador de testes
    const codeRes = await fetch(`${BASE_URL}/api/test/get-request-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'internal-pdv-mz',
      },
      body: JSON.stringify({ recoveryEmail: 'amelia.caixa@gmail.com' }),
    });
    const codeData = await codeRes.json();
    recoveryTestCode = codeData.code || '';

    const passed = data.success === true && isCodeNotExposed && isEmailRoutedToAdmin && recoveryTestCode.length === 6;
    recordTest(
      11,
      'Recuperação de Conta: Pedido Registado & Código Enviado ao Administrador',
      passed,
      `Sucesso: ${data.success}, Destinatário: ${data.maskedEmail}, Código Não Exposto ao Solicitante: ${isCodeNotExposed}`
    );
  } catch (err: any) {
    recordTest(11, 'Recuperação de Conta: Pedido Registado & Código Enviado ao Administrador', false, err.message);
  }

  // Teste 12: Confirmação de Código de Recuperação & Redefinição de Nova Senha
  try {
    const newTestPassword = 'novaSenha@2026';
    const res = await fetch(`${BASE_URL}/api/auth/recover-account/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'amelia.caixa@gmail.com',
        code: recoveryTestCode,
        newPassword: newTestPassword,
        newPin: '9999',
      }),
    });
    const data = await res.json();

    // Validar se o utilizador consegue agora autenticar-se com a nova palavra-passe
    const loginAttempt = await fetch(`${BASE_URL}/api/auth/cashier/create-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'amelia.caixa@gmail.com',
        passwordOrPin: newTestPassword,
        storeId: 'store_1',
      }),
    });
    const loginData = await loginAttempt.json();

    const passed = data.success === true && loginData.success === true;
    recordTest(
      12,
      'Recuperação de Conta: Redefinição de Nova Palavra-passe & Autenticação Confirmada',
      passed,
      `Nova Senha Aceite: ${data.success}, Sessão Autorizada com Nova Senha: ${loginData.success}`
    );
  } catch (err: any) {
    recordTest(12, 'Recuperação de Conta: Redefinição de Nova Palavra-passe & Autenticação Confirmada', false, err.message);
  }

  // Teste 13: Envio de OTP e Alerta em Tempo Real via WhatsApp para +258 87 784 6559
  try {
    const res = await fetch(`${BASE_URL}/api/auth/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kelssonmoises@gmail.com',
        password: 'admin123',
      }),
    });
    const data = await res.json();
    const isSuccess = data.success === true;
    const hasWhatsAppNumber = data.whatsappPhone === '+258 87 784 6559';
    const hasDirectLink = typeof data.whatsappDirectUrl === 'string' && data.whatsappDirectUrl.includes('258877846559');
    const isCodeNotExposed = !data.code && !data.otp;

    const passed = isSuccess && hasWhatsAppNumber && hasDirectLink && isCodeNotExposed;
    recordTest(
      13,
      'Envio de OTP e Alerta em Tempo Real via WhatsApp (+258 87 784 6559)',
      passed,
      `WhatsApp: ${data.whatsappPhone}, Link Direto Gerado: ${hasDirectLink ? 'Sim (wa.me/258877846559)' : 'Não'}, Código Protegido: ${isCodeNotExposed}`
    );
  } catch (err: any) {
    recordTest(13, 'Envio de OTP e Alerta em Tempo Real via WhatsApp (+258 87 784 6559)', false, err.message);
  }

  // Relatório Final dos Testes
  console.log('\n================================================================');
  console.log('              RESUMO EXECUTIVO DOS TESTES REALIZADOS            ');
  console.log('================================================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total de Testes Executados: ${total}`);
  console.log(`Testes Aprovados:          ${passedCount} / ${total} (${Math.round((passedCount / total) * 100)}%)`);
  console.log(`Testes Reprovados:         ${failedCount}`);

  if (failedCount === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO!');
    process.exit(0);
  } else {
    console.log('\n⚠️ ALGUNS TESTES REPROVARAM. VERIFIQUE OS LOGS ACIMA.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Falha crítica na execução da suíte de testes:', err);
  process.exit(1);
});
