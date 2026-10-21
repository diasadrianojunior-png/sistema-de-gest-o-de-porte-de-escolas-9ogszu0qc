-- Migração: Criação da tabela funcoes e tabela de vinculo funcao_cargos
-- Identificador sequencial FUN-0001, FUN-0002...
-- RLS habilitado para authenticated
-- Tabela inicia vazia conforme especificação

-- 1. Sequência para identificador de funções (FUN-0001, FUN-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_funcoes_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de funções
CREATE TABLE IF NOT EXISTS public.funcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Função e Trigger para gerar código FUN-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_funcao_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'FUN-' || LPAD(nextval('seq_funcoes_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_funcao_codigo ON public.funcoes;
CREATE TRIGGER trg_generate_funcao_codigo
  BEFORE INSERT ON public.funcoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_funcao_codigo();

-- 4. Tabela de vínculo funcao_cargos (relação N:N)
CREATE TABLE IF NOT EXISTS public.funcao_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcao_id UUID NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_funcao_cargos UNIQUE (funcao_id, cargo_id)
);

-- 5. Habilitar RLS e criar políticas para usuários autenticados em public.funcoes
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_funcoes" ON public.funcoes;
CREATE POLICY "authenticated_select_funcoes" ON public.funcoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_funcoes" ON public.funcoes;
CREATE POLICY "authenticated_insert_funcoes" ON public.funcoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_funcoes" ON public.funcoes;
CREATE POLICY "authenticated_update_funcoes" ON public.funcoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_funcoes" ON public.funcoes;
CREATE POLICY "authenticated_delete_funcoes" ON public.funcoes
  FOR DELETE TO authenticated USING (true);

-- 6. Habilitar RLS e criar políticas para usuários autenticados em public.funcao_cargos
ALTER TABLE public.funcao_cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_funcao_cargos" ON public.funcao_cargos;
CREATE POLICY "authenticated_select_funcao_cargos" ON public.funcao_cargos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_funcao_cargos" ON public.funcao_cargos;
CREATE POLICY "authenticated_insert_funcao_cargos" ON public.funcao_cargos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_funcao_cargos" ON public.funcao_cargos;
CREATE POLICY "authenticated_update_funcao_cargos" ON public.funcao_cargos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_funcao_cargos" ON public.funcao_cargos;
CREATE POLICY "authenticated_delete_funcao_cargos" ON public.funcao_cargos
  FOR DELETE TO authenticated USING (true);

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_funcoes_codigo ON public.funcoes(codigo);
CREATE INDEX IF NOT EXISTS idx_funcoes_nome ON public.funcoes(nome);
CREATE INDEX IF NOT EXISTS idx_funcao_cargos_funcao_id ON public.funcao_cargos(funcao_id);
CREATE INDEX IF NOT EXISTS idx_funcao_cargos_cargo_id ON public.funcao_cargos(cargo_id);
