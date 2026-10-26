-- ============================================================================
-- Migration: 20261026173700_executar_geracao_roberto_e_pasquina.sql
-- ETAPA 2: Geração real de vagas para:
-- 1) Roberto Conceição (323 alunos, 14 turmas, 2 períodos) -> Nível V (30 vagas)
-- 2) CMEI Pasquina R. Jacomel (65 alunos, 5 turmas, INTEGRAL, 3 turmas Infantil) -> Nível A
-- ============================================================================

DO $$
DECLARE
  v_escola_rc_id UUID;
  v_escola_pasq_id UUID;
  v_cfg_20h_id UUID;
  v_cfg_40h_id UUID;
  v_niv_v_id UUID;
  v_niv_a_id UUID;
  v_linha RECORD;
  v_qtd_matriz INT;
  v_modalidade TEXT;
  v_dias INT;
  v_seq INT;
  v_p TEXT;
  i INT;
BEGIN

  -- 1. Identificar Escola Roberto Conceição
  SELECT id INTO v_escola_rc_id
  FROM public.unidades_escolares
  WHERE LOWER(nome) LIKE '%roberto concei%'
  LIMIT 1;

  -- 2. Identificar CMEI Pasquina
  SELECT id INTO v_escola_pasq_id
  FROM public.unidades_escolares
  WHERE LOWER(nome) LIKE '%pasquina%'
  LIMIT 1;

  -- 3. Identificar Configuração 20h (preferência VIGENTE 2026, senão a mais recente)
  SELECT id INTO v_cfg_20h_id
  FROM public.configuracao_rh
  WHERE tipo_atendimento = 'Ensino Fundamental e Educação Infantil (20h)'
  ORDER BY (CASE WHEN status = 'VIGENTE' AND ano_letivo = 2026 THEN 1 ELSE 2 END), created_at DESC
  LIMIT 1;

  -- 4. Identificar Configuração 40h (preferência VIGENTE 2026, senão a mais recente)
  SELECT id INTO v_cfg_40h_id
  FROM public.configuracao_rh
  WHERE tipo_atendimento = 'Educação Infantil (40h)'
  ORDER BY (CASE WHEN status = 'VIGENTE' AND ano_letivo = 2026 THEN 1 ELSE 2 END), created_at DESC
  LIMIT 1;

  -- Obter IDs dos níveis V e A
  SELECT id INTO v_niv_v_id FROM public.configuracao_rh_nivel WHERE configuracao_rh_id = v_cfg_20h_id AND codigo_nivel = 'V';
  SELECT id INTO v_niv_a_id FROM public.configuracao_rh_nivel WHERE configuracao_rh_id = v_cfg_40h_id AND codigo_nivel = 'A';

  -- ==========================================================================
  -- A. GERAR VAGAS PARA ROBERTO CONCEIÇÃO
  -- 323 alunos, 14 turmas, 2 períodos (MANHA, TARDE)
  -- ==========================================================================
  IF v_escola_rc_id IS NOT NULL AND v_cfg_20h_id IS NOT NULL AND v_niv_v_id IS NOT NULL THEN
    -- Atualizar unidade_escolar_ano
    UPDATE public.unidade_escolar_ano
    SET
      qtd_alunos = 323,
      qtd_turmas = 14,
      periodos = '["MANHA", "TARDE"]'::jsonb,
      nivel_calculado = 'V',
      configuracao_rh_id = v_cfg_20h_id,
      data_ultima_geracao = NOW(),
      updated_at = NOW()
    WHERE unidade_escolar_id = v_escola_rc_id AND ano_letivo = 2026;

    -- Limpar vagas existentes ABERTAS para recálculo limpo
    DELETE FROM public.vaga WHERE unidade_escolar_id = v_escola_rc_id AND ano_letivo = 2026;

    -- Iterar por cada linha da configuração 20h
    FOR v_linha IN
      SELECT l.id, f.nome as funcao_nome, l.base_calculo
      FROM public.configuracao_rh_linha l
      JOIN public.funcoes f ON f.id = l.funcao_id
      WHERE l.configuracao_rh_id = v_cfg_20h_id
      ORDER BY l.ordem
    LOOP
      -- Obter matriz de vagas para Nível V
      SELECT quantidade, modalidade, dias_semana
      INTO v_qtd_matriz, v_modalidade, v_dias
      FROM public.configuracao_rh_vaga
      WHERE linha_id = v_linha.id AND nivel_id = v_niv_v_id;

      IF v_qtd_matriz > 0 THEN
        v_seq := 1;

        IF v_linha.base_calculo = 'POR_ESCOLA' THEN
          FOR i IN 1..v_qtd_matriz LOOP
            INSERT INTO public.vaga (
              unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
              funcao, numero_sequencial, periodo, modalidade, dias_semana, status
            ) VALUES (
              v_escola_rc_id, 2026, v_cfg_20h_id, v_linha.id,
              v_linha.funcao_nome, v_seq, NULL, v_modalidade, v_dias, 'ABERTA'
            );
            v_seq := v_seq + 1;
          END LOOP;

        ELSIF v_linha.base_calculo = 'POR_PERIODO' THEN
          -- 1 vaga por período (MANHA, TARDE)
          FOREACH v_p IN ARRAY ARRAY['MANHA', 'TARDE'] LOOP
            FOR i IN 1..v_qtd_matriz LOOP
              INSERT INTO public.vaga (
                unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
                funcao, numero_sequencial, periodo, modalidade, dias_semana, status
              ) VALUES (
                v_escola_rc_id, 2026, v_cfg_20h_id, v_linha.id,
                v_linha.funcao_nome, v_seq, v_p, v_modalidade, v_dias, 'ABERTA'
              );
              v_seq := v_seq + 1;
            END LOOP;
          END LOOP;

        ELSIF v_linha.base_calculo = 'POR_TURMA' THEN
          -- v_qtd_matriz * 14 turmas
          FOR i IN 1..(v_qtd_matriz * 14) LOOP
            INSERT INTO public.vaga (
              unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
              funcao, numero_sequencial, periodo, modalidade, dias_semana, status
            ) VALUES (
              v_escola_rc_id, 2026, v_cfg_20h_id, v_linha.id,
              v_linha.funcao_nome, v_seq, NULL, v_modalidade, v_dias, 'ABERTA'
            );
            v_seq := v_seq + 1;
          END LOOP;

        END IF;

      END IF;
    END LOOP;
  END IF;

  -- ==========================================================================
  -- B. GERAR VAGAS PARA CMEI PASQUINA R. JACOMEL
  -- 65 alunos, 5 turmas, INTEGRAL, 3 turmas de Infantil/I/II -> Nível A
  -- ==========================================================================
  IF v_escola_pasq_id IS NOT NULL AND v_cfg_40h_id IS NOT NULL AND v_niv_a_id IS NOT NULL THEN
    -- Atualizar unidade_escolar_ano com 3 turmas de Infantil conforme instrução do usuário
    UPDATE public.unidade_escolar_ano
    SET
      qtd_alunos = 65,
      qtd_turmas = 5,
      periodos = '["INTEGRAL"]'::jsonb,
      turmas_por_etapa = '{"INFANTIL": 3, "OUTRAS": 2}'::jsonb,
      nivel_calculado = 'A',
      configuracao_rh_id = v_cfg_40h_id,
      data_ultima_geracao = NOW(),
      updated_at = NOW()
    WHERE unidade_escolar_id = v_escola_pasq_id AND ano_letivo = 2026;

    -- Limpar vagas existentes ABERTAS para recálculo limpo
    DELETE FROM public.vaga WHERE unidade_escolar_id = v_escola_pasq_id AND ano_letivo = 2026;

    -- Iterar por cada linha da configuração 40h
    FOR v_linha IN
      SELECT l.id, f.nome as funcao_nome, l.base_calculo, l.etapas_filtro
      FROM public.configuracao_rh_linha l
      JOIN public.funcoes f ON f.id = l.funcao_id
      WHERE l.configuracao_rh_id = v_cfg_40h_id
      ORDER BY l.ordem
    LOOP
      -- Obter matriz de vagas para Nível A
      SELECT quantidade, modalidade, dias_semana
      INTO v_qtd_matriz, v_modalidade, v_dias
      FROM public.configuracao_rh_vaga
      WHERE linha_id = v_linha.id AND nivel_id = v_niv_a_id;

      IF v_qtd_matriz > 0 THEN
        v_seq := 1;

        IF v_linha.base_calculo = 'POR_ESCOLA' THEN
          FOR i IN 1..v_qtd_matriz LOOP
            INSERT INTO public.vaga (
              unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
              funcao, numero_sequencial, periodo, modalidade, dias_semana, status
            ) VALUES (
              v_escola_pasq_id, 2026, v_cfg_40h_id, v_linha.id,
              v_linha.funcao_nome, v_seq, 'INTEGRAL', v_modalidade, v_dias, 'ABERTA'
            );
            v_seq := v_seq + 1;
          END LOOP;

        ELSIF v_linha.base_calculo = 'POR_TURMA' THEN
          -- v_qtd_matriz * 5 turmas
          FOR i IN 1..(v_qtd_matriz * 5) LOOP
            INSERT INTO public.vaga (
              unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
              funcao, numero_sequencial, periodo, modalidade, dias_semana, status
            ) VALUES (
              v_escola_pasq_id, 2026, v_cfg_40h_id, v_linha.id,
              v_linha.funcao_nome, v_seq, 'INTEGRAL', v_modalidade, v_dias, 'ABERTA'
            );
            v_seq := v_seq + 1;
          END LOOP;

        ELSIF v_linha.base_calculo = 'POR_TURMA_ETAPA' THEN
          -- Suporte de Sala: v_qtd_matriz * 3 turmas de Infantil = 3 vagas
          FOR i IN 1..(v_qtd_matriz * 3) LOOP
            INSERT INTO public.vaga (
              unidade_escolar_id, ano_letivo, configuracao_rh_id, configuracao_rh_linha_id,
              funcao, numero_sequencial, periodo, modalidade, dias_semana, status
            ) VALUES (
              v_escola_pasq_id, 2026, v_cfg_40h_id, v_linha.id,
              v_linha.funcao_nome, v_seq, 'INTEGRAL', v_modalidade, v_dias, 'ABERTA'
            );
            v_seq := v_seq + 1;
          END LOOP;

        END IF;

      END IF;
    END LOOP;
  END IF;

END $$;
