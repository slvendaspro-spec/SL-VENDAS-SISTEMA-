-- =====================================================================
-- PDV-MZ: SISTEMA PÚBLICO E MULTIEMPRESA DE VENDAS & GESTÃO
-- ARQUITECTURA SUPABASE POSTGRESQL COM ROW LEVEL SECURITY (RLS)
-- ISOLAMENTO TOTAL DE DADOS POR EMPRESA (empresa_id)
-- =====================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. TABELA DE EMPRESAS (TENANTS MULTIEMPRESA)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    nuit VARCHAR(20) NOT NULL,
    proprietario_nome VARCHAR(255) NOT NULL,
    proprietario_email VARCHAR(255) NOT NULL,
    proprietario_telefone VARCHAR(50),
    moeda VARCHAR(10) DEFAULT 'MZN',
    cidade VARCHAR(100) NOT NULL,
    endereco TEXT,
    logo_url TEXT,
    plano VARCHAR(30) DEFAULT 'profissional', -- gratuito, profissional, empresarial
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, canceled
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para pesquisa ágil de empresa
CREATE INDEX IF NOT EXISTS idx_empresas_slug ON public.empresas(slug);
CREATE INDEX IF NOT EXISTS idx_empresas_proprietario_email ON public.empresas(proprietario_email);

-- =====================================================================
-- 3. TABELA DE LOJAS / FILIAIS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lojas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    endereco TEXT NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    telefone VARCHAR(50),
    nuit VARCHAR(20),
    responsavel_nome VARCHAR(255),
    meta_diaria NUMERIC(15,2) DEFAULT 35000.00,
    status VARCHAR(20) DEFAULT 'active',
    foto_url TEXT,
    logo_url TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_lojas_empresa ON public.lojas(empresa_id);

-- =====================================================================
-- 4. TABELA DE UTILIZADORES / OPERADORES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.utilizadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    papel VARCHAR(30) NOT NULL, -- 'super_admin', 'company_admin', 'cashier'
    pin VARCHAR(10) DEFAULT '1234',
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    foto_url TEXT,
    permissoes JSONB DEFAULT '{
        "canChangePrices": false,
        "canApplyDiscountsOverLimit": false,
        "canCancelSales": false,
        "canViewReports": true,
        "canManageProducts": false,
        "canManageUsers": false,
        "canManageStores": false,
        "canAdjustStock": false
    }'::jsonb,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_utilizadores_empresa ON public.utilizadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_utilizadores_email ON public.utilizadores(email);

-- =====================================================================
-- 5. TABELA DE PRODUTOS & ESTOQUE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(100),
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    preco_custo NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    preco_venda NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    estoque_geral NUMERIC(15,3) NOT NULL DEFAULT 0.00,
    estoque_por_loja JSONB DEFAULT '{}'::jsonb, -- { "loja_id": 50 }
    estoque_minimo NUMERIC(15,3) DEFAULT 10,
    unidade VARCHAR(30) DEFAULT 'Unid',
    fornecedor VARCHAR(255),
    visivel_caixa BOOLEAN DEFAULT true,
    visibilidade_por_loja JSONB DEFAULT '{}'::jsonb,
    foto_url TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras);

-- =====================================================================
-- 6. TABELA DE CLIENTES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    bairro VARCHAR(100),
    nuit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'APROVADO',
    desconto_fidelidade_percentual NUMERIC(5,2) DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);

-- =====================================================================
-- 7. TABELA DE VENDAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
    loja_nome VARCHAR(255) NOT NULL,
    vendedor_id UUID NOT NULL,
    vendedor_nome VARCHAR(255) NOT NULL,
    numero_venda VARCHAR(64) NOT NULL,
    cliente_nome VARCHAR(255) DEFAULT 'Cliente Balcão',
    cliente_telefone VARCHAR(50),
    cliente_nuit VARCHAR(20),
    subtotal NUMERIC(15,2) NOT NULL,
    desconto NUMERIC(15,2) DEFAULT 0.00,
    desconto_percentual NUMERIC(5,2) DEFAULT 0.00,
    taxa_iva NUMERIC(5,2) DEFAULT 17.00,
    valor_iva NUMERIC(15,2) DEFAULT 0.00,
    total NUMERIC(15,2) NOT NULL,
    custo_total NUMERIC(15,2) NOT NULL,
    lucro_estimado NUMERIC(15,2) NOT NULL,
    metodo_pagamento VARCHAR(50) NOT NULL, -- M_PESA, E_MOLA, DINHEIRO, POS_CARTAO, TRANSFERENCIA
    referencia_pagamento VARCHAR(100),
    valor_entregue NUMERIC(15,2),
    troco NUMERIC(15,2),
    sem_sangria BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED
    motivo_cancelamento TEXT,
    cancelado_em TIMESTAMP WITH TIME ZONE,
    cancelado_por VARCHAR(255),
    dispositivo_id VARCHAR(100),
    sincronizado BOOLEAN DEFAULT true,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empresa_id, numero_venda)
);

CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_loja ON public.vendas(loja_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data_hora);

-- =====================================================================
-- 8. TABELA DE ITENS DA VENDA
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    produto_nome VARCHAR(255) NOT NULL,
    produto_codigo VARCHAR(100) NOT NULL,
    preco_unitario NUMERIC(15,2) NOT NULL,
    preco_custo NUMERIC(15,2) NOT NULL,
    quantidade NUMERIC(15,3) NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    lucro_item NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON public.itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_empresa ON public.itens_venda(empresa_id);

-- =====================================================================
-- 9. TABELA DE TRANSAÇÕES DE CAIXA (SANGRIA & REFORÇO)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.movimentos_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL,
    vendedor_nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- SANGRIA, REFORCO
    valor NUMERIC(15,2) NOT NULL,
    motivo TEXT NOT NULL,
    autorizado_por VARCHAR(255) NOT NULL,
    codigo_comprovativo VARCHAR(100),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movimentos_empresa ON public.movimentos_caixa(empresa_id);

-- =====================================================================
-- 10. TABELA DE FECHOS DIÁRIOS DE CAIXA
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.fechos_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    loja_nome VARCHAR(255) NOT NULL,
    numero_fecho VARCHAR(64) NOT NULL,
    vendedor_id UUID NOT NULL,
    vendedor_nome VARCHAR(255) NOT NULL,
    aberto_em TIMESTAMP WITH TIME ZONE NOT NULL,
    fechado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    fundo_inicial NUMERIC(15,2) NOT NULL,
    vendas_dinheiro NUMERIC(15,2) DEFAULT 0.00,
    vendas_mpesa NUMERIC(15,2) DEFAULT 0.00,
    vendas_emola NUMERIC(15,2) DEFAULT 0.00,
    vendas_cartao NUMERIC(15,2) DEFAULT 0.00,
    vendas_bruto NUMERIC(15,2) NOT NULL,
    total_descontos NUMERIC(15,2) DEFAULT 0.00,
    total_sangrias NUMERIC(15,2) DEFAULT 0.00,
    total_reforcos NUMERIC(15,2) DEFAULT 0.00,
    esperado_em_gaveta NUMERIC(15,2) NOT NULL,
    contado_em_gaveta NUMERIC(15,2) NOT NULL,
    diferenca NUMERIC(15,2) NOT NULL,
    quantidade_vendas INTEGER NOT NULL,
    notas TEXT,
    sincronizado BOOLEAN DEFAULT true,
    UNIQUE(empresa_id, numero_fecho)
);

CREATE INDEX IF NOT EXISTS idx_fechos_empresa ON public.fechos_caixa(empresa_id);

-- =====================================================================
-- 11. TABELA DE DESPESAS OPERACIONAIS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
    loja_nome VARCHAR(255),
    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    data DATE NOT NULL,
    registado_por VARCHAR(255) NOT NULL,
    notas TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_despesas_empresa ON public.despesas(empresa_id);

-- =====================================================================
-- 12. ROW LEVEL SECURITY (RLS) — ISOLAMENTO TOTAL ENTRE EMPRESAS
-- =====================================================================

-- Activar RLS em todas as tabelas comerciais privadas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: Super Admin da Plataforma pode aceder para suporte e infraestrutura
CREATE POLICY super_admin_all_empresas ON public.empresas
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        id = (auth.jwt() ->> 'empresa_id')::uuid
    );

-- POLÍTICAS RLS: Acesso exclusivo aos dados da sua própria empresa
CREATE POLICY tenant_isolation_lojas ON public.lojas
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_produtos ON public.produtos
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_vendas ON public.vendas
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_itens ON public.itens_venda
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_clientes ON public.clientes
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_fechos ON public.fechos_caixa
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_despesas ON public.despesas
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

CREATE POLICY tenant_isolation_movimentos ON public.movimentos_caixa
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );
