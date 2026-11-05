-- Migração: Criação do Cadastro de Especializações (Cadastros de Apoio)
-- Tabela: especializacoes
-- Atributos: nome (Nome da Especialidade, obrigatório) e
--            classificacao (Classificação da Especialidade, obrigatório) com opções fixas:
--            Graduação, Pós-Graduação, Mestrado, Doutorado, Pós-Doutorado
-- Sequência e trigger para identificador automático ESP-0001, ESP-0002, ...
-- RLS habilitado e políticas para usuários autenticados
-- Atualização das permissões padrão (permissoes_perfil e permissoes_usuario)

-- 1. Sequência para identificador de especializações (ESP-0001, ESP-0002, ...)
CREATE SEQUENCE IF NOT EXISTS seq_especializacoes_codigo START WITH 1 INCREMENT BY 1;

-- 2. Tabela de especializações
CREATE TABLE IF NOT EXISTS public.especializacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Função e Trigger para gerar código ESP-XXXX sequencial
CREATE OR REPLACE FUNCTION public.fn_generate_especializacao_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'ESP-' || LPAD(nextval('seq_especializacoes_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_especializacao_codigo ON public.especializacoes;
CREATE TRIGGER trg_generate_especializacao_codigo
  BEFORE INSERT ON public.especializacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_especializacao_codigo();

-- 4. Habilitar RLS e criar políticas
ALTER TABLE public.especializacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_especializacoes" ON public.especializacoes;
CREATE POLICY "authenticated_select_especializacoes" ON public.especializacoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_especializacoes" ON public.especializacoes;
CREATE POLICY "authenticated_insert_especializacoes" ON public.especializacoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_especializacoes" ON public.especializacoes;
CREATE POLICY "authenticated_update_especializacoes" ON public.especializacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_especializacoes" ON public.especializacoes;
CREATE POLICY "authenticated_delete_especializacoes" ON public.especializacoes
  FOR DELETE TO authenticated USING (true);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_especializacoes_codigo ON public.especializacoes(codigo);
CREATE INDEX IF NOT EXISTS idx_especializacoes_nome ON public.especializacoes(nome);
CREATE INDEX IF NOT EXISTS idx_especializacoes_classificacao ON public.especializacoes(classificacao);

-- 6. Inclusão de "especializacoes" na matriz de permissões
-- Inserir em permissoes_perfil para Administrador e Operador
INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES
  ('Administrador', 'especializacoes', 'Especializações', true, true, true, 16),
  ('Operador', 'especializacoes', 'Especializações', true, true, true, 16)
ON CONFLICT (perfil, menu_key) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  suporta_edicao = EXCLUDED.suporta_edicao;

-- Liberar também para todos os operadores/usuários já existentes na tabela permissoes_usuario
INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT
  u.id AS usuario_id,
  'especializacoes' AS menu_key,
  'Especializações' AS menu_label,
  true AS pode_ver,
  true AS pode_editar,
  true AS suporta_edicao,
  16 AS ordem
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO NOTHING;
