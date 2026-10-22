-- Migração: Criação da tabela turmas com identificador sequencial TUR-0001, RLS, vínculos e permissões
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.31

-- 1. Sequência para identificador de turmas (TUR-0001, TUR-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_turmas_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de turmas (Identificador, Nome da Turma, Etapa, Ano Letivo, Ano/Série)
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE RESTRICT,
  ano_letivo INTEGER NOT NULL,
  ano_serie_id UUID REFERENCES public.anos_series(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_turmas_ano_letivo CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040)
);

-- 3. Função e Trigger para gerar código TUR-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_turma_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'TUR-' || LPAD(nextval('seq_turmas_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_turma_codigo ON public.turmas;
CREATE TRIGGER trg_generate_turma_codigo
  BEFORE INSERT ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_turma_codigo();

-- 4. Função e Trigger de integridade dinâmica: garante que a etapa e o ano/série vinculados
--    pertençam ao mesmo ano letivo informado na turma (vínculos consistentes)
CREATE OR REPLACE FUNCTION public.fn_validate_turma_vinculos()
RETURNS trigger AS $$
DECLARE
  ano_etapa INTEGER;
  ano_serie INTEGER;
BEGIN
  IF NEW.etapa_id IS NOT NULL THEN
    SELECT ano_letivo INTO ano_etapa FROM public.etapas WHERE id = NEW.etapa_id;
    IF ano_etapa IS NULL THEN
      RAISE EXCEPTION 'Etapa vinculada não encontrada no cadastro de etapas.';
    END IF;
    IF ano_etapa <> NEW.ano_letivo THEN
      RAISE EXCEPTION 'Vínculo inconsistente: a etapa selecionada pertence ao ano letivo %, que difere do ano letivo % da turma.', ano_etapa, NEW.ano_letivo;
    END IF;
  END IF;

  IF NEW.ano_serie_id IS NOT NULL THEN
    SELECT ano_letivo INTO ano_serie FROM public.anos_series WHERE id = NEW.ano_serie_id;
    IF ano_serie IS NULL THEN
      RAISE EXCEPTION 'Ano/Série vinculado não encontrado no cadastro de anos/séries.';
    END IF;
    IF ano_serie <> NEW.ano_letivo THEN
      RAISE EXCEPTION 'Vínculo inconsistente: o ano/série selecionado pertence ao ano letivo %, que difere do ano letivo % da turma.', ano_serie, NEW.ano_letivo;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_turma_vinculos ON public.turmas;
CREATE TRIGGER trg_validate_turma_vinculos
  BEFORE INSERT OR UPDATE ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_turma_vinculos();

-- 5. Habilitar RLS e criar políticas para usuários autenticados
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_turmas" ON public.turmas;
CREATE POLICY "authenticated_select_turmas" ON public.turmas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_turmas" ON public.turmas;
CREATE POLICY "authenticated_insert_turmas" ON public.turmas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_turmas" ON public.turmas;
CREATE POLICY "authenticated_update_turmas" ON public.turmas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_turmas" ON public.turmas;
CREATE POLICY "authenticated_delete_turmas" ON public.turmas
  FOR DELETE TO authenticated USING (true);

-- 6. Índices de busca e ordenação
CREATE INDEX IF NOT EXISTS idx_turmas_codigo ON public.turmas(codigo);
CREATE INDEX IF NOT EXISTS idx_turmas_nome ON public.turmas(nome);
CREATE INDEX IF NOT EXISTS idx_turmas_ano_letivo ON public.turmas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_turmas_etapa_id ON public.turmas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ano_serie_id ON public.turmas(ano_serie_id);

-- 7. Atualizar a matriz de permissões de perfil para incluir 'turmas' (Cadastros Mestres)
-- Nova ordenação:
-- 1: painel
-- 2: unidades_escolares
-- 3: turmas (novo cadastro mestre)
-- 4: cargos
-- 5: funcoes
-- 6: etapas
-- 7: anos_series
-- 8: usuarios
-- 9: contas_email
-- 10: auditoria
UPDATE public.permissoes_perfil SET ordem = 10 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 9 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 8 WHERE menu_key = 'usuarios';
UPDATE public.permissoes_perfil SET ordem = 7 WHERE menu_key = 'anos_series';
UPDATE public.permissoes_perfil SET ordem = 6 WHERE menu_key = 'etapas';
UPDATE public.permissoes_perfil SET ordem = 5 WHERE menu_key = 'funcoes';
UPDATE public.permissoes_perfil SET ordem = 4 WHERE menu_key = 'cargos';

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'turmas', 'Turmas', true, true, true, 3)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Turmas',
    pode_ver = true,
    suporta_edicao = true,
    ordem = 3;

-- 8. Atualizar a matriz de permissões por usuário (permissoes_usuario)
UPDATE public.permissoes_usuario SET ordem = 10 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 9 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 8 WHERE menu_key = 'usuarios';
UPDATE public.permissoes_usuario SET ordem = 7 WHERE menu_key = 'anos_series';
UPDATE public.permissoes_usuario SET ordem = 6 WHERE menu_key = 'etapas';
UPDATE public.permissoes_usuario SET ordem = 5 WHERE menu_key = 'funcoes';
UPDATE public.permissoes_usuario SET ordem = 4 WHERE menu_key = 'cargos';

-- Para todos os operadores já existentes no sistema, adicionar permissão para 'turmas'
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'turmas', 'Turmas', true, true, true, 3)
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
