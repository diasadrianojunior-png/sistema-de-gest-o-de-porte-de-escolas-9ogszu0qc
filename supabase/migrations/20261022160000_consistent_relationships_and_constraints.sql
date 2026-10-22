-- Migração: Garantir consistência referencial, constraints e integridade dinâmica entre registros
-- 1. Limpeza de vínculos órfãos pré-existentes caso haja dados inconsistentes
-- 2. Garantia de integridade relacional em funcao_cargos (funcao_id -> funcoes, cargo_id -> cargos)
-- 3. Constraint de consistência entre tipo_atendimento e nivel_porte em unidades_escolares
-- 4. Constraint de validação para ano_letivo em etapas
-- 5. Foreign key opcional de usuario_id em auditoria para auth.users ON DELETE SET NULL

-- 1. Limpeza preventiva de órfãos em funcao_cargos antes de reforçar/verificar constraints
DELETE FROM public.funcao_cargos
WHERE cargo_id NOT IN (SELECT id FROM public.cargos)
   OR funcao_id NOT IN (SELECT id FROM public.funcoes);

-- 2. Garantir constraints de integridade e unicidade em funcao_cargos
DO $$
BEGIN
  -- Verificar e garantir FK para funcoes
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funcao_cargos_funcao_id_fkey'
  ) THEN
    ALTER TABLE public.funcao_cargos
      ADD CONSTRAINT funcao_cargos_funcao_id_fkey
      FOREIGN KEY (funcao_id) REFERENCES public.funcoes(id) ON DELETE CASCADE;
  END IF;

  -- Verificar e garantir FK para cargos
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funcao_cargos_cargo_id_fkey'
  ) THEN
    ALTER TABLE public.funcao_cargos
      ADD CONSTRAINT funcao_cargos_cargo_id_fkey
      FOREIGN KEY (cargo_id) REFERENCES public.cargos(id) ON DELETE CASCADE;
  END IF;

  -- Garantir unicidade do par (funcao_id, cargo_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_funcao_cargos'
  ) THEN
    ALTER TABLE public.funcao_cargos
      ADD CONSTRAINT uq_funcao_cargos UNIQUE (funcao_id, cargo_id);
  END IF;
END $$;

-- 3. Limpeza preventiva de usuario_id inválido em auditoria antes de criar FK
UPDATE public.auditoria
SET usuario_id = NULL
WHERE usuario_id IS NOT NULL
  AND usuario_id NOT IN (SELECT id FROM auth.users);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auditoria_usuario_id_fkey'
  ) THEN
    ALTER TABLE public.auditoria
      ADD CONSTRAINT auditoria_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Constraint de validação condicional entre tipo_atendimento e nivel_porte na tabela unidades_escolares
-- Sanitizar primeiro eventuais inconsistências em unidades_escolares existentes para manter dados intactos
UPDATE public.unidades_escolares
SET tipo_atendimento = 'Ensino Fundamental e Educação Infantil (20h)'
WHERE tipo_atendimento IS NULL OR trim(tipo_atendimento) = '';

-- Normalizar porte se incompatível
UPDATE public.unidades_escolares
SET nivel_porte = CASE
  WHEN nivel_porte ILIKE '%Porte 1%' OR nivel_porte ILIKE '%100%' THEN 'Nível 1 (até 100 alunos)'
  WHEN nivel_porte ILIKE '%Porte 2%' OR nivel_porte ILIKE '%250%' THEN 'Nível 2 (101 a 250 alunos)'
  WHEN nivel_porte ILIKE '%Porte 3%' OR nivel_porte ILIKE '%500%' THEN 'Nível 3 (251 a 500 alunos)'
  WHEN nivel_porte ILIKE '%Porte 4%' OR nivel_porte ILIKE '%750%' THEN 'Nível 4 (501 a 750 alunos)'
  WHEN nivel_porte ILIKE '%Porte 5%' OR nivel_porte ILIKE '%1.000%' OR nivel_porte ILIKE '%1000%' THEN 'Nível 5 (751 a 1.000 alunos)'
  WHEN nivel_porte ILIKE '%Porte 6%' OR nivel_porte ILIKE '%1.250%' OR nivel_porte ILIKE '%1250%' THEN 'Nível 6 (1.001 a 1.250 alunos)'
  WHEN nivel_porte ILIKE '%Porte 7%' OR nivel_porte ILIKE '%1.500%' OR nivel_porte ILIKE '%1500%' THEN 'Nível 7 (1.251 a 1.500 alunos)'
  WHEN nivel_porte ILIKE '%Porte 8%' OR nivel_porte ILIKE '%1.501%' THEN 'Nível 8 (mais de 1.500 alunos)'
  ELSE 'Nível 1 (até 100 alunos)'
