-- ============================================================================
-- Migration: 20261023182000_seed_configuracao_rh_2026.sql
-- Seed do ano letivo 2026 (status RASCUNHO) para as duas configurações oficiais:
-- [A] "Ensino Fundamental e Educação Infantil (20h)"
-- [B] "Educação Infantil (40h)"
-- ============================================================================

DO $$
DECLARE
  v_cfg_20h_id uuid;
  v_cfg_40h_id uuid;

  -- Níveis 20h
  v_niv_i uuid;
  v_niv_ii uuid;
  v_niv_iii uuid;
  v_niv_iv uuid;
  v_niv_v uuid;
  v_niv_vi uuid;
  v_niv_vii uuid;
  v_niv_viii uuid;

  -- Níveis 40h
  v_niv_a uuid;
  v_niv_b uuid;
  v_niv_c uuid;

  -- IDs de funções
  v_fn_diretor uuid;
  v_fn_coord uuid;
  v_fn_prof_sup uuid;
  v_fn_prof_reg uuid;
  v_fn_sec_esc uuid;
  v_fn_assess_sl uuid;
  v_fn_sg_fem uuid;
  v_fn_sg_masc uuid;
  v_fn_sup_sala uuid;
  v_fn_sup_geral uuid;

  -- IDs de cargos
  v_cg_prof_20h uuid;
  v_cg_prof_40h uuid;
  v_cg_prof_arte uuid;
  v_cg_prof_edfis uuid;
  v_cg_prof_readapt uuid;
  v_cg_agente_ii uuid;
  v_cg_ass_adm_ii uuid;
  v_cg_aux_sg uuid;
  v_cg_agente_i uuid;

  -- Linhas 20h
  v_ln_20h_diretor uuid;
  v_ln_20h_coord uuid;
  v_ln_20h_sup uuid;
  v_ln_20h_reg uuid;
  v_ln_20h_sec uuid;
  v_ln_20h_ass uuid;
  v_ln_20h_sg_fem uuid;
  v_ln_20h_sg_masc uuid;

  -- Linhas 40h
  v_ln_40h_diretor uuid;
  v_ln_40h_coord uuid;
  v_ln_40h_reg uuid;
  v_ln_40h_sup_sala uuid;
  v_ln_40h_sup_geral uuid;
  v_ln_40h_sec uuid;

BEGIN
  -- 1. GARANTIR FUNÇÕES NECESSÁRIAS
  -- Diretor Escolar
  SELECT id INTO v_fn_diretor FROM public.funcoes WHERE nome ILIKE '%Diretor%' LIMIT 1;
  IF v_fn_diretor IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Diretor Escolar', 'Direção de Unidade Escolar', true)
    RETURNING id INTO v_fn_diretor;
  END IF;

  -- Coordenador Pedagógico
  SELECT id INTO v_fn_coord FROM public.funcoes WHERE nome ILIKE '%Coordenador Pedagógico%' LIMIT 1;
  IF v_fn_coord IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Coordenador Pedagógico', 'Coordenação pedagógica', true)
    RETURNING id INTO v_fn_coord;
  END IF;

  -- Professor Suporte (20h)
  SELECT id INTO v_fn_prof_sup FROM public.funcoes WHERE nome ILIKE '%Suporte Pedagógico (geral)%' OR nome ILIKE '%Professor Suporte%' LIMIT 1;
  IF v_fn_prof_sup IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Professor Suporte', 'Suporte pedagógico aos professores', true)
    RETURNING id INTO v_fn_prof_sup;
  END IF;

  -- Professor Regente
  SELECT id INTO v_fn_prof_reg FROM public.funcoes WHERE nome ILIKE '%Professor Regente%' LIMIT 1;
  IF v_fn_prof_reg IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Professor Regente', 'Docência regente em sala', true)
    RETURNING id INTO v_fn_prof_reg;
  END IF;

  -- Secretário Escolar
  SELECT id INTO v_fn_sec_esc FROM public.funcoes WHERE nome ILIKE '%Secretário Escolar%' LIMIT 1;
  IF v_fn_sec_esc IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Secretário Escolar', 'Secretaria escolar', true)
    RETURNING id INTO v_fn_sec_esc;
  END IF;

  -- Assessor de Sala de Leitura
  SELECT id INTO v_fn_assess_sl FROM public.funcoes WHERE nome ILIKE '%Assessor de Sala de Leitura%' LIMIT 1;
  IF v_fn_assess_sl IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Assessor de Sala de Leitura', 'Gestão de sala de leitura/biblioteca', true)
    RETURNING id INTO v_fn_assess_sl;
  END IF;

  -- Serviços Gerais Feminino
  SELECT id INTO v_fn_sg_fem FROM public.funcoes WHERE nome ILIKE '%Serviços Gerais Feminino%' LIMIT 1;
  IF v_fn_sg_fem IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Serviços Gerais Feminino', 'Limpeza e conservação feminina', true)
    RETURNING id INTO v_fn_sg_fem;
  END IF;

  -- Serviços Gerais Masculino
  SELECT id INTO v_fn_sg_masc FROM public.funcoes WHERE nome ILIKE '%Serviços Gerais Masculino%' LIMIT 1;
  IF v_fn_sg_masc IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Serviços Gerais Masculino', 'Limpeza, pátio e conservação masculina', true)
    RETURNING id INTO v_fn_sg_masc;
  END IF;

  -- Suporte Pedagógico de Sala (40h)
  SELECT id INTO v_fn_sup_sala FROM public.funcoes WHERE nome ILIKE '%Suporte Pedagógico de Sala%' LIMIT 1;
  IF v_fn_sup_sala IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, exige_autorizacao_semed, ativo) VALUES ('Suporte Pedagógico de Sala', 'Apoio pedagógico direto em sala', true, true)
    RETURNING id INTO v_fn_sup_sala;
  END IF;

  -- Suporte Pedagógico Geral (40h)
  SELECT id INTO v_fn_sup_geral FROM public.funcoes WHERE nome ILIKE '%Suporte Pedagógico (geral)%' OR nome ILIKE '%Professor Suporte Pedagógico Geral%' LIMIT 1;
  IF v_fn_sup_geral IS NULL THEN
    INSERT INTO public.funcoes (nome, descricao, ativo) VALUES ('Professor Suporte Pedagógico Geral', 'Apoio pedagógico geral na unidade', true)
    RETURNING id INTO v_fn_sup_geral;
  END IF;


  -- 2. GARANTIR CARGOS NECESSÁRIOS
  SELECT id INTO v_cg_prof_20h FROM public.cargos WHERE nome ILIKE '%(20h)%' OR nome ILIKE '%20h%' LIMIT 1;
  SELECT id INTO v_cg_prof_40h FROM public.cargos WHERE nome ILIKE '%(40h)%' OR nome ILIKE '%40h%' LIMIT 1;
  SELECT id INTO v_cg_prof_arte FROM public.cargos WHERE nome ILIKE '%Arte%' LIMIT 1;
  SELECT id INTO v_cg_prof_edfis FROM public.cargos WHERE nome ILIKE '%Educação Física%' LIMIT 1;
  SELECT id INTO v_cg_prof_readapt FROM public.cargos WHERE nome ILIKE '%Readaptado%' LIMIT 1;
  SELECT id INTO v_cg_agente_ii FROM public.cargos WHERE nome ILIKE '%Agente Educacional II%' LIMIT 1;
  SELECT id INTO v_cg_ass_adm_ii FROM public.cargos WHERE nome ILIKE '%Assistente Administrativo II%' LIMIT 1;
  SELECT id INTO v_cg_aux_sg FROM public.cargos WHERE nome ILIKE '%Auxiliar de Serviços Gerais%' LIMIT 1;
  SELECT id INTO v_cg_agente_i FROM public.cargos WHERE nome ILIKE '%Agente Educacional I%' LIMIT 1;


  -- 3. CRIAR / REAPROVEITAR CONFIGURAÇÃO [A] 20h - 2026
  SELECT id INTO v_cfg_20h_id FROM public.configuracao_rh
  WHERE tipo_atendimento = 'Ensino Fundamental e Educação Infantil (20h)' AND ano_letivo = 2026 LIMIT 1;

  IF v_cfg_20h_id IS NULL THEN
    INSERT INTO public.configuracao_rh (
      tipo_atendimento,
      ano_letivo,
      status,
      observacao
    ) VALUES (
      'Ensino Fundamental e Educação Infantil (20h)',
      2026,
      'RASCUNHO',
      'Configuração padrão da rede municipal para o ano letivo de 2026.'
    ) RETURNING id INTO v_cfg_20h_id;
  ELSE
    -- Se já existia, limpar dependentes para reinserir com os dados canônicos
    DELETE FROM public.configuracao_rh_nivel WHERE configuracao_rh_id = v_cfg_20h_id;
    DELETE FROM public.configuracao_rh_linha WHERE configuracao_rh_id = v_cfg_20h_id;
  END IF;

  -- Inserir Níveis 20h: I 0–100 | II 101–150 | III 151–220 | IV 221–320 | V 321–420 | VI 421–500 | VII 501–600 | VIII 601–sem limite
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'I', 1, 0, 100) RETURNING id INTO v_niv_i;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'II', 2, 101, 150) RETURNING id INTO v_niv_ii;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'III', 3, 151, 220) RETURNING id INTO v_niv_iii;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'IV', 4, 221, 320) RETURNING id INTO v_niv_iv;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'V', 5, 321, 420) RETURNING id INTO v_niv_v;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'VI', 6, 421, 500) RETURNING id INTO v_niv_vi;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'VII', 7, 501, 600) RETURNING id INTO v_niv_vii;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_20h_id, 'VIII', 8, 601, NULL) RETURNING id INTO v_niv_viii;

  -- Inserir Linhas 20h
  -- 1) Diretor (POR_ESCOLA): 1F em todos
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_diretor, 1, 'POR_ESCOLA') RETURNING id INTO v_ln_20h_diretor;

  -- 2) Coordenador Pedagógico (POR_PERIODO): 1F,1F,1F,1F,1F,1F,1F,2F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_coord, 2, 'POR_PERIODO') RETURNING id INTO v_ln_20h_coord;

  -- 3) Professor Suporte (POR_PERIODO): 0,0,1F,1F,1F,1F,2F,3F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_prof_sup, 3, 'POR_PERIODO') RETURNING id INTO v_ln_20h_sup;

  -- 4) Professor Regente (POR_TURMA): 1F em todos
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_prof_reg, 4, 'POR_TURMA') RETURNING id INTO v_ln_20h_reg;

  -- 5) Secretário Escolar (POR_ESCOLA): 1It,1It,1F,1F,1F,1F,2F,2F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_sec_esc, 5, 'POR_ESCOLA') RETURNING id INTO v_ln_20h_sec;

  -- 6) Assessor de Sala de Leitura (POR_ESCOLA): 1It,1It,1F,1F,1F,1F,1F,2F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_assess_sl, 6, 'POR_ESCOLA') RETURNING id INTO v_ln_20h_ass;

  -- 7) Serviços Gerais Feminino (POR_ESCOLA): 2,5,6,7,8,9,10,13 (todos F)
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo, observacao)
  VALUES (v_cfg_20h_id, v_fn_sg_fem, 7, 'POR_ESCOLA', 'linha em destaque na tabela oficial, pendente de validação') RETURNING id INTO v_ln_20h_sg_fem;

  -- 8) Serviços Gerais Masculino (POR_ESCOLA): 1F em todos
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_20h_id, v_fn_sg_masc, 8, 'POR_ESCOLA') RETURNING id INTO v_ln_20h_sg_masc;

  -- Vagas 20h: Células
  -- Diretor: 1F em todos
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_diretor, v_niv_i, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_ii, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_vii, 1, 'FIXO'),
    (v_ln_20h_diretor, v_niv_viii, 1, 'FIXO');

  -- Coordenador Pedagógico: 1F,1F,1F,1F,1F,1F,1F,2F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_coord, v_niv_i, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_ii, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_vii, 1, 'FIXO'),
    (v_ln_20h_coord, v_niv_viii, 2, 'FIXO');

  -- Professor Suporte: 0,0,1F,1F,1F,1F,2F,3F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_sup, v_niv_i, 0, 'FIXO'),
    (v_ln_20h_sup, v_niv_ii, 0, 'FIXO'),
    (v_ln_20h_sup, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_sup, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_sup, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_sup, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_sup, v_niv_vii, 2, 'FIXO'),
    (v_ln_20h_sup, v_niv_viii, 3, 'FIXO');

  -- Professor Regente: 1F em todos
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_reg, v_niv_i, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_ii, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_vii, 1, 'FIXO'),
    (v_ln_20h_reg, v_niv_viii, 1, 'FIXO');

  -- Secretário Escolar: 1It,1It,1F,1F,1F,1F,2F,2F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_sec, v_niv_i, 1, 'ITINERANTE'),
    (v_ln_20h_sec, v_niv_ii, 1, 'ITINERANTE'),
    (v_ln_20h_sec, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_sec, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_sec, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_sec, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_sec, v_niv_vii, 2, 'FIXO'),
    (v_ln_20h_sec, v_niv_viii, 2, 'FIXO');

  -- Assessor de Sala de Leitura: 1It,1It,1F,1F,1F,1F,1F,2F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_ass, v_niv_i, 1, 'ITINERANTE'),
    (v_ln_20h_ass, v_niv_ii, 1, 'ITINERANTE'),
    (v_ln_20h_ass, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_ass, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_ass, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_ass, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_ass, v_niv_vii, 1, 'FIXO'),
    (v_ln_20h_ass, v_niv_viii, 2, 'FIXO');

  -- Serviços Gerais Feminino: 2,5,6,7,8,9,10,13 (todos F)
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_sg_fem, v_niv_i, 2, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_ii, 5, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_iii, 6, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_iv, 7, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_v, 8, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_vi, 9, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_vii, 10, 'FIXO'),
    (v_ln_20h_sg_fem, v_niv_viii, 13, 'FIXO');

  -- Serviços Gerais Masculino: 1F em todos
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_20h_sg_masc, v_niv_i, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_ii, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_iii, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_iv, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_v, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_vi, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_vii, 1, 'FIXO'),
    (v_ln_20h_sg_masc, v_niv_viii, 1, 'FIXO');

  -- Cargos Permitidos nas linhas de 20h
  -- Diretor: Prof. EI e EF 20h, Prof. EI 40h, Prof. Arte, Prof. Ed. Física, + Readaptado (condição READAPTADO_COMPATIVEL_LAUDO)
  IF v_cg_prof_20h IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_diretor, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_40h IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_diretor, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_arte IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_diretor, v_cg_prof_arte, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_edfis IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_diretor, v_cg_prof_edfis, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_readapt IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_diretor, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING; END IF;

  -- Coordenador e Professor Suporte: Prof. 20h, Prof. EI 40h, + Readaptado
  IF v_cg_prof_20h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_coord, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sup, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_40h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_coord, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sup, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_readapt IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_coord, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sup, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING;
  END IF;

  -- Professor Regente (20h): Prof. 20h
  IF v_cg_prof_20h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_reg, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;

  -- Secretário Escolar: Assistente Administrativo II
  IF v_cg_ass_adm_ii IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sec, v_cg_ass_adm_ii, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;

  -- Assessor de Sala de Leitura: Assistente Administrativo II, + Readaptado
  IF v_cg_ass_adm_ii IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_ass, v_cg_ass_adm_ii, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_readapt IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_ass, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING;
  END IF;

  -- Serviços Gerais Feminino e Masculino: Auxiliar de Serviços Gerais, Agente Educacional I
  IF v_cg_aux_sg IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sg_fem, v_cg_aux_sg, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sg_masc, v_cg_aux_sg, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_agente_i IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sg_fem, v_cg_agente_i, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_20h_sg_masc, v_cg_agente_i, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;


  -- 4. CRIAR / REAPROVEITAR CONFIGURAÇÃO [B] 40h - 2026
  SELECT id INTO v_cfg_40h_id FROM public.configuracao_rh
  WHERE tipo_atendimento = 'Educação Infantil (40h)' AND ano_letivo = 2026 LIMIT 1;

  IF v_cfg_40h_id IS NULL THEN
    INSERT INTO public.configuracao_rh (
      tipo_atendimento,
      ano_letivo,
      status,
      observacao
    ) VALUES (
      'Educação Infantil (40h)',
      2026,
      'RASCUNHO',
      'Configuração para os Centros Municipais de Educação Infantil (CMEIs - 40h).'
    ) RETURNING id INTO v_cfg_40h_id;
  ELSE
    DELETE FROM public.configuracao_rh_nivel WHERE configuracao_rh_id = v_cfg_40h_id;
    DELETE FROM public.configuracao_rh_linha WHERE configuracao_rh_id = v_cfg_40h_id;
  END IF;

  -- Inserir Níveis 40h: A 0–90 | B 91–140 | C 141–sem limite (Obs C: "a tabela oficial diz 'acima de 141'; confirmar com a SEMED")
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_40h_id, 'A', 1, 0, 90) RETURNING id INTO v_niv_a;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_cfg_40h_id, 'B', 2, 91, 140) RETURNING id INTO v_niv_b;
  INSERT INTO public.configuracao_rh_nivel (configuracao_rh_id, codigo_nivel, ordem, min_alunos, max_alunos, observacao)
  VALUES (v_cfg_40h_id, 'C', 3, 141, NULL, 'a tabela oficial diz ''acima de 141''; confirmar com a SEMED') RETURNING id INTO v_niv_c;

  -- Inserir Linhas 40h
  -- 1) Diretor (POR_ESCOLA): 1F,1F,1F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_40h_id, v_fn_diretor, 1, 'POR_ESCOLA') RETURNING id INTO v_ln_40h_diretor;

  -- 2) Coordenador Pedagógico (POR_ESCOLA): 1F,1F,1F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_40h_id, v_fn_coord, 2, 'POR_ESCOLA') RETURNING id INTO v_ln_40h_coord;

  -- 3) Professor Regente (POR_TURMA): 1F,1F,1F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_40h_id, v_fn_prof_reg, 3, 'POR_TURMA') RETURNING id INTO v_ln_40h_reg;

  -- 4) Professor Suporte Pedagógico de Sala (POR_TURMA_ETAPA, etapas = ["INFANTIL", "INFANTIL_I", "INFANTIL_II"]): 1F,1F,1F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo, etapas_filtro)
  VALUES (v_cfg_40h_id, v_fn_sup_sala, 4, 'POR_TURMA_ETAPA', '["INFANTIL", "INFANTIL_I", "INFANTIL_II"]'::jsonb) RETURNING id INTO v_ln_40h_sup_sala;

  -- 5) Professor Suporte Pedagógico Geral (POR_ESCOLA): 1F,2F,2F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_40h_id, v_fn_sup_geral, 5, 'POR_ESCOLA') RETURNING id INTO v_ln_40h_sup_geral;

  -- 6) Secretário Escolar (POR_ESCOLA): 1It (2 dias/sem), 1It (3 dias/sem), 1F
  INSERT INTO public.configuracao_rh_linha (configuracao_rh_id, funcao_id, ordem, base_calculo)
  VALUES (v_cfg_40h_id, v_fn_sec_esc, 6, 'POR_ESCOLA') RETURNING id INTO v_ln_40h_sec;

  -- Vagas 40h: Células
  -- Diretor: 1F,1F,1F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_40h_diretor, v_niv_a, 1, 'FIXO'),
    (v_ln_40h_diretor, v_niv_b, 1, 'FIXO'),
    (v_ln_40h_diretor, v_niv_c, 1, 'FIXO');

  -- Coordenador: 1F,1F,1F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_40h_coord, v_niv_a, 1, 'FIXO'),
    (v_ln_40h_coord, v_niv_b, 1, 'FIXO'),
    (v_ln_40h_coord, v_niv_c, 1, 'FIXO');

  -- Professor Regente: 1F,1F,1F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_40h_reg, v_niv_a, 1, 'FIXO'),
    (v_ln_40h_reg, v_niv_b, 1, 'FIXO'),
    (v_ln_40h_reg, v_niv_c, 1, 'FIXO');

  -- Suporte Pedagógico de Sala: 1F,1F,1F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_40h_sup_sala, v_niv_a, 1, 'FIXO'),
    (v_ln_40h_sup_sala, v_niv_b, 1, 'FIXO'),
    (v_ln_40h_sup_sala, v_niv_c, 1, 'FIXO');

  -- Suporte Pedagógico Geral: 1F,2F,2F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade) VALUES
    (v_ln_40h_sup_geral, v_niv_a, 1, 'FIXO'),
    (v_ln_40h_sup_geral, v_niv_b, 2, 'FIXO'),
    (v_ln_40h_sup_geral, v_niv_c, 2, 'FIXO');

  -- Secretário Escolar: 1It (2 dias/sem), 1It (3 dias/sem), 1F
  INSERT INTO public.configuracao_rh_vaga (linha_id, nivel_id, quantidade, modalidade, dias_semana) VALUES
    (v_ln_40h_sec, v_niv_a, 1, 'ITINERANTE', 2),
    (v_ln_40h_sec, v_niv_b, 1, 'ITINERANTE', 3),
    (v_ln_40h_sec, v_niv_c, 1, 'FIXO', NULL);

  -- Cargos permitidos 40h
  -- Diretor: Prof. EI e EF 20h, Prof. EI 40h, Prof. Arte, Prof. Ed. Física, + Readaptado
  IF v_cg_prof_20h IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_diretor, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_40h IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_diretor, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_arte IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_diretor, v_cg_prof_arte, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_edfis IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_diretor, v_cg_prof_edfis, 'NENHUMA') ON CONFLICT DO NOTHING; END IF;
  IF v_cg_prof_readapt IS NOT NULL THEN INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_diretor, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING; END IF;

  -- Coordenador e Suporte Pedagógico Geral: Prof. 20h, Prof. EI 40h, + Readaptado
  IF v_cg_prof_20h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_coord, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_geral, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_40h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_coord, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_geral, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_readapt IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_coord, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING;
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_geral, v_cg_prof_readapt, 'READAPTADO_COMPATIVEL_LAUDO') ON CONFLICT DO NOTHING;
  END IF;

  -- Professor Regente (40h): Prof. EI 40h
  IF v_cg_prof_40h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_reg, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;

  -- Suporte Pedagógico de Sala: Prof. EI 40h, Prof. 20h, + Agente Educacional II (AUTORIZACAO_SEMED)
  IF v_cg_prof_40h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_sala, v_cg_prof_40h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_prof_20h IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_sala, v_cg_prof_20h, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;
  IF v_cg_agente_ii IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sup_sala, v_cg_agente_ii, 'AUTORIZACAO_SEMED') ON CONFLICT DO NOTHING;
  END IF;

  -- Secretário Escolar: Assistente Administrativo II
  IF v_cg_ass_adm_ii IS NOT NULL THEN
    INSERT INTO public.configuracao_rh_linha_cargo (linha_id, cargo_id, condicao) VALUES (v_ln_40h_sec, v_cg_ass_adm_ii, 'NENHUMA') ON CONFLICT DO NOTHING;
  END IF;

END $$;
