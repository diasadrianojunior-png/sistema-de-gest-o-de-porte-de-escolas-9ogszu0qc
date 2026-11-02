-- Migração para adicionar data_admissao, data_nascimento e classe na tabela profissionais
-- com backfill de registros existentes e regras de integridade

-- 1. Adicionar as novas colunas
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS data_admissao date,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS classe text;

-- 2. Backfill para registros existentes:
-- Profissionais com data_admissao em anos anteriores ao ano vigente: 'Antigos na Rede'
-- Profissionais com data_admissao no ano vigente: 'Novos na Rede'
-- Profissionais existentes sem data_admissao cadastrada: 'Antigos na Rede' (decisão de negócio documentada)
UPDATE public.profissionais
SET classe = CASE
  WHEN data_admissao IS NOT NULL AND EXTRACT(YEAR FROM data_admissao) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 'Novos na Rede'
  ELSE 'Antigos na Rede'
END
WHERE classe IS NULL OR classe = '';

-- 3. Criar índice para buscas/filtros pela coluna classe
CREATE INDEX IF NOT EXISTS idx_profissionais_classe ON public.profissionais USING btree (classe);
