-- Migração: Criação do Cadastro de Cargos e Funções (CARE), vínculo com Unidade Escolar nas Turmas e Permissões
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.33

-- 1. ADICIONAR COLUNA unidade_escolar_id NA TABELA TURMAS
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS unidade_escolar_id UUID REFERENCES public.unidades_escolares(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_turmas_unidade ON public.turmas(unidade_escolar_id);

-- Se existirem turmas sem unidade escolar vinculada, associar à primeira unidade existente para consistência
DO $$
DECLARE
  v_primeira_unidade UUID;
BEGIN
  SELECT id INTO v_primeira_unidade FROM public.unidades_escolares ORDER BY codigo ASC LIMIT 1;
  IF v_primeira_unidade IS NOT NULL THEN
    UPDATE public.turmas
    SET unidade_escolar_id = v_primeira_unidade
    WHERE unidade_escolar_id IS NULL;
  END IF;
END $$;

-- 2. CRIAR SEQUÊNCIA PARA IDENTIFICADOR DE VAGAS (VAG-0001, VAG-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_care_vagas_codigo START WITH 1 INCREMENT BY 1;

-- 3. CRIAR TABELA care_vagas
CREATE TABLE IF NOT EXISTS public.care_vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE, -- ex: VAG-0001
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE RESTRICT,
  ano_letivo INTEGER NOT NULL,
  crh_configuracao_id UUID NOT NULL REFERENCES public.crh_configuracoes(id) ON DELETE RESTRICT,
  crh_codigo TEXT, -- código de rastreabilidade (ex: CRH-0001)
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE RESTRICT,
  funcao_id UUID NOT NULL REFERENCES public.funcoes(id) ON DELETE RESTRICT,
  numero_sequencial_vaga INTEGER NOT NULL DEFAULT 1, -- vaga 1, 2, 3... daquela configuração
  quantidade_referencia INTEGER NOT NULL DEFAULT 1,
  criterio_dimensionamento TEXT NOT NULL DEFAULT 'Por Unidade', -- 'Por Unidade', 'Por Turma', 'Por Período'
  natureza_cargo TEXT NOT NULL DEFAULT 'Fixo', -- 'Fixo' ou 'Itinerante'
  status TEXT NOT NULL DEFAULT 'Preenchida', -- 'Aberta' ou 'Preenchida'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Restrições de valores e integridade
  CONSTRAINT chk_care_vagas_ano_letivo CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040),
  CONSTRAINT chk_care_vagas_status CHECK (status IN ('Aberta', 'Preenchida')),
  CONSTRAINT chk_care_vagas_natureza CHECK (natureza_cargo IN ('Fixo', 'Itinerante')),
  CONSTRAINT chk_care_vagas_criterio CHECK (criterio_dimensionamento IN ('Por Unidade', 'Por Turma', 'Por Período')),
  CONSTRAINT chk_care_vagas_seq CHECK (numero_sequencial_vaga >= 1),

  -- Regra Anti-Duplicação e Idempotência:
  -- Cada vaga prevista é única pelo par (configuração de origem + número sequencial da vaga dentro dela)
  CONSTRAINT uq_care_vaga_origem_seq UNIQUE (crh_configuracao_id, numero_sequencial_vaga)
);