END
WHERE tipo_atendimento = 'Ensino Fundamental e Educação Infantil (20h)'
  AND nivel_porte NOT IN (
    'Nível 1 (até 100 alunos)',
    'Nível 2 (101 a 250 alunos)',
    'Nível 3 (251 a 500 alunos)',
    'Nível 4 (501 a 750 alunos)',
    'Nível 5 (751 a 1.000 alunos)',
    'Nível 6 (1.001 a 1.250 alunos)',
    'Nível 7 (1.251 a 1.500 alunos)',
    'Nível 8 (mais de 1.500 alunos)'
  );

UPDATE public.unidades_escolares
SET nivel_porte = CASE
  WHEN nivel_porte ILIKE '%100%' OR nivel_porte ILIKE '%Faixa 1%' THEN 'Até 100 alunos'
  WHEN nivel_porte ILIKE '%101 a 200%' OR nivel_porte ILIKE '%Faixa 2%' THEN '101 a 200 alunos'
  WHEN nivel_porte ILIKE '%Mais de 200%' OR nivel_porte ILIKE '%Faixa 3%' THEN 'Mais de 200 alunos'
  ELSE 'Até 100 alunos'
END
WHERE tipo_atendimento = 'Educação Infantil (40h)'
  AND nivel_porte NOT IN (
    'Até 100 alunos',
    '101 a 200 alunos',
    'Mais de 200 alunos'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_unidade_porte_consistente'
  ) THEN
    ALTER TABLE public.unidades_escolares
      ADD CONSTRAINT chk_unidade_porte_consistente
      CHECK (
        (tipo_atendimento = 'Ensino Fundamental e Educação Infantil (20h)' AND nivel_porte IN (
          'Nível 1 (até 100 alunos)',
          'Nível 2 (101 a 250 alunos)',
          'Nível 3 (251 a 500 alunos)',
          'Nível 4 (501 a 750 alunos)',
          'Nível 5 (751 a 1.000 alunos)',
          'Nível 6 (1.001 a 1.250 alunos)',
          'Nível 7 (1.251 a 1.500 alunos)',
          'Nível 8 (mais de 1.500 alunos)'
        ))
        OR
        (tipo_atendimento = 'Educação Infantil (40h)' AND nivel_porte IN (
          'Até 100 alunos',
          '101 a 200 alunos',
          'Mais de 200 alunos'
        ))
      );
  END IF;
END $$;

-- 5. Constraint de ano_letivo em etapas (2020 a 2040)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_etapas_ano_letivo_valido'
  ) THEN
    ALTER TABLE public.etapas
      ADD CONSTRAINT chk_etapas_ano_letivo_valido
      CHECK (ano_letivo >= 2020 AND ano_letivo <= 2040);
  END IF;
END $$;

-- 6. Trigger para sincronizar e limpar vínculos caso um cargo seja excluído (redundância segura além do ON DELETE CASCADE)
CREATE OR REPLACE FUNCTION public.fn_cleanup_vinculos_cargo_deleted()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.funcao_cargos WHERE cargo_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_vinculos_cargo_deleted ON public.cargos;
CREATE TRIGGER trg_cleanup_vinculos_cargo_deleted
  BEFORE DELETE ON public.cargos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_vinculos_cargo_deleted();
