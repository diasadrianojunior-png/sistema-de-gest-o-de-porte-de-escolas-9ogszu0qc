-- ============================================================================
-- Migration: 20261023181000_create_configuracao_rh_por_nivel.sql
-- ETAPA 1 de 2: Cadastro único de Níveis e Vagas (Configuração de RH por Nível)
--
-- Tabelas criadas:
-- 1) configuracao_rh
-- 2) configuracao_rh_nivel
-- 3) configuracao_rh_linha
-- 4) configuracao_rh_linha_cargo
-- 5) configuracao_rh_vaga
--
-- Inclui: sequências de código automático (CRHN-, NIV-, LNH-, VAG-),
-- RLS para autenticados, integridade referencial, e permissão no perfil Operador/Administrador.
-- ============================================================================

-- 1. TABELA PRINCIPAL: configuracao_rh
CREATE TABLE IF NOT EXISTS public.configuracao_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  tipo_atendimento TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL CHECK (ano_letivo BETWEEN 2020 AND 2040),
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'VIGENTE', 'ARQUIVADA')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: Só UMA configuração VIGENTE por tipo_atendimento + ano_letivo
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracao_rh_vigente
  ON public.configuracao_rh (tipo_atendimento, ano_letivo)
  WHERE status = 'VIGENTE';

