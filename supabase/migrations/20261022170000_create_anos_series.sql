-- Migração: Criação da tabela anos_series com identificador sequencial ANO-0001, RLS e permissões
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.30

-- 1. Sequência para identificador de anos/séries (ANO-0001, ANO-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_anos_series_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de anos/séries (Identificador, Nome do Ano/Série, Ano Letivo)
CREATE TABLE IF NOT EXISTS public.anos_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_anos_series_ano_letivo CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040)
);

-- 3. Função e Trigger para gerar código ANO-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_ano_serie_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'ANO-' || LPAD(nextval('seq_anos_series_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_ano_serie_codigo ON public.anos_series;
CREATE TRIGGER trg_generate_ano_serie_codigo
  BEFORE INSERT ON public.anos_series
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_ano_serie_codigo();

-- 4. Habilitar RLS e criar políticas para usuários autenticados
ALTER TABLE public.anos_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_anos_series" ON public.anos_series;
CREATE POLICY "authenticated_select_anos_series" ON public.anos_series
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_anos_series" ON public.anos_series;
CREATE POLICY "authenticated_insert_anos_series" ON public.anos_series
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_anos_series" ON public.anos_series;
CREATE POLICY "authenticated_update_anos_series" ON public.anos_series
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_anos_series" ON public.anos_series;
CREATE POLICY "authenticated_delete_anos_series" ON public.anos_series
  FOR DELETE TO authenticated USING (true);

-- 5. Índices de busca e ordenação
CREATE INDEX IF NOT EXISTS idx_anos_series_codigo ON public.anos_series(codigo);
CREATE INDEX IF NOT EXISTS idx_anos_series_nome ON public.anos_series(nome);
CREATE INDEX IF NOT EXISTS idx_anos_series_ano_letivo ON public.anos_series(ano_letivo);

-- 6. Atualizar a matriz de permissões de perfil para incluir 'anos_series'
-- Nova ordenação:
-- 1: painel
-- 2: unidades_escolares
-- 3: cargos
-- 4: funcoes
-- 5: etapas
-- 6: anos_series (novo cadastro de apoio)
-- 7: usuarios
-- 8: contas_email
-- 9: auditoria

UPDATE public.permissoes_perfil SET ordem = 9 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 8 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 7 WHERE menu_key = 'usuarios';

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'anos_series', 'Ano/Série', true, true, true, 6)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Ano/Série',
    pode_ver = true,
    suporta_edicao = true,
    ordem = 6;

-- 7. Atualizar a matriz de permissões por usuário (permissoes_usuario)
UPDATE public.permissoes_usuario SET ordem = 9 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 8 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 7 WHERE menu_key = 'usuarios';

-- Para todos os operadores já existentes no sistema, adicionar permissão para 'anos_series'
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'anos_series', 'Ano/Série', true, true, true, 6)
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
