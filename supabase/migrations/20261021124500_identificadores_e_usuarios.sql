-- Migração para identificadores automáticos (UN-, MUN-, TIP-, USR-)
-- e tabela usuarios_sistema para gestão de usuários

-- 1. Sequências para cada cadastro
CREATE SEQUENCE IF NOT EXISTS seq_escolas_codigo START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_municipios_codigo START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_tipos_escola_codigo START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_usuarios_codigo START WITH 1 INCREMENT BY 1;

-- 2. Adicionar colunas 'codigo' (identificador) nas tabelas existentes
ALTER TABLE public.municipios_rede ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE public.tipos_escola ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS codigo TEXT;

-- 3. Preencher identificadores sequenciais existentes (backfill ordenado por created_at)
DO $$
DECLARE
  r RECORD;
  seq_val INT;
BEGIN
  -- Backfill municipios_rede (MUN-XXXX)
  FOR r IN SELECT id FROM public.municipios_rede WHERE codigo IS NULL OR codigo = '' ORDER BY created_at ASC LOOP
    seq_val := nextval('seq_municipios_codigo');
    UPDATE public.municipios_rede
    SET codigo = 'MUN-' || LPAD(seq_val::text, 4, '0')
    WHERE id = r.id;
  END LOOP;

  -- Backfill tipos_escola (TIP-XXXX)
  FOR r IN SELECT id FROM public.tipos_escola WHERE codigo IS NULL OR codigo = '' ORDER BY created_at ASC LOOP
    seq_val := nextval('seq_tipos_escola_codigo');
    UPDATE public.tipos_escola
    SET codigo = 'TIP-' || LPAD(seq_val::text, 4, '0')
    WHERE id = r.id;
  END LOOP;

  -- Backfill escolas (UN-XXXX)
  FOR r IN SELECT id FROM public.escolas WHERE codigo IS NULL OR codigo = '' ORDER BY created_at ASC LOOP
    seq_val := nextval('seq_escolas_codigo');
    UPDATE public.escolas
    SET codigo = 'UN-' || LPAD(seq_val::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Função e trigger para gerar automaticamente o código ao inserir
CREATE OR REPLACE FUNCTION public.fn_generate_escola_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'UN-' || LPAD(nextval('seq_escolas_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_escola_codigo ON public.escolas;
CREATE TRIGGER trg_generate_escola_codigo
  BEFORE INSERT ON public.escolas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_escola_codigo();

CREATE OR REPLACE FUNCTION public.fn_generate_municipio_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MUN-' || LPAD(nextval('seq_municipios_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_municipio_codigo ON public.municipios_rede;
CREATE TRIGGER trg_generate_municipio_codigo
  BEFORE INSERT ON public.municipios_rede
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_municipio_codigo();

CREATE OR REPLACE FUNCTION public.fn_generate_tipo_escola_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'TIP-' || LPAD(nextval('seq_tipos_escola_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_tipo_escola_codigo ON public.tipos_escola;
CREATE TRIGGER trg_generate_tipo_escola_codigo
  BEFORE INSERT ON public.tipos_escola
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_tipo_escola_codigo();

-- 5. Criar tabela de usuários do sistema (usuarios_sistema)
-- Mantém relação com auth.users se existir, mas também suporta identificador USR-XXXX, nome, email, perfil, estado
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  codigo TEXT UNIQUE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil TEXT NOT NULL DEFAULT 'Operador' CHECK (perfil IN ('Administrador', 'Operador')),
  estado TEXT NOT NULL DEFAULT 'Ativo' CHECK (estado IN ('Ativo', 'Inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para gerar código USR-XXXX
CREATE OR REPLACE FUNCTION public.fn_generate_usuario_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'USR-' || LPAD(nextval('seq_usuarios_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_usuario_codigo ON public.usuarios_sistema;
CREATE TRIGGER trg_generate_usuario_codigo
  BEFORE INSERT ON public.usuarios_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_usuario_codigo();

-- 6. Habilitar RLS e criar políticas para usuarios_sistema
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_usuarios" ON public.usuarios_sistema;
CREATE POLICY "authenticated_select_usuarios" ON public.usuarios_sistema
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_usuarios" ON public.usuarios_sistema;
CREATE POLICY "authenticated_insert_usuarios" ON public.usuarios_sistema
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_usuarios" ON public.usuarios_sistema;
CREATE POLICY "authenticated_update_usuarios" ON public.usuarios_sistema
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_usuarios" ON public.usuarios_sistema;
CREATE POLICY "authenticated_delete_usuarios" ON public.usuarios_sistema
  FOR DELETE TO authenticated USING (true);

-- 7. Criar índices
CREATE INDEX IF NOT EXISTS idx_escolas_codigo ON public.escolas(codigo);
CREATE INDEX IF NOT EXISTS idx_municipios_codigo ON public.municipios_rede(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_escola_codigo ON public.tipos_escola(codigo);
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo ON public.usuarios_sistema(codigo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios_sistema(email);

-- 8. Backfill do usuário seed atual (renato.guenther@ajrd.com.br) na tabela usuarios_sistema se ainda não existir
DO $$
DECLARE
  seed_user_id UUID;
BEGIN
  SELECT id INTO seed_user_id FROM auth.users WHERE email = 'renato.guenther@ajrd.com.br' LIMIT 1;
  IF seed_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios_sistema WHERE email = 'renato.guenther@ajrd.com.br') THEN
      INSERT INTO public.usuarios_sistema (user_id, nome_completo, email, perfil, estado)
      VALUES (seed_user_id, 'Renato Guenther', 'renato.guenther@ajrd.com.br', 'Administrador', 'Ativo');
    END IF;
  END IF;
END $$;
