-- Migração para Gestão de Permissões de Perfis (Versão 0.0.26)
-- Tabela para configuração de permissões por menu para perfis (ex: Operador)

CREATE SEQUENCE IF NOT EXISTS seq_permissoes_codigo START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.permissoes_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  perfil TEXT NOT NULL,
  menu_key TEXT NOT NULL,
  menu_label TEXT NOT NULL,
  pode_ver BOOLEAN NOT NULL DEFAULT true,
  pode_editar BOOLEAN NOT NULL DEFAULT false,
  suporta_edicao BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_permissoes_perfil_menu UNIQUE (perfil, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_perfil ON public.permissoes_perfil(perfil);
CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_menu_key ON public.permissoes_perfil(menu_key);

-- Trigger para identificador automático PERM-XXXX
CREATE OR REPLACE FUNCTION public.fn_generate_permissao_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PERM-' || LPAD(nextval('seq_permissoes_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_permissao_codigo ON public.permissoes_perfil;
CREATE TRIGGER trg_generate_permissao_codigo
  BEFORE INSERT ON public.permissoes_perfil
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_permissao_codigo();

-- RLS
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler (o operador lê a sua permissão, admin lê para configurar)
DROP POLICY IF EXISTS "authenticated_select_permissoes" ON public.permissoes_perfil;
CREATE POLICY "authenticated_select_permissoes" ON public.permissoes_perfil
  FOR SELECT TO authenticated USING (true);

-- Modificação (INSERT/UPDATE/DELETE): apenas Administrador pode alterar
DROP POLICY IF EXISTS "admin_insert_permissoes" ON public.permissoes_perfil;
CREATE POLICY "admin_insert_permissoes" ON public.permissoes_perfil
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  );

DROP POLICY IF EXISTS "admin_update_permissoes" ON public.permissoes_perfil;
CREATE POLICY "admin_update_permissoes" ON public.permissoes_perfil
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

DROP POLICY IF EXISTS "admin_delete_permissoes" ON public.permissoes_perfil;
CREATE POLICY "admin_delete_permissoes" ON public.permissoes_perfil
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_sistema u
      WHERE (u.user_id = auth.uid() OR u.email = auth.jwt()->>'email')
        AND u.perfil = 'Administrador'
        AND u.estado = 'Ativo'
    )
  );

-- Inserir permissões iniciais padrão para o perfil Operador (idempotente)
-- Menus do sistema:
-- 1. painel: Painel de Início (suporta_edicao: false)
-- 2. unidades_escolares: Unidades escolares (suporta_edicao: true)
-- 3. cargos: Cargos (suporta_edicao: true)
-- 4. funcoes: Funções (suporta_edicao: true)
-- 5. usuarios: Usuários (suporta_edicao: true)
-- 6. contas_email: Contas de Email (suporta_edicao: true)
-- 7. auditoria: Auditoria (suporta_edicao: false — somente leitura)

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES
  ('Operador', 'painel', 'Painel de Início', true, false, false, 1),
  ('Operador', 'unidades_escolares', 'Unidades escolares', true, false, true, 2),
  ('Operador', 'cargos', 'Cargos', true, false, true, 3),
  ('Operador', 'funcoes', 'Funções', true, false, true, 4),
  ('Operador', 'usuarios', 'Usuários', false, false, true, 5),
  ('Operador', 'contas_email', 'Contas de Email', false, false, true, 6),
  ('Operador', 'auditoria', 'Auditoria', true, false, false, 7)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;
