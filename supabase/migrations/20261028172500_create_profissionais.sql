-- Migração: Criação do Cadastro de Profissionais e Vínculo com Vagas
-- Tabelas: profissionais, profissional_vagas
-- Sequência e trigger para PRO-0001
-- RLS habilitado e políticas para usuários autenticados
-- Atualização das permissões padrão (permissoes_perfil e permissoes_usuario)

-- 1. Sequência para identificador de profissionais (PRO-0001, PRO-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_profissionais_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de profissionais
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  unidade_escolar_id UUID NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Função e Trigger para gerar código PRO-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_profissional_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PRO-' || LPAD(nextval('seq_profissionais_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_profissional_codigo ON public.profissionais;
CREATE TRIGGER trg_generate_profissional_codigo
  BEFORE INSERT ON public.profissionais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_profissional_codigo();

-- 4. Tabela de vínculos profissional_vagas
CREATE TABLE IF NOT EXISTS public.profissional_vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  vaga_id UUID NOT NULL REFERENCES public.vaga(id) ON DELETE CASCADE,
  titular BOOLEAN NOT NULL DEFAULT true,
  cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_profissional_vaga UNIQUE (profissional_id, vaga_id)
);

-- 5. Habilitar RLS e criar políticas
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_vagas ENABLE ROW LEVEL SECURITY;

-- Políticas para profissionais
DROP POLICY IF EXISTS "authenticated_select_profissionais" ON public.profissionais;
CREATE POLICY "authenticated_select_profissionais" ON public.profissionais
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_profissionais" ON public.profissionais;
CREATE POLICY "authenticated_insert_profissionais" ON public.profissionais
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_profissionais" ON public.profissionais;
CREATE POLICY "authenticated_update_profissionais" ON public.profissionais
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_profissionais" ON public.profissionais;
CREATE POLICY "authenticated_delete_profissionais" ON public.profissionais
  FOR DELETE TO authenticated USING (true);

-- Políticas para profissional_vagas
DROP POLICY IF EXISTS "authenticated_select_profissional_vagas" ON public.profissional_vagas;
CREATE POLICY "authenticated_select_profissional_vagas" ON public.profissional_vagas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_profissional_vagas" ON public.profissional_vagas;
CREATE POLICY "authenticated_insert_profissional_vagas" ON public.profissional_vagas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_profissional_vagas" ON public.profissional_vagas;
CREATE POLICY "authenticated_update_profissional_vagas" ON public.profissional_vagas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_profissional_vagas" ON public.profissional_vagas;
CREATE POLICY "authenticated_delete_profissional_vagas" ON public.profissional_vagas
  FOR DELETE TO authenticated USING (true);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_profissionais_codigo ON public.profissionais(codigo);
CREATE INDEX IF NOT EXISTS idx_profissionais_nome ON public.profissionais(nome);
CREATE INDEX IF NOT EXISTS idx_profissionais_unidade ON public.profissionais(unidade_escolar_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_ativo ON public.profissionais(ativo);

CREATE INDEX IF NOT EXISTS idx_prof_vagas_profissional ON public.profissional_vagas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_prof_vagas_vaga ON public.profissional_vagas(vaga_id);
CREATE INDEX IF NOT EXISTS idx_prof_vagas_cargo ON public.profissional_vagas(cargo_id);

-- 7. Inclusão de "profissionais" na matriz de permissões
-- Inserir em permissoes_perfil para Administrador e Operador
INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES
  ('Administrador', 'profissionais', 'Profissionais', true, true, true, 4),
  ('Operador', 'profissionais', 'Profissionais', true, true, true, 4)
ON CONFLICT (perfil, menu_key) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  suporta_edicao = EXCLUDED.suporta_edicao;

-- Liberar também para todos os operadores/usuários já existentes na tabela permissoes_usuario
INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT
  u.id AS usuario_id,
  'profissionais' AS menu_key,
  'Profissionais' AS menu_label,
  true AS pode_ver,
  true AS pode_editar,
  true AS suporta_edicao,
  4 AS ordem
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO NOTHING;
