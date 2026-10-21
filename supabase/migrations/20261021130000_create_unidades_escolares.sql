-- Migração: Criação da tabela unidades_escolares e migração dos dados existentes
-- Mantém a sequência UN sequencial unificada

CREATE TABLE IF NOT EXISTS public.unidades_escolares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  tipo_atendimento TEXT NOT NULL,
  nivel_porte TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.unidades_escolares ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para autenticados
DROP POLICY IF EXISTS "authenticated_select_unidades_escolares" ON public.unidades_escolares;
CREATE POLICY "authenticated_select_unidades_escolares" ON public.unidades_escolares
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_unidades_escolares" ON public.unidades_escolares;
CREATE POLICY "authenticated_insert_unidades_escolares" ON public.unidades_escolares
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_unidades_escolares" ON public.unidades_escolares;
CREATE POLICY "authenticated_update_unidades_escolares" ON public.unidades_escolares
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_unidades_escolares" ON public.unidades_escolares;
CREATE POLICY "authenticated_delete_unidades_escolares" ON public.unidades_escolares
  FOR DELETE TO authenticated USING (true);

-- Trigger para gerar código UN-XXXX sequencial a partir da seq_escolas_codigo
CREATE OR REPLACE FUNCTION public.fn_generate_unidade_escolar_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'UN-' || LPAD(nextval('seq_escolas_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_unidade_escolar_codigo ON public.unidades_escolares;
CREATE TRIGGER trg_generate_unidade_escolar_codigo
  BEFORE INSERT ON public.unidades_escolares
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_unidade_escolar_codigo();

-- Migrar escolas existentes para unidades_escolares mantendo código UN e adaptando os campos
INSERT INTO public.unidades_escolares (id, codigo, nome, tipo_atendimento, nivel_porte, localizacao, created_at, updated_at)
SELECT
  e.id,
  e.codigo,
  e.nome,
  CASE
    WHEN te.nome ILIKE '%infantil%' AND te.nome NOT ILIKE '%fundamental%' THEN 'Educação Infantil (40h)'
    ELSE 'Ensino Fundamental e Educação Infantil (20h)'
  END AS tipo_atendimento,
  CASE
    WHEN te.nome ILIKE '%infantil%' AND te.nome NOT ILIKE '%fundamental%' THEN 'Nível A'
    ELSE 'Nível I'
  END AS nivel_porte,
  COALESCE(NULLIF(e.endereco, ''), 'Zona Urbana') AS localizacao,
  e.created_at,
  e.updated_at
FROM public.escolas e
LEFT JOIN public.tipos_escola te ON te.id = e.tipo_escola_id
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_unidades_escolares_codigo ON public.unidades_escolares(codigo);
CREATE INDEX IF NOT EXISTS idx_unidades_escolares_nome ON public.unidades_escolares(nome);
