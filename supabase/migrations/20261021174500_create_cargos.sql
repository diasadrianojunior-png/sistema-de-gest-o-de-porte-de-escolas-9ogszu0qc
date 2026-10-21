-- Migração: Criação da tabela cargos com identificador sequencial CAR-0001, RLS e pré-cadastro dos 15 cargos
-- Data: 2026-10-21

-- 1. Sequência para identificador de cargos (CAR-0001, CAR-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_cargos_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Função e Trigger para gerar código CAR-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_cargo_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'CAR-' || LPAD(nextval('seq_cargos_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_cargo_codigo ON public.cargos;
CREATE TRIGGER trg_generate_cargo_codigo
  BEFORE INSERT ON public.cargos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_cargo_codigo();

-- 4. Habilitar RLS e criar políticas para usuários autenticados
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_cargos" ON public.cargos;
CREATE POLICY "authenticated_select_cargos" ON public.cargos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_cargos" ON public.cargos;
CREATE POLICY "authenticated_insert_cargos" ON public.cargos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_cargos" ON public.cargos;
CREATE POLICY "authenticated_update_cargos" ON public.cargos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_cargos" ON public.cargos;
CREATE POLICY "authenticated_delete_cargos" ON public.cargos
  FOR DELETE TO authenticated USING (true);

-- 5. Índices de busca e unicidade
CREATE INDEX IF NOT EXISTS idx_cargos_codigo ON public.cargos(codigo);
CREATE INDEX IF NOT EXISTS idx_cargos_nome ON public.cargos(nome);

-- 6. Pré-cadastro dos 15 cargos solicitados pelo usuário (na ordem solicitada)
-- O trigger gerará automaticamente os identificadores sequenciais CAR-0001 a CAR-0015
DO $$
DECLARE
  cargo_item TEXT;
  cargos_iniciais TEXT[] := ARRAY[
    'Professor de Educação Infantil e do Ensino Fundamental - Anos Iniciais (20h)',
    'Professor de Educação Infantil (40h)',
    'Professor de Educação Física',
    'Professor de Arte',
    'Assistente Administrativo II',
    'Auxiliar de Serviços Gerais',
    'Agente Educacional I',
    'Agente Educacional II',
    'Serviço terceirizado de Recepcionista',
    'Serviço terceirizado de Apoio Educacional',
    'Serviço terceirizado de Copa, Cantina e Merenda',
    'Serviço terceirizado de Zeladoria',
    'Serviço terceirizado de Limpeza',
    'Serviço de Inspetoria',
    'Vigilante Armado'
  ];
BEGIN
  FOREACH cargo_item IN ARRAY cargos_iniciais LOOP
    IF NOT EXISTS (SELECT 1 FROM public.cargos WHERE nome = cargo_item) THEN
      INSERT INTO public.cargos (nome) VALUES (cargo_item);
    END IF;
  END LOOP;
END $$;
