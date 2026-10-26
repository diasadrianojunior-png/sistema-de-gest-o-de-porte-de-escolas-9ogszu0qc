-- ============================================================================
-- Migration: 20261026173550_relax_unidade_porte_constraint.sql
-- Adequa ou remove a constraint chk_unidade_porte_consistente legada
-- para permitir os novos níveis de porte da Etapa 1 e Etapa 2 (Nível I a VIII e A a C).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_unidade_porte_consistente'
  ) THEN
    ALTER TABLE public.unidades_escolares DROP CONSTRAINT chk_unidade_porte_consistente;
  END IF;
END $$;
