-- Migração: Criação das tabelas niveis_porte e crh_configuracoes (CRH)
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.32

-- 1. Sequência para niveis_porte (NIV-0001, ...)
CREATE SEQUENCE IF NOT EXISTS seq_niveis_porte_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de referência de niveis de porte (dimensionamento editável)
CREATE TABLE IF NOT EXISTS public.niveis_porte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  tipo_atendimento TEXT NOT NULL,
  nivel TEXT NOT NULL,
  alunos_min INTEGER NOT NULL DEFAULT 0,
  alunos_max INTEGER, -- NULL representa sem limite superior (ex: acima de 1500)
  ordem INTEGER NOT NULL DEFAULT 1,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_niveis_porte_tipo CHECK (tipo_atendimento IN ('Ensino Fundamental e Educação Infantil (20h)', 'Educação Infantil (40h)')),
  CONSTRAINT chk_niveis_porte_faixa CHECK (alunos_max IS NULL OR alunos_max >= alunos_min)
);

-- Trigger de código para niveis_porte
CREATE OR REPLACE FUNCTION public.fn_generate_nivel_porte_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'NIV-' || LPAD(nextval('seq_niveis_porte_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_nivel_porte_codigo ON public.niveis_porte;
CREATE TRIGGER trg_generate_nivel_porte_codigo
  BEFORE INSERT ON public.niveis_porte
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_nivel_porte_codigo();

-- RLS para niveis_porte
ALTER TABLE public.niveis_porte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_niveis_porte" ON public.niveis_porte;
CREATE POLICY "authenticated_select_niveis_porte" ON public.niveis_porte
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_niveis_porte" ON public.niveis_porte;
CREATE POLICY "authenticated_insert_niveis_porte" ON public.niveis_porte
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_niveis_porte" ON public.niveis_porte;
CREATE POLICY "authenticated_update_niveis_porte" ON public.niveis_porte
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_niveis_porte" ON public.niveis_porte;
CREATE POLICY "authenticated_delete_niveis_porte" ON public.niveis_porte
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_niveis_porte_tipo ON public.niveis_porte(tipo_atendimento);
CREATE INDEX IF NOT EXISTS idx_niveis_porte_ordem ON public.niveis_porte(ordem);

-- População inicial plausível dos Níveis (I a VIII para 20h e A, B, C para 40h)
INSERT INTO public.niveis_porte (tipo_atendimento, nivel, alunos_min, alunos_max, ordem, descricao)
VALUES
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível I', 0, 100, 1, 'Até 100 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível II', 101, 250, 2, 'De 101 a 250 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível III', 251, 500, 3, 'De 251 a 500 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível IV', 501, 750, 4, 'De 501 a 750 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível V', 751, 1000, 5, 'De 751 a 1.000 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível VI', 1001, 1250, 6, 'De 1.001 a 1.250 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível VII', 1251, 1500, 7, 'De 1.251 a 1.500 alunos'),
  ('Ensino Fundamental e Educação Infantil (20h)', 'Nível VIII', 1501, NULL, 8, 'Mais de 1.500 alunos'),
  ('Educação Infantil (40h)', 'Nível A', 0, 100, 1, 'Até 100 alunos'),
  ('Educação Infantil (40h)', 'Nível B', 101, 200, 2, '101 a 200 alunos'),
  ('Educação Infantil (40h)', 'Nível C', 201, NULL, 3, 'Mais de 200 alunos')
ON CONFLICT DO NOTHING;

-- 3. Sequência para identificador de CRH (CRH-0001, CRH-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_crh_configuracoes_codigo START WITH 1 INCREMENT BY 1;

-- 4. Tabela crh_configuracoes
CREATE TABLE IF NOT EXISTS public.crh_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  ano_letivo INTEGER NOT NULL,
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE RESTRICT,
  tipo_atendimento TEXT NOT NULL,
  nivel_unidade TEXT NOT NULL,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE RESTRICT,
  quantidade_profissionais INTEGER NOT NULL DEFAULT 1,
  por_turma TEXT NOT NULL DEFAULT 'Não',
  por_periodo TEXT NOT NULL DEFAULT 'Não',
  natureza_cargo TEXT NOT NULL DEFAULT 'Fixo',
  funcao_id UUID NOT NULL REFERENCES public.funcoes(id) ON DELETE RESTRICT,
  quantidade_por_funcao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Restrições de valores e integridade
  CONSTRAINT chk_crh_ano_letivo CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040),
  CONSTRAINT chk_crh_qtd_profissionais CHECK (quantidade_profissionais >= 0),
  CONSTRAINT chk_crh_qtd_funcao CHECK (quantidade_por_funcao >= 0),
  CONSTRAINT chk_crh_por_turma CHECK (por_turma IN ('Sim', 'Não')),
  CONSTRAINT chk_crh_por_periodo CHECK (por_periodo IN ('Sim', 'Não')),
  CONSTRAINT chk_crh_natureza CHECK (natureza_cargo IN ('Fixo', 'Itinerante')),
  -- Regra: Não permitir "Por Turma?" e "Por Período?" simultaneamente "Sim"
  CONSTRAINT chk_crh_criterios_mutuamente_exclusivos CHECK (NOT (por_turma = 'Sim' AND por_periodo = 'Sim')),
  -- Regra: Impedir configurações duplicadas para a mesma combinação de ano letivo + unidade escolar + cargo + função + critérios de dimensionamento
  CONSTRAINT uq_crh_combinacao UNIQUE (ano_letivo, unidade_escolar_id, cargo_id, funcao_id, por_turma, por_periodo, natureza_cargo)
);

-- 5. Trigger para geração do identificador sequencial CRH-XXXX
CREATE OR REPLACE FUNCTION public.fn_generate_crh_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'CRH-' || LPAD(nextval('seq_crh_configuracoes_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_crh_codigo ON public.crh_configuracoes;
CREATE TRIGGER trg_generate_crh_codigo
  BEFORE INSERT ON public.crh_configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_crh_codigo();

-- 6. Trigger de validação dinâmica no banco:
--    - Garante que a unidade exista e que o tipo_atendimento coincida com a unidade
--    - Garante que a função seja compatível com o cargo selecionado (presente em funcao_cargos)
--    - Garante que por_turma e por_periodo não sejam ambos 'Sim'
CREATE OR REPLACE FUNCTION public.fn_validate_crh_vinculos()
RETURNS trigger AS $$
DECLARE
  v_tipo_unidade TEXT;
  v_vinculo_existe BOOLEAN;
BEGIN
  -- Validar se por_turma e por_periodo são ambos Sim
  IF NEW.por_turma = 'Sim' AND NEW.por_periodo = 'Sim' THEN
    RAISE EXCEPTION 'Critérios incompatíveis: os campos "Por Turma?" e "Por Período?" não podem ser selecionados simultaneamente como "Sim".';
  END IF;

  -- Validar unidade escolar e tipo_atendimento
  SELECT tipo_atendimento INTO v_tipo_unidade
  FROM public.unidades_escolares
  WHERE id = NEW.unidade_escolar_id;

  IF v_tipo_unidade IS NULL THEN
    RAISE EXCEPTION 'Unidade escolar vinculada não encontrada.';
  END IF;

  IF NEW.tipo_atendimento <> v_tipo_unidade THEN
    RAISE EXCEPTION 'Tipo de atendimento inconsistente: o tipo informado (%) difere do tipo cadastrado na unidade escolar (%).', NEW.tipo_atendimento, v_tipo_unidade;
  END IF;

  -- Validar se a função é compatível com o cargo selecionado via funcao_cargos
  SELECT EXISTS (
    SELECT 1 FROM public.funcao_cargos
    WHERE funcao_id = NEW.funcao_id AND cargo_id = NEW.cargo_id
  ) INTO v_vinculo_existe;

  IF NOT v_vinculo_existe THEN
    RAISE EXCEPTION 'Vínculo incompatível: a função selecionada não está vinculada ao cargo informado na matriz de funções e cargos.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_crh_vinculos ON public.crh_configuracoes;
CREATE TRIGGER trg_validate_crh_vinculos
  BEFORE INSERT OR UPDATE ON public.crh_configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_crh_vinculos();

-- 7. Habilitar RLS e políticas na tabela crh_configuracoes
ALTER TABLE public.crh_configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_crh" ON public.crh_configuracoes;
CREATE POLICY "authenticated_select_crh" ON public.crh_configuracoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_crh" ON public.crh_configuracoes;
CREATE POLICY "authenticated_insert_crh" ON public.crh_configuracoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_crh" ON public.crh_configuracoes;
CREATE POLICY "authenticated_update_crh" ON public.crh_configuracoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_crh" ON public.crh_configuracoes;
CREATE POLICY "authenticated_delete_crh" ON public.crh_configuracoes
  FOR DELETE TO authenticated USING (true);

-- 8. Índices para performance e consultas
CREATE INDEX IF NOT EXISTS idx_crh_codigo ON public.crh_configuracoes(codigo);
CREATE INDEX IF NOT EXISTS idx_crh_ano_letivo ON public.crh_configuracoes(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_crh_unidade ON public.crh_configuracoes(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_crh_cargo ON public.crh_configuracoes(cargo_id);
CREATE INDEX IF NOT EXISTS idx_crh_funcao ON public.crh_configuracoes(funcao_id);

-- 9. Atualizar matriz de permissões de perfil para incluir 'crh' em Cadastros de Apoio
-- Ordem das rotas:
-- 1: painel
-- 2: unidades_escolares
-- 3: turmas
-- 4: cargos
-- 5: funcoes
-- 6: etapas
-- 7: anos_series
-- 8: crh (Configurações de RH - CRH)
-- 9: usuarios
-- 10: contas_email
-- 11: auditoria
UPDATE public.permissoes_perfil SET ordem = 11 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 10 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 9 WHERE menu_key = 'usuarios';

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'crh', 'Configurações de RH (CRH)', true, true, true, 8)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Configurações de RH (CRH)',
    pode_ver = true,
    suporta_edicao = true,
    ordem = 8;

-- 10. Atualizar matriz de permissões por usuário (permissoes_usuario)
UPDATE public.permissoes_usuario SET ordem = 11 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 10 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 9 WHERE menu_key = 'usuarios';

-- Para todos os operadores já existentes no sistema, adicionar permissão para 'crh'
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'crh', 'Configurações de RH (CRH)', true, true, true, 8)
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
