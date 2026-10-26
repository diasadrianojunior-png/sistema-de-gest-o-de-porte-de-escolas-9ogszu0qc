-- ============================================================================
-- Migration: 20261026181500_remover_condicao_especial_e_seed_turmas.sql
-- 1. Remove coluna condicao_especial da tabela vaga (Etapa 2 - ajuste solicitado)
-- 2. Popula cadastro de turmas reais vinculadas às unidades escolares para 2026
-- ============================================================================

-- 1. Remover coluna condicao_especial de vaga
ALTER TABLE public.vaga DROP COLUMN IF EXISTS condicao_especial;

-- 2. Seed de turmas vinculadas às unidades escolares para o ano letivo 2026
DO $$
DECLARE
  v_etapa_pre_escola UUID;
  v_etapa_creche UUID;
  v_etapa_anos_finais UUID;
  v_uea RECORD;
  v_count INT;
  i INT;
  v_etapa_id UUID;
  v_turma_nome TEXT;
BEGIN
  -- Identificar etapas disponíveis para 2026
  SELECT id INTO v_etapa_pre_escola FROM public.etapas WHERE nome ILIKE '%Pré-Escola%' LIMIT 1;
  SELECT id INTO v_etapa_creche FROM public.etapas WHERE nome ILIKE '%Creche%' LIMIT 1;
  SELECT id INTO v_etapa_anos_finais FROM public.etapas WHERE nome ILIKE '%Anos Finais%' LIMIT 1;

  -- Se não existir etapa infantil, criar
  IF v_etapa_pre_escola IS NULL THEN
    INSERT INTO public.etapas (nome, ano_letivo)
    VALUES ('Pré-Escola', 2026)
    RETURNING id INTO v_etapa_pre_escola;
  END IF;

  -- Iterar sobre cada unidade_escolar_ano de 2026
  FOR v_uea IN
    SELECT uea.unidade_escolar_id, uea.qtd_turmas, uea.ano_letivo, u.nome as escola_nome, u.tipo_atendimento
    FROM public.unidade_escolar_ano uea
    JOIN public.unidades_escolares u ON u.id = uea.unidade_escolar_id
    WHERE uea.ano_letivo = 2026 AND uea.qtd_turmas > 0
  LOOP
    -- Verificar se já existem turmas cadastradas para esta unidade e ano
    SELECT count(*) INTO v_count
    FROM public.turmas
    WHERE unidade_escolar_id = v_uea.unidade_escolar_id AND ano_letivo = v_uea.ano_letivo;

    -- Se não existirem turmas suficientes, criar as turmas correspondentes
    IF v_count < v_uea.qtd_turmas THEN
      FOR i IN (v_count + 1)..v_uea.qtd_turmas LOOP
        v_turma_nome := 'Turma ' || LPAD(i::text, 2, '0');

        -- Para escolas 40h (CMEIs), as primeiras 3 turmas são da etapa infantil
        IF v_uea.tipo_atendimento ILIKE '%40h%' THEN
          IF i <= 3 THEN
            v_etapa_id := v_etapa_pre_escola;
          ELSE
            v_etapa_id := v_etapa_creche;
          END IF;
        ELSE
          -- 20h
          IF i % 2 = 1 THEN
            v_etapa_id := v_etapa_anos_finais;
          ELSE
            v_etapa_id := v_etapa_pre_escola;
          END IF;
        END IF;

        INSERT INTO public.turmas (
          nome,
          unidade_escolar_id,
          ano_letivo,
          etapa_id
        ) VALUES (
          v_turma_nome,
          v_uea.unidade_escolar_id,
          v_uea.ano_letivo,
          v_etapa_id
        );
      END LOOP;
    END IF;

  END LOOP;

END $$;
