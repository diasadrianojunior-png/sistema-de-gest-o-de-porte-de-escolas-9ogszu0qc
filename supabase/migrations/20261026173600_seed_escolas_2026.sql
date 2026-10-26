-- ============================================================================
-- Migration: 20261026173600_seed_escolas_2026.sql
-- ETAPA 2: Carga inicial de Unidades Escolares e Unidade Escolar Ano 2026
--
-- Insere ou atualiza as 25 escolas 20h e 19 CMEIs 40h.
-- Para cada uma, vincula ou cria registro em unidade_escolar_ano para 2026:
-- - 20h: periodos = ["MANHA", "TARDE"], turmas_por_etapa = NULL
-- - 40h: periodos = ["INTEGRAL"], turmas_por_etapa = NULL
-- Observações registradas:
-- - Jardim Santa Isabel: "Planilha alternativa indica 244 alunos; mantido 254 conforme solicitação oficial"
-- - CMEI B. A. Frederico Ozanan: "Planilha diz Nível A; configuração por faixa 94 alunos resulta em Nível B"
-- ============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_ue_id UUID;
  v_tipo_20h TEXT := 'Ensino Fundamental e Educação Infantil (20h)';
  v_tipo_40h TEXT := 'Educação Infantil (40h)';
BEGIN

  -- -------------------------------------------------------------
  -- Tabela temporária para os dados da carga de 2026
  -- -------------------------------------------------------------
  CREATE TEMP TABLE tmp_seed_escolas (
    nome TEXT,
    tipo TEXT,
    alunos INT,
    turmas INT,
    periodos JSONB,
    observacao TEXT
  ) ON COMMIT DROP;

  -- 25 Escolas "Ensino Fundamental e Educação Infantil (20h)"
  INSERT INTO tmp_seed_escolas (nome, tipo, alunos, turmas, periodos, observacao) VALUES
    ('Ana Zichack Mazei', v_tipo_20h, 38, 5, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('D. Pedro II', v_tipo_20h, 67, 7, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Balão Mágico', v_tipo_20h, 106, 6, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('A Sementinha', v_tipo_20h, 142, 8, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Zilda Arns Neumann', v_tipo_20h, 148, 8, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Aquarela', v_tipo_20h, 149, 8, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Hugo Simas', v_tipo_20h, 159, 9, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Antônio de O. Geraldo', v_tipo_20h, 179, 10, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('CMEI Dr. Daisaku Ikeda', v_tipo_20h, 226, 12, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Jardim Santa Isabel', v_tipo_20h, 254, 12, '["MANHA", "TARDE"]'::jsonb, 'Planilha alternativa indica 244 alunos; mantido 254 conforme solicitação oficial.'),
    ('CMEI Joana Benaducci Martin', v_tipo_20h, 265, 14, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Pe. José de Anchieta', v_tipo_20h, 312, 15, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Roberto Conceição', v_tipo_20h, 323, 14, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Pedro Tkotz', v_tipo_20h, 358, 14, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Santos Dumont', v_tipo_20h, 367, 16, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Consolación Montes Hernandez', v_tipo_20h, 430, 20, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Profª Maria Rosa Trevisan Galhasce', v_tipo_20h, 442, 18, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Prof. Jacídio Correia', v_tipo_20h, 443, 18, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Profª Izaura Ferreira Neves', v_tipo_20h, 447, 18, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Irmã Hilda Soares', v_tipo_20h, 459, 20, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Olavo Soares Barros', v_tipo_20h, 465, 20, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Cecília Meireles', v_tipo_20h, 491, 23, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Profª Lourdes Gobi Rodrigues', v_tipo_20h, 510, 23, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Alvorada', v_tipo_20h, 513, 21, '["MANHA", "TARDE"]'::jsonb, NULL),
    ('Pe. Symphoriano Koph', v_tipo_20h, 683, 30, '["MANHA", "TARDE"]'::jsonb, NULL);

  -- 19 CMEIs "Educação Infantil (40h)"
  INSERT INTO tmp_seed_escolas (nome, tipo, alunos, turmas, periodos, observacao) VALUES
    ('CMEI Pasquina R. Jacomel', v_tipo_40h, 65, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Madre Tereza de Calcutá', v_tipo_40h, 76, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Amábile Ferro Boscolo', v_tipo_40h, 84, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Maria Magdalena', v_tipo_40h, 84, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI José Sestário', v_tipo_40h, 85, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Munhoz Zerbeto', v_tipo_40h, 90, 5, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI B. A. Frederico Ozanan', v_tipo_40h, 94, 6, '["INTEGRAL"]'::jsonb, 'Planilha diz Nível A; configuração por faixa com 94 alunos resulta em Nível B.'),
    ('CMEI Ignêz Rodrigues Bergamaschi', v_tipo_40h, 103, 6, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Irmã Dulce', v_tipo_40h, 107, 7, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Eufrauzina M. de Jesus', v_tipo_40h, 107, 7, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Nelson F. Pizaia', v_tipo_40h, 107, 6, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Rosa Raminelli de Oliveira', v_tipo_40h, 108, 7, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Waldomiro Moreira Gomes', v_tipo_40h, 108, 7, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Pref. Eustáchio Sellman', v_tipo_40h, 109, 7, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Pref. Archimedes C. Mozer', v_tipo_40h, 114, 8, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Maria das Virgens F.', v_tipo_40h, 141, 9, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Jamile A. Hauly', v_tipo_40h, 147, 8, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Pe. José Luis Nieto', v_tipo_40h, 148, 9, '["INTEGRAL"]'::jsonb, NULL),
    ('CMEI Hugo Gonçalves', v_tipo_40h, 214, 12, '["INTEGRAL"]'::jsonb, NULL);

  -- -------------------------------------------------------------
  -- Loop de inserção/atualização idempotente
  -- -------------------------------------------------------------
  FOR v_rec IN SELECT * FROM tmp_seed_escolas LOOP
    -- Buscar escola por nome normalizado (case insensitive, trim)
    SELECT id INTO v_ue_id
    FROM public.unidades_escolares
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(v_rec.nome))
    LIMIT 1;

    IF v_ue_id IS NULL THEN
      -- Inserir nova unidade escolar
      INSERT INTO public.unidades_escolares (
        nome,
        tipo_atendimento,
        nivel_porte,
        localizacao,
        ativo
      ) VALUES (
        TRIM(v_rec.nome),
        v_rec.tipo,
        CASE WHEN v_rec.tipo ILIKE '%40h%' THEN 'Nível A' ELSE 'Nível I' END,
        'Zona Urbana',
        true
      )
      RETURNING id INTO v_ue_id;
    ELSE
      -- Atualizar campos da unidade escolar existente
      UPDATE public.unidades_escolares
      SET
        tipo_atendimento = v_rec.tipo,
        ativo = true,
        updated_at = NOW()
      WHERE id = v_ue_id;
    END IF;

    -- Inserir ou atualizar na tabela unidade_escolar_ano para o ano letivo 2026
    INSERT INTO public.unidade_escolar_ano (
      unidade_escolar_id,
      ano_letivo,
      qtd_alunos,
      qtd_turmas,
      periodos,
      turmas_por_etapa,
      observacao
    ) VALUES (
      v_ue_id,
      2026,
      v_rec.alunos,
      v_rec.turmas,
      v_rec.periodos,
      NULL,
      v_rec.observacao
    )
    ON CONFLICT (unidade_escolar_id, ano_letivo) DO UPDATE
    SET
      qtd_alunos = EXCLUDED.qtd_alunos,
      qtd_turmas = EXCLUDED.qtd_turmas,
      periodos = EXCLUDED.periodos,
      observacao = COALESCE(EXCLUDED.observacao, public.unidade_escolar_ano.observacao),
      updated_at = NOW();

  END LOOP;

END $$;