-- 4. TRIGGER PARA GERAÇÃO DO IDENTIFICADOR SEQUENCIAL VAG-XXXX
CREATE OR REPLACE FUNCTION public.fn_generate_care_vaga_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'VAG-' || LPAD(nextval('seq_care_vagas_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_care_vaga_codigo ON public.care_vagas;
CREATE TRIGGER trg_generate_care_vaga_codigo
  BEFORE INSERT ON public.care_vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_care_vaga_codigo();

-- 5. TRIGGER DE VALIDAÇÃO DE VÍNCULOS E INTEGRIDADE PARA CARE
CREATE OR REPLACE FUNCTION public.fn_validate_care_vaga_vinculos()
RETURNS trigger AS $$
DECLARE
  v_crh_unidade UUID;
  v_crh_ano INTEGER;
  v_crh_cargo UUID;
  v_crh_funcao UUID;
  v_crh_codigo TEXT;
BEGIN
  -- Validar se a configuração CRH existe e confere com os dados da vaga
  SELECT unidade_escolar_id, ano_letivo, cargo_id, funcao_id, codigo
  INTO v_crh_unidade, v_crh_ano, v_crh_cargo, v_crh_funcao, v_crh_codigo
  FROM public.crh_configuracoes
  WHERE id = NEW.crh_configuracao_id;

  IF v_crh_unidade IS NULL THEN
    RAISE EXCEPTION 'Configuração CRH de origem não encontrada.';
  END IF;

  IF NEW.unidade_escolar_id <> v_crh_unidade THEN
    RAISE EXCEPTION 'Inconsistência de vínculo: a unidade da vaga difere da unidade da configuração CRH de origem.';
  END IF;

  IF NEW.ano_letivo <> v_crh_ano THEN
    RAISE EXCEPTION 'Inconsistência de vínculo: o ano letivo da vaga difere do ano da configuração CRH de origem.';
  END IF;

  IF NEW.cargo_id <> v_crh_cargo THEN
    RAISE EXCEPTION 'Inconsistência de vínculo: o cargo da vaga difere do cargo da configuração CRH de origem.';
  END IF;

  IF NEW.funcao_id <> v_crh_funcao THEN
    RAISE EXCEPTION 'Inconsistência de vínculo: a função da vaga difere da função da configuração CRH de origem.';
  END IF;

  -- Preenche automaticamente o código CRH se vazio
  IF NEW.crh_codigo IS NULL OR NEW.crh_codigo = '' THEN
    NEW.crh_codigo := v_crh_codigo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_care_vaga_vinculos ON public.care_vagas;
CREATE TRIGGER trg_validate_care_vaga_vinculos
  BEFORE INSERT OR UPDATE ON public.care_vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_care_vaga_vinculos();

-- 6. HABILITAR RLS E POLÍTICAS NA TABELA care_vagas
ALTER TABLE public.care_vagas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_care_vagas" ON public.care_vagas;
CREATE POLICY "authenticated_select_care_vagas" ON public.care_vagas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_care_vagas" ON public.care_vagas;
CREATE POLICY "authenticated_insert_care_vagas" ON public.care_vagas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_care_vagas" ON public.care_vagas;
CREATE POLICY "authenticated_update_care_vagas" ON public.care_vagas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_care_vagas" ON public.care_vagas;
CREATE POLICY "authenticated_delete_care_vagas" ON public.care_vagas
  FOR DELETE TO authenticated USING (true);

-- 7. ÍNDICES PARA CONSULTAS RÁPIDAS
CREATE INDEX IF NOT EXISTS idx_care_vagas_codigo ON public.care_vagas(codigo);
CREATE INDEX IF NOT EXISTS idx_care_vagas_unidade ON public.care_vagas(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_care_vagas_ano ON public.care_vagas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_care_vagas_crh ON public.care_vagas(crh_configuracao_id);
CREATE INDEX IF NOT EXISTS idx_care_vagas_cargo ON public.care_vagas(cargo_id);
CREATE INDEX IF NOT EXISTS idx_care_vagas_funcao ON public.care_vagas(funcao_id);
CREATE INDEX IF NOT EXISTS idx_care_vagas_status ON public.care_vagas(status);

-- 8. ATUALIZAR MATRIZ DE PERMISSÕES PARA INCLUIR CARE EM CADASTROS DE APOIO (após CRH)
-- Ordem atualizada:
-- 1: painel
-- 2: unidades_escolares
-- 3: turmas
-- 4: cargos
-- 5: funcoes
-- 6: etapas
-- 7: anos_series
-- 8: crh (Configurações de RH - CRH)
-- 9: care (Cargos e Funções - CARE)
-- 10: usuarios
-- 11: contas_email
-- 12: auditoria

UPDATE public.permissoes_perfil SET ordem = 12 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 11 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 10 WHERE menu_key = 'usuarios';

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'care', 'Cargos e Funções (CARE)', true, true, true, 9)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Cargos e Funções (CARE)',
    pode_ver = true,
    suporta_edicao = true,
    ordem = 9;

UPDATE public.permissoes_usuario SET ordem = 12 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 11 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 10 WHERE menu_key = 'usuarios';

-- Para todos os operadores já existentes no sistema, adicionar permissão para 'care'
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'care', 'Cargos e Funções (CARE)', true, true, true, 9)
    ON CONFLICT (usuario_id, menu_key) DO UPDATE
    SET menu_label = 'Cargos e Funções (CARE)',
        pode_ver = true,
        suporta_edicao = true,
        ordem = 9;
  END LOOP;
END $$;