-- Sequência e trigger para código automático de configuracao_rh (CRHN-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_configuracao_rh_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_configuracao_rh_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'CRHN-' || LPAD(nextval('public.seq_configuracao_rh_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_configuracao_rh_codigo ON public.configuracao_rh;
CREATE TRIGGER trg_generate_configuracao_rh_codigo
  BEFORE INSERT ON public.configuracao_rh
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_configuracao_rh_codigo();


-- 2. TABELA DE NÍVEIS: configuracao_rh_nivel
CREATE TABLE IF NOT EXISTS public.configuracao_rh_nivel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  configuracao_rh_id UUID NOT NULL REFERENCES public.configuracao_rh(id) ON DELETE CASCADE,
  codigo_nivel TEXT NOT NULL, -- Ex: 'I', 'II', 'A', 'B'
  ordem INTEGER NOT NULL DEFAULT 1,
  min_alunos INTEGER NOT NULL DEFAULT 0,
  max_alunos INTEGER, -- nullable = sem limite
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_rh_nivel_cfg ON public.configuracao_rh_nivel(configuracao_rh_id, ordem);

-- Sequência e trigger para código automático de configuracao_rh_nivel (NIV-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_configuracao_rh_nivel_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_configuracao_rh_nivel_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'NIV-' || LPAD(nextval('public.seq_configuracao_rh_nivel_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_configuracao_rh_nivel_codigo ON public.configuracao_rh_nivel;
CREATE TRIGGER trg_generate_configuracao_rh_nivel_codigo
  BEFORE INSERT ON public.configuracao_rh_nivel
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_configuracao_rh_nivel_codigo();


-- 3. TABELA DE LINHAS: configuracao_rh_linha (Função × Base de cálculo)
CREATE TABLE IF NOT EXISTS public.configuracao_rh_linha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  configuracao_rh_id UUID NOT NULL REFERENCES public.configuracao_rh(id) ON DELETE CASCADE,
  funcao_id UUID NOT NULL REFERENCES public.funcoes(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL DEFAULT 1,
  base_calculo TEXT NOT NULL CHECK (base_calculo IN ('POR_ESCOLA', 'POR_PERIODO', 'POR_TURMA', 'POR_TURMA_ETAPA')),
  etapas_filtro JSONB, -- Lista de nomes de etapas, ex: ["INFANTIL", "INFANTIL_I", "INFANTIL_II"]
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_rh_linha_cfg ON public.configuracao_rh_linha(configuracao_rh_id, ordem);
CREATE INDEX IF NOT EXISTS idx_cfg_rh_linha_func ON public.configuracao_rh_linha(funcao_id);

-- Sequência e trigger para código automático de configuracao_rh_linha (LNH-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_configuracao_rh_linha_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_configuracao_rh_linha_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'LNH-' || LPAD(nextval('public.seq_configuracao_rh_linha_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_configuracao_rh_linha_codigo ON public.configuracao_rh_linha;
CREATE TRIGGER trg_generate_configuracao_rh_linha_codigo
  BEFORE INSERT ON public.configuracao_rh_linha
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_configuracao_rh_linha_codigo();


-- 4. TABELA DE CARGOS PERMITIDOS POR LINHA: configuracao_rh_linha_cargo
CREATE TABLE IF NOT EXISTS public.configuracao_rh_linha_cargo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id UUID NOT NULL REFERENCES public.configuracao_rh_linha(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  condicao TEXT NOT NULL DEFAULT 'NENHUMA' CHECK (condicao IN ('NENHUMA', 'READAPTADO_COMPATIVEL_LAUDO', 'AUTORIZACAO_SEMED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cfg_rh_linha_cargo UNIQUE (linha_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS idx_cfg_rh_linha_cargo_linha ON public.configuracao_rh_linha_cargo(linha_id);
CREATE INDEX IF NOT EXISTS idx_cfg_rh_linha_cargo_cargo ON public.configuracao_rh_linha_cargo(cargo_id);


-- 5. TABELA DE CÉLULAS DA GRADE (VAGAS): configuracao_rh_vaga (Linha × Nível)
CREATE TABLE IF NOT EXISTS public.configuracao_rh_vaga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  linha_id UUID NOT NULL REFERENCES public.configuracao_rh_linha(id) ON DELETE CASCADE,
  nivel_id UUID NOT NULL REFERENCES public.configuracao_rh_nivel(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  modalidade TEXT NOT NULL DEFAULT 'FIXO' CHECK (modalidade IN ('FIXO', 'ITINERANTE')),
  dias_semana INTEGER CHECK (dias_semana IS NULL OR (dias_semana BETWEEN 1 AND 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cfg_rh_vaga_linha_nivel UNIQUE (linha_id, nivel_id)
);

CREATE INDEX IF NOT EXISTS idx_cfg_rh_vaga_linha ON public.configuracao_rh_vaga(linha_id);
CREATE INDEX IF NOT EXISTS idx_cfg_rh_vaga_nivel ON public.configuracao_rh_vaga(nivel_id);

-- Sequência e trigger para código automático de configuracao_rh_vaga (VAG-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_configuracao_rh_vaga_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_configuracao_rh_vaga_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'VAG-' || LPAD(nextval('public.seq_configuracao_rh_vaga_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_configuracao_rh_vaga_codigo ON public.configuracao_rh_vaga;
CREATE TRIGGER trg_generate_configuracao_rh_vaga_codigo
  BEFORE INSERT ON public.configuracao_rh_vaga
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_configuracao_rh_vaga_codigo();


-- 6. HABILITAR RLS EM TODAS AS NOVAS TABELAS
ALTER TABLE public.configuracao_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_rh_nivel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_rh_linha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_rh_linha_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_rh_vaga ENABLE ROW LEVEL SECURITY;

-- Políticas: configuracao_rh
DROP POLICY IF EXISTS "auth_sel_configuracao_rh" ON public.configuracao_rh;
CREATE POLICY "auth_sel_configuracao_rh" ON public.configuracao_rh FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_configuracao_rh" ON public.configuracao_rh;
CREATE POLICY "auth_ins_configuracao_rh" ON public.configuracao_rh FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_configuracao_rh" ON public.configuracao_rh;
CREATE POLICY "auth_upd_configuracao_rh" ON public.configuracao_rh FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_configuracao_rh" ON public.configuracao_rh;
CREATE POLICY "auth_del_configuracao_rh" ON public.configuracao_rh FOR DELETE TO authenticated USING (true);

-- Políticas: configuracao_rh_nivel
DROP POLICY IF EXISTS "auth_sel_configuracao_rh_nivel" ON public.configuracao_rh_nivel;
CREATE POLICY "auth_sel_configuracao_rh_nivel" ON public.configuracao_rh_nivel FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_configuracao_rh_nivel" ON public.configuracao_rh_nivel;
CREATE POLICY "auth_ins_configuracao_rh_nivel" ON public.configuracao_rh_nivel FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_configuracao_rh_nivel" ON public.configuracao_rh_nivel;
CREATE POLICY "auth_upd_configuracao_rh_nivel" ON public.configuracao_rh_nivel FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_configuracao_rh_nivel" ON public.configuracao_rh_nivel;
CREATE POLICY "auth_del_configuracao_rh_nivel" ON public.configuracao_rh_nivel FOR DELETE TO authenticated USING (true);

-- Políticas: configuracao_rh_linha
DROP POLICY IF EXISTS "auth_sel_configuracao_rh_linha" ON public.configuracao_rh_linha;
CREATE POLICY "auth_sel_configuracao_rh_linha" ON public.configuracao_rh_linha FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_configuracao_rh_linha" ON public.configuracao_rh_linha;
CREATE POLICY "auth_ins_configuracao_rh_linha" ON public.configuracao_rh_linha FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_configuracao_rh_linha" ON public.configuracao_rh_linha;
CREATE POLICY "auth_upd_configuracao_rh_linha" ON public.configuracao_rh_linha FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_configuracao_rh_linha" ON public.configuracao_rh_linha;
CREATE POLICY "auth_del_configuracao_rh_linha" ON public.configuracao_rh_linha FOR DELETE TO authenticated USING (true);

-- Políticas: configuracao_rh_linha_cargo
DROP POLICY IF EXISTS "auth_sel_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo;
CREATE POLICY "auth_sel_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo;
CREATE POLICY "auth_ins_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo;
CREATE POLICY "auth_upd_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo;
CREATE POLICY "auth_del_configuracao_rh_linha_cargo" ON public.configuracao_rh_linha_cargo FOR DELETE TO authenticated USING (true);

-- Políticas: configuracao_rh_vaga
DROP POLICY IF EXISTS "auth_sel_configuracao_rh_vaga" ON public.configuracao_rh_vaga;
CREATE POLICY "auth_sel_configuracao_rh_vaga" ON public.configuracao_rh_vaga FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_configuracao_rh_vaga" ON public.configuracao_rh_vaga;
CREATE POLICY "auth_ins_configuracao_rh_vaga" ON public.configuracao_rh_vaga FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_configuracao_rh_vaga" ON public.configuracao_rh_vaga;
CREATE POLICY "auth_upd_configuracao_rh_vaga" ON public.configuracao_rh_vaga FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_configuracao_rh_vaga" ON public.configuracao_rh_vaga;
CREATE POLICY "auth_del_configuracao_rh_vaga" ON public.configuracao_rh_vaga FOR DELETE TO authenticated USING (true);


-- 7. REGRA PERMANENTE: INCLUIR O NOVO MENU NA MATRIZ DE PERMISSÕES
-- Menu: "configuracao_rh" (Configuração de Vagas por Nível), posicionado em Cadastros de Apoio após o CARE (ordem 10)
-- Reorganizar ordens se necessário; liberado com Pode Ver = true, Pode Editar = true para Operador e Administrador.
INSERT INTO public.permissoes_perfil (
  perfil,
  menu_key,
  menu_label,
  pode_ver,
  pode_editar,
  suporta_edicao,
  ordem
)
VALUES
  ('Administrador', 'configuracao_rh', 'Configuração de Vagas por Nível', true, true, true, 10),
  ('Operador',      'configuracao_rh', 'Configuração de Vagas por Nível', true, true, true, 10)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  pode_ver = EXCLUDED.pode_ver,
  pode_editar = EXCLUDED.pode_editar,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;

-- Liberar também para todos os usuários/operadores já existentes no sistema (regra permanente)
INSERT INTO public.permissoes_usuario (
  usuario_id,
  menu_key,
  menu_label,
  pode_ver,
  pode_editar,
  suporta_edicao,
  ordem
)
SELECT
  u.id,
  'configuracao_rh',
  'Configuração de Vagas por Nível',
  true,
  true,
  true,
  10
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  pode_ver = EXCLUDED.pode_ver,
  pode_editar = EXCLUDED.pode_editar,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;
