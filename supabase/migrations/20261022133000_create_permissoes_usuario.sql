-- Migração para Gestão de Permissões Individuais por Usuário (Versão 0.0.27)
-- Substitui permissões globais de perfil por permissões por usuário (Operador)

CREATE SEQUENCE IF NOT EXISTS seq_permissoes_usuario_codigo START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.permissoes_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios_sistema(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  menu_label TEXT NOT NULL,
  pode_ver BOOLEAN NOT NULL DEFAULT true,
  pode_editar BOOLEAN NOT NULL DEFAULT false,
  suporta_edicao BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_permissoes_usuario_menu UNIQUE (usuario_id, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_uid ON public.permissoes_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_menu ON public.permissoes_usuario(menu_key);

-- Trigger para identificador automático PERM-XXXX
CREATE OR REPLACE FUNCTION public.fn_generate_permissao_usuario_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PERM-' || LPAD(nextval('seq_permissoes_usuario_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_permissao_usuario_codigo ON public.permissoes_usuario;
CREATE TRIGGER trg_generate_permissao_usuario_codigo
  BEFORE INSERT ON public.permissoes_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_permissao_usuario_codigo();

-- RLS
ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler (o operador lê a sua própria permissão, admin lê para configurar)
DROP POLICY IF EXISTS "authenticated_select_permissoes_usuario" ON public.permissoes_usuario;
CREATE POLICY "authenticated_select_permissoes_usuario" ON public.permissoes_usuario
  FOR SELECT TO authenticated USING (true);

-- Modificação (INSERT/UPDATE/DELETE): apenas Administrador pode alterar
DROP POLICY IF EXISTS "admin_insert_permissoes_usuario" ON public.permissoes_usuario;
CREATE POLICY "admin_insert_permissoes_usuario" ON public.permissoes_usuario
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  );

DROP POLICY IF EXISTS "admin_update_permissoes_usuario" ON public.permissoes_usuario;
CREATE POLICY "admin_update_permissoes_usuario" ON public.permissoes_usuario
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  );

DROP POLICY IF EXISTS "admin_delete_permissoes_usuario" ON public.permissoes_usuario;
CREATE POLICY "admin_delete_permissoes_usuario" ON public.permissoes_usuario
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  );

-- Migração de dados: para cada usuário do perfil 'Operador' já existente no banco,
-- copiar as configurações da tabela permissoes_perfil (se houver) ou criar os padrões
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    -- Inserir registros para o operador baseados em permissoes_perfil
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    SELECT
      u.id,
      pp.menu_key,
      pp.menu_label,
      pp.pode_ver,
      pp.pode_editar,
      pp.suporta_edicao,
      pp.ordem
    FROM public.permissoes_perfil pp
    WHERE pp.perfil = 'Operador'
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
