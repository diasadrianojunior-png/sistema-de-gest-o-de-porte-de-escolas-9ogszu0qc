-- Migration: adicionar suporte a Linhas do tipo CARGO em configuracao_rh_linha
-- Permite que uma linha de configuração referencie ou uma FUNÇÃO (tipo_linha = 'FUNCAO')
-- ou um CARGO direto (tipo_linha = 'CARGO').

DO $$
BEGIN
  -- 1. Adicionar coluna tipo_linha se não existir
  ALTER TABLE public.configuracao_rh_linha
    ADD COLUMN IF NOT EXISTS tipo_linha TEXT NOT NULL DEFAULT 'FUNCAO';

  -- 2. Adicionar coluna cargo_id se não existir (FK para public.cargos)
  ALTER TABLE public.configuracao_rh_linha
    ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id) ON DELETE RESTRICT;

  -- 3. Tornar funcao_id nullable (para permitir linhas puramente de cargo)
  ALTER TABLE public.configuracao_rh_linha
    ALTER COLUMN funcao_id DROP NOT NULL;

  -- 4. Constraint de validação para tipo_linha e integridade:
  -- Se tipo_linha = 'FUNCAO' -> funcao_id NOT NULL
  -- Se tipo_linha = 'CARGO'  -> cargo_id NOT NULL
  ALTER TABLE public.configuracao_rh_linha
    DROP CONSTRAINT IF EXISTS chk_cfg_rh_linha_tipo;

  ALTER TABLE public.configuracao_rh_linha
    ADD CONSTRAINT chk_cfg_rh_linha_tipo
    CHECK (
      (tipo_linha = 'FUNCAO' AND funcao_id IS NOT NULL) OR
      (tipo_linha = 'CARGO' AND cargo_id IS NOT NULL)
    );

  -- 5. Criar índice para busca por cargo_id
  CREATE INDEX IF NOT EXISTS idx_cfg_rh_linha_cargo_ref
    ON public.configuracao_rh_linha (cargo_id);

END $$;
