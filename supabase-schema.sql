-- ==============================================================================
-- PDV-MZ: SISTEMA DE PONTO DE VENDA E GESTÃO COMERCIAL MULTI-LOJA (MOÇAMBIQUE)
-- ESQUEMA COMPLETO SUPABASE POSTGRESQL COM ROW LEVEL SECURITY (RLS) E AUDITORIA
-- ==============================================================================

-- 1. EXTENSÕES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE EMPRESAS (MULTI-TENANT ISOLATION)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    nuit VARCHAR(20) NOT NULL UNIQUE,
    phone VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Maputo',
    country VARCHAR(100) DEFAULT 'Moçambique',
    currency VARCHAR(10) DEFAULT 'MZN',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE LOJAS / SUCURSAIS
CREATE TABLE IF NOT EXISTS public.stores (
    id VARCHAR(50) PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    nuit VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    is_online BOOLEAN DEFAULT true,
    responsible_name VARCHAR(255),
    daily_sales_target NUMERIC(12, 2) DEFAULT 35000.00,
    logo_url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE UTILIZADORES E AUTORIZAÇÕES
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(50) PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('general_manager', 'store_manager', 'cashier')),
    assigned_store_id VARCHAR(50) NOT NULL,
    assigned_store_name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(50),
    identification_number VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{
        "canChangePrices": false,
        "canApplyDiscountsOverLimit": false,
        "canCancelSales": false,
        "canViewReports": false,
        "canManageProducts": false,
        "canManageUsers": false,
        "canManageStores": false,
        "canAdjustStock": false
    }'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE PEDIDOS DE APROVAÇÃO DE ACESSO (FLUXO OBRIGATÓRIO DE CAIXA)
CREATE TABLE IF NOT EXISTS public.auth_requests (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(30) NOT NULL,
    company_name VARCHAR(255) DEFAULT 'SL VENDAS',
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    attempts INTEGER DEFAULT 0,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. TABELA DE PRODUTOS E CATÁLOGO
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(50) PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    supplier VARCHAR(255),
    unit VARCHAR(50) DEFAULT 'Unid',
    image_url TEXT,
    is_visible_in_cashier BOOLEAN DEFAULT true,
    stock_by_store JSONB DEFAULT '{}'::jsonb,
    visible_in_stores JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE MOVIMENTOS DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA_VENDA', 'AJUSTE', 'ESTORNO', 'TRANSFERENCIA')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    user_id VARCHAR(50) REFERENCES public.users(id),
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id VARCHAR(50) PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    nuit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO')),
    loyalty_discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.sales (
    id VARCHAR(50) PRIMARY KEY,
    sale_number VARCHAR(100) NOT NULL UNIQUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE RESTRICT,
    store_name VARCHAR(255) NOT NULL,
    cashier_id VARCHAR(50) REFERENCES public.users(id) ON DELETE RESTRICT,
    cashier_name VARCHAR(255) NOT NULL,
    customer_id VARCHAR(50) REFERENCES public.customers(id),
    customer_name VARCHAR(255) DEFAULT 'Cliente Balcão',
    customer_phone VARCHAR(50),
    customer_nuit VARCHAR(20),
    customer_bairro VARCHAR(100),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    iva_rate NUMERIC(5, 2) DEFAULT 0.17,
    iva_amount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('M_PESA', 'E_MOLA', 'DINHEIRO', 'POS_CARTAO', 'TRANSFERENCIA')),
    payment_reference VARCHAR(100),
    cash_tendered NUMERIC(12, 2),
    change_due NUMERIC(12, 2),
    is_sem_sangria BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    cancel_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by VARCHAR(255),
    is_synced BOOLEAN DEFAULT true,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.sale_items (
    id VARCHAR(50) PRIMARY KEY,
    sale_id VARCHAR(50) REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    item_profit NUMERIC(12, 2) NOT NULL
);

-- 11. MOVIMENTOS DE CAIXA: SANGRIA E REFORÇO
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id VARCHAR(50) PRIMARY KEY,
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    cashier_id VARCHAR(50) REFERENCES public.users(id),
    cashier_name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SANGRIA', 'REFORCO')),
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    authorized_by VARCHAR(255) NOT NULL,
    voucher_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. FECHOS DIÁRIOS DE CAIXA
CREATE TABLE IF NOT EXISTS public.shift_closures (
    id VARCHAR(50) PRIMARY KEY,
    closure_number VARCHAR(100) NOT NULL UNIQUE,
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE RESTRICT,
    store_name VARCHAR(255) NOT NULL,
    cashier_id VARCHAR(50) REFERENCES public.users(id),
    cashier_name VARCHAR(255) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales_mpesa NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales_emola NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales_card NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_discounts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sangrias NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_reforcos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash_in_drawer NUMERIC(12, 2) NOT NULL,
    actual_cash_in_drawer NUMERIC(12, 2) NOT NULL,
    difference NUMERIC(12, 2) NOT NULL,
    sales_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. REGISTO CENTRAL DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    store_id VARCHAR(50),
    store_name VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'normal' CHECK (severity IN ('normal', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_stores_company ON public.stores(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_store ON public.users(assigned_store_id);
CREATE INDEX IF NOT EXISTS idx_auth_requests_status ON public.auth_requests(status);
CREATE INDEX IF NOT EXISTS idx_auth_requests_expires ON public.auth_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Regra para Administrador Geral: Acesso irrestrito a todos os dados da empresa
CREATE POLICY "Admin_Geral_All_Access" ON public.sales
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text AND users.role = 'general_manager'
        )
    );

-- 2. Regra para Vendedores / Caixas: Acesso estrito apenas à sua loja autorizada
CREATE POLICY "Cashier_Store_Isolation_Sales" ON public.sales
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND (users.assigned_store_id = sales.store_id OR users.role = 'general_manager')
        )
    );

CREATE POLICY "Cashier_Insert_Own_Store_Sales" ON public.sales
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND users.assigned_store_id = sales.store_id
        )
    );

-- 3. Regra para Pedidos de Acesso: Apenas Administrador Geral pode aprovar
CREATE POLICY "Admin_Approve_Auth_Requests" ON public.auth_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text AND users.role = 'general_manager'
        )
    );
