-- ============================================================================
-- Migration: 20261026173500_create_vagas_e_escola_ano.sql
-- ETAPA 2: Cadastro de Vagas (geração por Unidade Escolar e Ano Letivo)
--
-- Tabelas criadas / alteradas:
-- 1) unidades_escolares: adiciona coluna 'ativo' (boolean default true) se não existir
-- 2) unidade_escolar_ano: dados da escola no ano letivo (qtd_alunos, qtd_turmas, periodos, turmas_por_etapa, nivel_calculado, configuracao_rh_id, data_ultima_geracao)
-- 3) vaga: tabela de vagas reais (1 registro por vaga física/posta calculada)
-- 4) Sequências e triggers para códigos automáticos (UEA-XXXX para unidade_escolar_ano, VAGP-XXXX para vaga)
-- 5) RLS e políticas para tabelas
-- 6) Permissões de operador/administrador para o novo menu 'vagas' ("Cadastro de Vagas")
-- ============================================================================

-- 1. Completar a tabela unidades_escolares com 'ativo'
ALTER TABLE public.unidades_escolares ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- 2. TABELA unidade_escolar_ano
CREATE TABLE IF NOT EXISTS public.unidade_escolar_ano (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL CHECK (ano_letivo BETWEEN 2020 AND 2040),
  qtd_alunos INTEGER NOT NULL DEFAULT 0 CHECK (qtd_alunos >= 0),
  qtd_turmas INTEGER NOT NULL DEFAULT 0 CHECK (qtd_turmas >= 0),
  periodos JSONB NOT NULL DEFAULT '["MANHA", "TARDE"]'::jsonb, -- lista ex: ["MANHA", "TARDE"] ou ["INTEGRAL"]
  turmas_por_etapa JSONB, -- dicionário chave/etapa: ex: {"INFANTIL": 3} ou array [{"etapa": "INFANTIL", "quantidade": 3}]
  nivel_calculado TEXT, -- código do nível, ex: 'I', 'V', 'A'
  configuracao_rh_id UUID REFERENCES public.configuracao_rh(id) ON DELETE SET NULL,
  data_ultima_geracao TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_unidade_escolar_ano UNIQUE (unidade_escolar_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_uea_unidade ON public.unidade_escolar_ano(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_uea_ano ON public.unidade_escolar_ano(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_uea_config ON public.unidade_escolar_ano(configuracao_rh_id);

-- Sequência e trigger de código para unidade_escolar_ano (UEA-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_unidade_escolar_ano_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_unidade_escolar_ano_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'UEA-' || LPAD(nextval('public.seq_unidade_escolar_ano_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_unidade_escolar_ano_codigo ON public.unidade_escolar_ano;
CREATE TRIGGER trg_generate_unidade_escolar_ano_codigo
  BEFORE INSERT ON public.unidade_escolar_ano
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_unidade_escolar_ano_codigo();


-- 3. TABELA vaga (um registro por vaga gerada)
CREATE TABLE IF NOT EXISTS public.vaga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE, -- VAGP-0001 (para distinguir da vaga da matriz da Etapa 1)
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL CHECK (ano_letivo BETWEEN 2020 AND 2040),
  configuracao_rh_id UUID NOT NULL REFERENCES public.configuracao_rh(id) ON DELETE RESTRICT,
  configuracao_rh_linha_id UUID NOT NULL REFERENCES public.configuracao_rh_linha(id) ON DELETE RESTRICT,
  funcao TEXT NOT NULL,
  numero_sequencial INTEGER NOT NULL, -- ex: 1, 2, 3...
  periodo TEXT CHECK (periodo IS NULL OR periodo IN ('MANHA', 'TARDE', 'INTEGRAL', 'NOITE')),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  modalidade TEXT NOT NULL DEFAULT 'FIXO' CHECK (modalidade IN ('FIXO', 'ITINERANTE')),
  dias_semana INTEGER CHECK (dias_semana IS NULL OR (dias_semana BETWEEN 1 AND 5)),
  cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  servidor_id UUID,
  nome_ocupante TEXT,
  condicao_especial TEXT CHECK (condicao_especial IS NULL OR condicao_especial IN ('NENHUMA', 'READAPTADO_COMPATIVEL_LAUDO', 'AUTORIZACAO_SEMED')),
  status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'OCUPADA', 'EXCEDENTE')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaga_unidade ON public.vaga(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_vaga_ano ON public.vaga(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_vaga_cfg ON public.vaga(configuracao_rh_id);
CREATE INDEX IF NOT EXISTS idx_vaga_linha ON public.vaga(configuracao_rh_linha_id);
CREATE INDEX IF NOT EXISTS idx_vaga_status ON public.vaga(status);
CREATE INDEX IF NOT EXISTS idx_vaga_cargo ON public.vaga(cargo_id);

-- Sequência e trigger de código para vaga (VAGP-0001)
CREATE SEQUENCE IF NOT EXISTS public.seq_vaga_codigo START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.fn_generate_vaga_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'VAGP-' || LPAD(nextval('public.seq_vaga_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_vaga_codigo ON public.vaga;
CREATE TRIGGER trg_generate_vaga_codigo
  BEFORE INSERT ON public.vaga
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_vaga_codigo();


-- 4. Habilitar RLS e criar políticas
ALTER TABLE public.unidade_escolar_ano ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_sel_unidade_escolar_ano" ON public.unidade_escolar_ano;
CREATE POLICY "auth_sel_unidade_escolar_ano" ON public.unidade_escolar_ano FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_unidade_escolar_ano" ON public.unidade_escolar_ano;
CREATE POLICY "auth_ins_unidade_escolar_ano" ON public.unidade_escolar_ano FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_unidade_escolar_ano" ON public.unidade_escolar_ano;
CREATE POLICY "auth_upd_unidade_escolar_ano" ON public.unidade_escolar_ano FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_unidade_escolar_ano" ON public.unidade_escolar_ano;
CREATE POLICY "auth_del_unidade_escolar_ano" ON public.unidade_escolar_ano FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_sel_vaga" ON public.vaga;
CREATE POLICY "auth_sel_vaga" ON public.vaga FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_ins_vaga" ON public.vaga;
CREATE POLICY "auth_ins_vaga" ON public.vaga FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_upd_vaga" ON public.vaga;
CREATE POLICY "auth_upd_vaga" ON public.vaga FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_del_vaga" ON public.vaga;
CREATE POLICY "auth_del_vaga" ON public.vaga FOR DELETE TO authenticated USING (true);


-- 5. REGRA PERMANENTE: MATRIZ DE PERMISSÕES PARA O NOVO MENU 'vagas' ("Cadastro de Vagas")
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
  ('Administrador', 'vagas', 'Cadastro de Vagas', true, true, true, 9),
  ('Operador',      'vagas', 'Cadastro de Vagas', true, true, true, 9)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  pode_ver = EXCLUDED.pode_ver,
  pode_editar = EXCLUDED.pode_editar,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;

-- Liberar também para todos os usuários/operadores já existentes (regra permanente)
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
  'vagas',
  'Cadastro de Vagas',
  true,
  true,
  true,
  9
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  pode_ver = EXCLUDED.pode_ver,
  pode_editar = EXCLUDED.pode_editar,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;
