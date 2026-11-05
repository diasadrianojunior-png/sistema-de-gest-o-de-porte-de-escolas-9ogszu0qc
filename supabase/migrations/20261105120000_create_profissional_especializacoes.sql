-- Migração: Especialidade(s) do Profissional (relacionamento N:N)
-- Tabela de junção: profissional_especializacoes
-- Relaciona profissionais (Cadastro de Profissionais) com especializacoes (Cadastros de Apoio).
-- O vínculo é OPCIONAL (0..N especialidades por profissional).
-- A FK para especializacoes usa ON DELETE RESTRICT para impedir no banco a exclusão
-- de uma especialização ainda vinculada a algum profissional (regra permanente de
-- bloqueio de exclusão por referência), além do bloqueio amigável na aplicação.
-- RLS habilitado e políticas para usuários autenticados (padrão do projeto).

CREATE TABLE IF NOT EXISTS public.profissional_especializacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  especializacao_id UUID NOT NULL REFERENCES public.especializacoes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_profissional_especializacao UNIQUE (profissional_id, especializacao_id)
);

ALTER TABLE public.profissional_especializacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_profissional_especializacoes" ON public.profissional_especializacoes;
CREATE POLICY "authenticated_select_profissional_especializacoes" ON public.profissional_especializacoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_profissional_especializacoes" ON public.profissional_especializacoes;
CREATE POLICY "authenticated_insert_profissional_especializacoes" ON public.profissional_especializacoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_profissional_especializacoes" ON public.profissional_especializacoes;
CREATE POLICY "authenticated_update_profissional_especializacoes" ON public.profissional_especializacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_profissional_especializacoes" ON public.profissional_especializacoes;
CREATE POLICY "authenticated_delete_profissional_especializacoes" ON public.profissional_especializacoes
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_prof_esp_profissional ON public.profissional_especializacoes(profissional_id);
CREATE INDEX IF NOT EXISTS idx_prof_esp_especializacao ON public.profissional_especializacoes(especializacao_id);
