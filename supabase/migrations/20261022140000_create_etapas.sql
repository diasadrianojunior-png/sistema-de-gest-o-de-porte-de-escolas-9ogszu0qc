-- Migração: Criação da tabela etapas com identificador sequencial ETA-0001, RLS e permissões
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.28

-- 1. Sequência para identificador de etapas (ETA-0001, ETA-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_etapas_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de etapas (Identificador, Nome da Etapa, Ano Letivo)
CREATE TABLE IF NOT EXISTS public.etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_etapas_ano_letivo CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040)
);

-- 3. Função e Trigger para gerar código ETA-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_etapa_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'ETA-' || LPAD(nextval('seq_etapas_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_etapa_codigo ON public.etapas;
CREATE TRIGGER trg_generate_etapa_codigo
  BEFORE INSERT ON public.etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_etapa_codigo();

-- 4. Habilitar RLS e criar políticas para usuários autenticados
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_etapas" ON public.etapas;
CREATE POLICY "authenticated_select_etapas" ON public.etapas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_etapas" ON public.etapas;
CREATE POLICY "authenticated_insert_etapas" ON public.etapas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_etapas" ON public.etapas;
CREATE POLICY "authenticated_update_etapas" ON public.etapas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_etapas" ON public.etapas;
CREATE POLICY "authenticated_delete_etapas" ON public.etapas
  FOR DELETE TO authenticated USING (true);

-- 5. Índices de busca e unicidade
CREATE INDEX IF NOT EXISTS idx_etapas_codigo ON public.etapas(codigo);
CREATE INDEX IF NOT EXISTS idx_etapas_nome ON public.etapas(nome);
CREATE INDEX IF NOT EXISTS idx_etapas_ano_letivo ON public.etapas(ano_letivo);

-- 6. Atualizar a matriz de permissões de perfil para incluir 'etapas'
-- Reordenar itens de permissões se necessário (Cargos=3, Funcoes=4, Etapas=5, Usuarios=6, ContasEmail=7, Auditoria=8)
UPDATE public.permissoes_perfil SET ordem = 8 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 7 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 6 WHERE menu_key = 'usuarios';

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'etapas', 'Etapas', true, false, true, 5)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Etapas', suporta_edicao = true, ordem = 5;

-- 7. Atualizar a matriz de permissões por usuário (permissoes_usuario)
UPDATE public.permissoes_usuario SET ordem = 8 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 7 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 6 WHERE menu_key = 'usuarios';

-- Para todos os operadores já existentes no sistema, adicionar permissão para 'etapas' (pode_ver=true, pode_editar=true conforme o padrão de introdução de menus)
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'etapas', 'Etapas', true, true, true, 5)
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
