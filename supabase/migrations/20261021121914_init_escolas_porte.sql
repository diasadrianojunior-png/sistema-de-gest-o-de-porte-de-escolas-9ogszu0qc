-- Enable pgcrypto for password hashing if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Municipios / Redes (Tabela de Apoio)
CREATE TABLE IF NOT EXISTS public.municipios_rede (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  uf VARCHAR(2) NOT NULL DEFAULT 'SP',
  esfera TEXT NOT NULL DEFAULT 'Municipal', -- Municipal, Estadual, Federal, Privada
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tipos de Escola (Tabela de Apoio)
CREATE TABLE IF NOT EXISTS public.tipos_escola (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, -- Ex: Educação Infantil, Ensino Fundamental I, Ensino Fundamental II, Ensino Médio, Integral, Técnica
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Escolas (Cadastro Mestre)
CREATE TABLE IF NOT EXISTS public.escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  numero_alunos INTEGER NOT NULL DEFAULT 0 CHECK (numero_alunos >= 0),
  numero_servidores INTEGER NOT NULL DEFAULT 0 CHECK (numero_servidores >= 0),
  municipio_id UUID REFERENCES public.municipios_rede(id) ON DELETE SET NULL,
  tipo_escola_id UUID REFERENCES public.tipos_escola(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escolas_municipio ON public.escolas(municipio_id);
CREATE INDEX IF NOT EXISTS idx_escolas_tipo ON public.escolas(tipo_escola_id);

-- Enable RLS
ALTER TABLE public.municipios_rede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for municipios_rede
DROP POLICY IF EXISTS "authenticated_select_municipios" ON public.municipios_rede;
CREATE POLICY "authenticated_select_municipios" ON public.municipios_rede
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_municipios" ON public.municipios_rede;
CREATE POLICY "authenticated_insert_municipios" ON public.municipios_rede
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_municipios" ON public.municipios_rede;
CREATE POLICY "authenticated_update_municipios" ON public.municipios_rede
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_municipios" ON public.municipios_rede;
CREATE POLICY "authenticated_delete_municipios" ON public.municipios_rede
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for tipos_escola
DROP POLICY IF EXISTS "authenticated_select_tipos_escola" ON public.tipos_escola;
CREATE POLICY "authenticated_select_tipos_escola" ON public.tipos_escola
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_tipos_escola" ON public.tipos_escola;
CREATE POLICY "authenticated_insert_tipos_escola" ON public.tipos_escola
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_tipos_escola" ON public.tipos_escola;
CREATE POLICY "authenticated_update_tipos_escola" ON public.tipos_escola
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_tipos_escola" ON public.tipos_escola;
CREATE POLICY "authenticated_delete_tipos_escola" ON public.tipos_escola
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for escolas
DROP POLICY IF EXISTS "authenticated_select_escolas" ON public.escolas;
CREATE POLICY "authenticated_select_escolas" ON public.escolas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_escolas" ON public.escolas;
CREATE POLICY "authenticated_insert_escolas" ON public.escolas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_escolas" ON public.escolas;
CREATE POLICY "authenticated_update_escolas" ON public.escolas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_escolas" ON public.escolas;
CREATE POLICY "authenticated_delete_escolas" ON public.escolas
  FOR DELETE TO authenticated USING (true);

-- Initial seed user into auth.users (renato.guenther@ajrd.com.br / Skip@Pass)
DO $$
DECLARE
  seed_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'renato.guenther@ajrd.com.br') THEN
    seed_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      seed_user_id,
      '00000000-0000-0000-0000-000000000000',
      'renato.guenther@ajrd.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Renato Guenther"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );
  END IF;
END $$;

-- Initial Seed Data for Tabelas de Apoio
INSERT INTO public.municipios_rede (id, nome, uf, esfera) VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'São Paulo - DRE Ipiranga', 'SP', 'Municipal'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Campinas - Rede Leste', 'SP', 'Municipal'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Ribeirão Preto - Polo Central', 'SP', 'Estadual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tipos_escola (id, nome, descricao) VALUES
  ('b1111111-1111-1111-1111-111111111111'::uuid, 'Educação Infantil (EMEI / CEI)', 'Atende creche e pré-escola'),
  ('b2222222-2222-2222-2222-222222222222'::uuid, 'Ensino Fundamental (EMEF)', 'Ciclos I e II do Ensino Fundamental'),
  ('b3333333-3333-3333-3333-333333333333'::uuid, 'Centro Educacional Unificado (CEU)', 'Complexo integrado de educação e cultura')
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Data for Escolas (Cadastros Mestres)
INSERT INTO public.escolas (id, nome, endereco, numero_alunos, numero_servidores, municipio_id, tipo_escola_id) VALUES
  (
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'EMEF Professora Maria Aparecida',
    'Rua das Palmeiras, 120 - Centro',
    640,
    42,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid
  ),
  (
    'c2222222-2222-2222-2222-222222222222'::uuid,
    'EMEI Pequenos Passos',
    'Av. dos Girassóis, 450 - Jardim Paulista',
    210,
    18,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'b1111111-1111-1111-1111-111111111111'::uuid
  ),
  (
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'CEU Parque das Águas',
    'Estrada das Oliveiras, 800 - Vila Nova',
    1250,
    88,
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'b3333333-3333-3333-3333-333333333333'::uuid
  )
ON CONFLICT (id) DO NOTHING;
