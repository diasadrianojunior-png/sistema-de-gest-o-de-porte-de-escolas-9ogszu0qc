-- Módulo: Especializações (Cadastros de Apoio)
-- Ajuste: uma mesma especialidade (um mesmo registro) passa a poder ter VÁRIAS
-- classificações ao mesmo tempo. Migra o campo único "classificacao" (text) para
-- "classificacoes" (text[]), preservando identificadores ESP-XXXX, criados_at e
-- todos os vínculos de profissional_especializacoes (FK RESTRICT → especializacoes.id
-- não é afetada: nenhuma linha da tabela é recriada, apenas a coluna muda).

-- 1. Nova coluna array (nullable durante a migração; NOT NULL só depois do backfill)
ALTER TABLE public.especializacoes
  ADD COLUMN IF NOT EXISTS classificacoes text[];

-- 2. Backfill: cada registro existente recebe um array com a sua classificação única
UPDATE public.especializacoes
SET classificacoes = ARRAY[classificacao]
WHERE classificacoes IS NULL
  AND classificacao IS NOT NULL;

-- 3. Garantir que nenhum registro ficou sem classificação após o backfill
DO $$
DECLARE
  total_sem_classificacao integer;
BEGIN
  SELECT count(*) INTO total_sem_classificacao
  FROM public.especializacoes
  WHERE classificacoes IS NULL OR array_length(classificacoes, 1) = 0;

  IF total_sem_classificacao > 0 THEN
    RAISE EXCEPTION 'ESPECIALIZACOES_MIGRACAO: % registro(s) ficaram sem classificação após o backfill', total_sem_classificacao;
  END IF;
END $$;

-- 4. Sanidade: normalizar e validar valores contra a lista canônica das 5 opções,
--    removendo duplicatas dentro do mesmo registro.
DO $$
DECLARE
  registro_recorde record;
BEGIN
  FOR registro_recorde IN
    SELECT id, classificacoes FROM public.especializacoes
      WHERE classificacoes IS NOT NULL
  LOOP
    UPDATE public.especializacoes
    SET classificacoes = sub.normalizado
    FROM (
      SELECT array_agg(DISTINCT v) AS normalizado
      FROM unnest(registro_recorde.classificacoes) AS v
      WHERE v IN ('Graduação', 'Pós-Graduação', 'Mestrado', 'Doutorado', 'Pós-Doutorado')
    ) AS sub
    WHERE public.especializacoes.id = registro_recorde.id;

    IF (SELECT array_length(classificacoes, 1) FROM public.especializacoes WHERE id = registro_recorde.id) IS NULL
       OR (SELECT array_length(classificacoes, 1) FROM public.especializacoes WHERE id = registro_recorde.id) = 0 THEN
      RAISE EXCEPTION 'ESPECIALIZACOES_MIGRACAO: registro % possui classificação inválida fora da lista canônica', registro_recorde.id;
    END IF;
  END LOOP;
END $$;

-- 5. Regras no banco: obrigatório (pelo menos 1) e somente valores da lista canônica
ALTER TABLE public.especializacoes
  DROP CONSTRAINT IF EXISTS especializacoes_classificacoes_obrigatoria;
ALTER TABLE public.especializacoes
  ADD CONSTRAINT especializacoes_classificacoes_obrigatoria
  CHECK (classificacoes IS NOT NULL AND array_length(classificacoes, 1) >= 1);

ALTER TABLE public.especializacoes
  DROP CONSTRAINT IF EXISTS especializacoes_classificacoes_validas;
ALTER TABLE public.especializacoes
  ADD CONSTRAINT especializacoes_classificacoes_validas
  CHECK (classificacoes <@ ARRAY['Graduação'::text, 'Pós-Graduação'::text, 'Mestrado'::text, 'Doutorado'::text, 'Pós-Doutorado'::text]);

-- 6. Nome da Especialidade passa a ser único (não permitir dois registros com o mesmo nome)
DO $$
DECLARE
  total_duplicados integer;
BEGIN
  SELECT count(*) INTO total_duplicados FROM (
    SELECT lower(btrim(nome)) FROM public.especializacoes GROUP BY lower(btrim(nome)) HAVING count(*) > 1
  ) d;
  IF total_duplicados > 0 THEN
    RAISE EXCEPTION 'ESPECIALIZACOES_MIGRACAO: % nome(s) de especialidade duplicado(s) impedem o índice de unicidade', total_duplicados;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS especializacoes_nome_unico_key
  ON public.especializacoes USING btree (lower(btrim(nome)));

-- 7. Índice GIN para o filtro/listagem por classificação (contenção no array)
CREATE INDEX IF NOT EXISTS idx_especializacoes_classificacoes
  ON public.especializacoes USING gin (classificacoes);

-- 8. Índice antigo da coluna única deixa de ser necessário
DROP INDEX IF EXISTS idx_especializacoes_classificacao;

-- 9. Remover a coluna antiga (nenhum objeto depende dela: verificado — trigger só de
--    código, sem policies/triggers/constraints referencing classificacao)
ALTER TABLE public.especializacoes DROP COLUMN IF EXISTS classificacao;
