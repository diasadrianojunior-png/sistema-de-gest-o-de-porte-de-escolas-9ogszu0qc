-- Migração: Criação do cadastro "Porte da Escola por Ano Letivo" (porte_escola_ano)
-- Sequência e trigger para PRT-0001
-- FK para unidades_escolares (ON DELETE RESTRICT para reforçar no banco)
-- Unique (unidade_escolar_id, ano_letivo)
-- RLS habilitado e políticas para usuários autenticados
-- Inclusão na matriz de permissões para Administrador e Operador

-- 1. Sequência para identificador de Porte da Escola (PRT-0001, PRT-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_porte_escola_ano_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela porte_escola_ano
CREATE TABLE IF NOT EXISTS public.porte_escola_ano (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE RESTRICT,
  ano_letivo INTEGER NOT NULL CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040),
  quantidade_alunos INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_alunos >= 0),
  nivel_faixa TEXT NOT NULL,
  nivel_sugerido TEXT,
  justificativa_mudanca TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_porte_escola_unidade_ano UNIQUE (unidade_escolar_id, ano_letivo)
);

-- 3. Função e Trigger para gerar código PRT-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_porte_escola_ano_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PRT-' || LPAD(nextval('seq_porte_escola_ano_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_porte_escola_ano_codigo ON public.porte_escola_ano;
CREATE TRIGGER trg_generate_porte_escola_ano_codigo
  BEFORE INSERT ON public.porte_escola_ano
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_porte_escola_ano_codigo();

-- 4. Habilitar RLS e criar políticas
ALTER TABLE public.porte_escola_ano ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_porte_escola_ano" ON public.porte_escola_ano;
CREATE POLICY "authenticated_select_porte_escola_ano" ON public.porte_escola_ano
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_porte_escola_ano" ON public.porte_escola_ano;
CREATE POLICY "authenticated_insert_porte_escola_ano" ON public.porte_escola_ano
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_porte_escola_ano" ON public.porte_escola_ano;
CREATE POLICY "authenticated_update_porte_escola_ano" ON public.porte_escola_ano
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_porte_escola_ano" ON public.porte_escola_ano;
CREATE POLICY "authenticated_delete_porte_escola_ano" ON public.porte_escola_ano
  FOR DELETE TO authenticated USING (true);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_porte_escola_ano_codigo ON public.porte_escola_ano(codigo);
CREATE INDEX IF NOT EXISTS idx_porte_escola_ano_unidade ON public.porte_escola_ano(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_porte_escola_ano_ano ON public.porte_escola_ano(ano_letivo);

-- 6. Inclusão de "porte_escola" na matriz de permissões
INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES
  ('Administrador', 'porte_escola', 'Porte da Escola por Ano Letivo', true, true, true, 5),
  ('Operador', 'porte_escola', 'Porte da Escola por Ano Letivo', true, true, true, 5)
ON CONFLICT (perfil, menu_key) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  suporta_edicao = EXCLUDED.suporta_edicao;

-- Liberar também para todos os operadores/usuários já existentes na tabela permissoes_usuario
INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT
  u.id AS usuario_id,
  'porte_escola' AS menu_key,
  'Porte da Escola por Ano Letivo' AS menu_label,
  true AS pode_ver,
  true AS pode_editar,
  true AS suporta_edicao,
  5 AS ordem
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO NOTHING;
