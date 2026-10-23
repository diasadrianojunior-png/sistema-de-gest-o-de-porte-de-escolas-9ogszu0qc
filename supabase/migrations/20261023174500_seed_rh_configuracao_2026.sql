-- Seed do Módulo "Configuração de RH por Tipo e Nível"
-- Versão 2026 - RASCUNHO conforme especificação completa

DO $$
DECLARE
  v_versao_id uuid;
  v_tipo_20h_id uuid;
  v_tipo_40h_id uuid;

  -- Cargos IDs
  c_prof20 uuid;
  c_prof40 uuid;
  c_proffis uuid;
  c_profart uuid;
  c_astadm uuid;
  c_auxsg uuid;
  c_age1 uuid;
  c_age2 uuid;
  c_rec uuid;
  c_apoio uuid;
  c_copa uuid;
  c_zel uuid;
  c_limp uuid;
  c_insp uuid;
  c_vig uuid;
  c_readap uuid;

  -- Funções IDs
  f_dir uuid;
  f_coord uuid;
  f_sup_geral uuid;
  f_sup_sala uuid;
  f_regente uuid;
  f_secretario uuid;
  f_assessor uuid;
  f_apoio_perm uuid;
  f_r2 uuid;
  f_prof_art uuid;
  f_prof_edfis uuid;
  f_sg_fem uuid;
  f_sg_masc uuid;

  -- Níveis 20h IDs
  n_20_1 uuid;
  n_20_2 uuid;
  n_20_3 uuid;
  n_20_4 uuid;
  n_20_5 uuid;
  n_20_6 uuid;
  n_20_7 uuid;
  n_20_8 uuid;

  -- Níveis 40h IDs
  n_40_a uuid;
  n_40_b uuid;
  n_40_c uuid;

BEGIN
  -- 1. Garantir existência e atributos dos Cargos especificados
  -- Professor EI e EF Anos Iniciais (20h)
  SELECT id INTO c_prof20 FROM public.cargos WHERE nome ILIKE '%Anos Iniciais (20h)%' LIMIT 1;
  IF c_prof20 IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Professor EI e EF Anos Iniciais (20h)', '20h', 'EFETIVO', true, true)
    RETURNING id INTO c_prof20;
  ELSE
    UPDATE public.cargos SET carga_horaria = '20h', natureza = 'EFETIVO', docente = true WHERE id = c_prof20;
  END IF;

  -- Professor de Educação Infantil (40h)
  SELECT id INTO c_prof40 FROM public.cargos WHERE nome ILIKE '%Educação Infantil (40h)%' LIMIT 1;
  IF c_prof40 IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Professor de Educação Infantil (40h)', '40h', 'EFETIVO', true, true)
    RETURNING id INTO c_prof40;
  ELSE
    UPDATE public.cargos SET carga_horaria = '40h', natureza = 'EFETIVO', docente = true WHERE id = c_prof40;
  END IF;

  -- Professor de Educação Física
  SELECT id INTO c_proffis FROM public.cargos WHERE nome ILIKE '%Educação Física%' LIMIT 1;
  IF c_proffis IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Professor de Educação Física', '20h', 'EFETIVO', true, true)
    RETURNING id INTO c_proffis;
  ELSE
    UPDATE public.cargos SET carga_horaria = '20h', natureza = 'EFETIVO', docente = true WHERE id = c_proffis;
  END IF;

  -- Professor de Arte
  SELECT id INTO c_profart FROM public.cargos WHERE nome ILIKE '%Professor de Arte%' LIMIT 1;
  IF c_profart IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Professor de Arte', '20h', 'EFETIVO', true, true)
    RETURNING id INTO c_profart;
  ELSE
    UPDATE public.cargos SET carga_horaria = '20h', natureza = 'EFETIVO', docente = true WHERE id = c_profart;
  END IF;

  -- Assistente Administrativo II
  SELECT id INTO c_astadm FROM public.cargos WHERE nome ILIKE '%Assistente Administrativo II%' LIMIT 1;
  IF c_astadm IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Assistente Administrativo II', '40h', 'EFETIVO', false, true)
    RETURNING id INTO c_astadm;
  ELSE
    UPDATE public.cargos SET carga_horaria = '40h', natureza = 'EFETIVO', docente = false WHERE id = c_astadm;
  END IF;

  -- Auxiliar de Serviços Gerais
  SELECT id INTO c_auxsg FROM public.cargos WHERE nome ILIKE '%Auxiliar de Serviços Gerais%' LIMIT 1;
  IF c_auxsg IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Auxiliar de Serviços Gerais', '40h', 'EFETIVO', false, true)
    RETURNING id INTO c_auxsg;
  ELSE
    UPDATE public.cargos SET carga_horaria = '40h', natureza = 'EFETIVO', docente = false WHERE id = c_auxsg;
  END IF;

  -- Agente Educacional I
  SELECT id INTO c_age1 FROM public.cargos WHERE nome ILIKE '%Agente Educacional I%' AND nome NOT ILIKE '%II%' LIMIT 1;
  IF c_age1 IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Agente Educacional I', '40h', 'EFETIVO', false, true)
    RETURNING id INTO c_age1;
  ELSE
    UPDATE public.cargos SET carga_horaria = '40h', natureza = 'EFETIVO', docente = false WHERE id = c_age1;
  END IF;

  -- Agente Educacional II
  SELECT id INTO c_age2 FROM public.cargos WHERE nome ILIKE '%Agente Educacional II%' LIMIT 1;
  IF c_age2 IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Agente Educacional II', '40h', 'EFETIVO', false, true)
    RETURNING id INTO c_age2;
  ELSE
    UPDATE public.cargos SET carga_horaria = '40h', natureza = 'EFETIVO', docente = false WHERE id = c_age2;
  END IF;

  -- Terceirizados & Outros
  -- Recepcionista (terceirizado)
  SELECT id INTO c_rec FROM public.cargos WHERE nome ILIKE '%Recepcionista%' LIMIT 1;
  IF c_rec IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Recepcionista (terceirizado)', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_rec;
  ELSE
    UPDATE public.cargos SET natureza = 'TERCEIRIZADO' WHERE id = c_rec;
  END IF;

  -- Apoio Educacional (terceirizado)
  SELECT id INTO c_apoio FROM public.cargos WHERE nome ILIKE '%Apoio Educacional%' LIMIT 1;
  IF c_apoio IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Apoio Educacional (terceirizado)', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_apoio;
  ELSE
    UPDATE public.cargos SET natureza = 'TERCEIRIZADO' WHERE id = c_apoio;
  END IF;

  -- Copa/Cantina/Merenda (terceirizado)
  SELECT id INTO c_copa FROM public.cargos WHERE nome ILIKE '%Copa%' OR nome ILIKE '%Merenda%' LIMIT 1;
  IF c_copa IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Copa/Cantina/Merenda (terceirizado)', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_copa;
  ELSE
    UPDATE public.cargos SET natureza = 'TERCEIRIZADO' WHERE id = c_copa;
  END IF;

  -- Zeladoria (terceirizado)
  SELECT id INTO c_zel FROM public.cargos WHERE nome ILIKE '%Zeladoria%' LIMIT 1;
  IF c_zel IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Zeladoria (terceirizado)', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_zel;
  ELSE
    UPDATE public.cargos SET natureza = 'TERCEIRIZADO' WHERE id = c_zel;
  END IF;

  -- Limpeza (terceirizado)
  SELECT id INTO c_limp FROM public.cargos WHERE nome ILIKE '%Limpeza%' LIMIT 1;
  IF c_limp IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Limpeza (terceirizado)', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_limp;
  ELSE
    UPDATE public.cargos SET natureza = 'TERCEIRIZADO' WHERE id = c_limp;
  END IF;

  -- Inspetoria
  SELECT id INTO c_insp FROM public.cargos WHERE nome ILIKE '%Inspetoria%' LIMIT 1;
  IF c_insp IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Inspetoria', '40h', 'EFETIVO', false, true)
    RETURNING id INTO c_insp;
  END IF;

  -- Vigilante Armado
  SELECT id INTO c_vig FROM public.cargos WHERE nome ILIKE '%Vigilante Armado%' LIMIT 1;
  IF c_vig IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Vigilante Armado', '44h', 'TERCEIRIZADO', false, true)
    RETURNING id INTO c_vig;
  END IF;

  -- Professor Readaptado
  SELECT id INTO c_readap FROM public.cargos WHERE nome ILIKE '%Professor Readaptado%' LIMIT 1;
  IF c_readap IS NULL THEN
    INSERT INTO public.cargos (nome, carga_horaria, natureza, docente, ativo)
    VALUES ('Professor Readaptado', '20h', 'EFETIVO', true, true)
    RETURNING id INTO c_readap;
  END IF;


  -- 2. Funções especificadas
  -- Diretor Escolar
  SELECT id INTO f_dir FROM public.funcoes WHERE nome ILIKE 'Diretor Escolar' LIMIT 1;
  IF f_dir IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Diretor Escolar', false, true) RETURNING id INTO f_dir;
  END IF;

  -- Coordenador Pedagógico
  SELECT id INTO f_coord FROM public.funcoes WHERE nome ILIKE 'Coordenador Pedagógico' LIMIT 1;
  IF f_coord IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Coordenador Pedagógico', false, true) RETURNING id INTO f_coord;
  END IF;

  -- Suporte Pedagógico (geral)
  SELECT id INTO f_sup_geral FROM public.funcoes WHERE nome ILIKE 'Suporte Pedagógico (geral)' OR nome = 'Suporte Pedagógico' LIMIT 1;
  IF f_sup_geral IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Suporte Pedagógico (geral)', false, true) RETURNING id INTO f_sup_geral;
  ELSE
    UPDATE public.funcoes SET nome = 'Suporte Pedagógico (geral)' WHERE id = f_sup_geral;
  END IF;

  -- Suporte Pedagógico de Sala
  SELECT id INTO f_sup_sala FROM public.funcoes WHERE nome ILIKE 'Suporte Pedagógico de Sala' LIMIT 1;
  IF f_sup_sala IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Suporte Pedagógico de Sala', false, true) RETURNING id INTO f_sup_sala;
  END IF;

  -- Professor Regente
  SELECT id INTO f_regente FROM public.funcoes WHERE nome ILIKE 'Professor Regente' LIMIT 1;
  IF f_regente IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Professor Regente', false, true) RETURNING id INTO f_regente;
  END IF;

  -- Secretário Escolar
  SELECT id INTO f_secretario FROM public.funcoes WHERE nome ILIKE 'Secretário Escolar' LIMIT 1;
  IF f_secretario IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Secretário Escolar', false, true) RETURNING id INTO f_secretario;
  END IF;

  -- Assessor de Sala de Leitura
  SELECT id INTO f_assessor FROM public.funcoes WHERE nome ILIKE 'Assessor de Sala de Leitura' LIMIT 1;
  IF f_assessor IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Assessor de Sala de Leitura', false, true) RETURNING id INTO f_assessor;
  END IF;

  -- Apoio Permanente
  SELECT id INTO f_apoio_perm FROM public.funcoes WHERE nome ILIKE 'Apoio Permanente' LIMIT 1;
  IF f_apoio_perm IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Apoio Permanente', false, true) RETURNING id INTO f_apoio_perm;
  END IF;

  -- R2
  SELECT id INTO f_r2 FROM public.funcoes WHERE nome = 'R2' LIMIT 1;
  IF f_r2 IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('R2', false, true) RETURNING id INTO f_r2;
  END IF;

  -- Professor de Arte
  SELECT id INTO f_prof_art FROM public.funcoes WHERE nome ILIKE 'Professor de Arte' LIMIT 1;
  IF f_prof_art IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Professor de Arte', false, true) RETURNING id INTO f_prof_art;
  END IF;

  -- Professor de Ed. Física
  SELECT id INTO f_prof_edfis FROM public.funcoes WHERE nome ILIKE '%Ed. Física%' OR nome ILIKE '%Educação Física%' LIMIT 1;
  IF f_prof_edfis IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Professor de Ed. Física', false, true) RETURNING id INTO f_prof_edfis;
  END IF;

  -- Serviços Gerais Feminino
  SELECT id INTO f_sg_fem FROM public.funcoes WHERE nome ILIKE 'Serviços Gerais Feminino' LIMIT 1;
  IF f_sg_fem IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Serviços Gerais Feminino', false, true) RETURNING id INTO f_sg_fem;
  END IF;

  -- Serviços Gerais Masculino
  SELECT id INTO f_sg_masc FROM public.funcoes WHERE nome ILIKE 'Serviços Gerais Masculino' LIMIT 1;
  IF f_sg_masc IS NULL THEN
    INSERT INTO public.funcoes (nome, exige_autorizacao_semed, ativo)
    VALUES ('Serviços Gerais Masculino', false, true) RETURNING id INTO f_sg_masc;
  END IF;


  -- 3. Versão 2026 - RASCUNHO
  SELECT id INTO v_versao_id FROM public.rh_versoes_configuracao WHERE ano_letivo = 2026 AND descricao = 'Portaria Preliminar de Porte e Lotação 2026' LIMIT 1;
  IF v_versao_id IS NULL THEN
    INSERT INTO public.rh_versoes_configuracao (ano_letivo, descricao, status, criado_por)
    VALUES (2026, 'Portaria Preliminar de Porte e Lotação 2026', 'RASCUNHO', 'SEMED - Gestão Escolar')
    RETURNING id INTO v_versao_id;
  END IF;

  -- 4. Matriz Cargo x Função para esta versão
  -- Limpar vínculos anteriores desta versão para recarregar conforme seed
  DELETE FROM public.rh_cargo_funcao WHERE versao_id = v_versao_id;

  -- Prof. EI 40h e Prof. 20h: Diretor, Coordenador, Suporte, Apoio Permanente, R2, Regente
  INSERT INTO public.rh_cargo_funcao (versao_id, cargo_id, funcao_id, condicao)
  VALUES
    (v_versao_id, c_prof20, f_dir, 'NENHUMA'),
    (v_versao_id, c_prof20, f_coord, 'NENHUMA'),
    (v_versao_id, c_prof20, f_sup_geral, 'NENHUMA'),
    (v_versao_id, c_prof20, f_apoio_perm, 'NENHUMA'),
    (v_versao_id, c_prof20, f_r2, 'NENHUMA'),
    (v_versao_id, c_prof20, f_regente, 'NENHUMA'),

    (v_versao_id, c_prof40, f_dir, 'NENHUMA'),
    (v_versao_id, c_prof40, f_coord, 'NENHUMA'),
    (v_versao_id, c_prof40, f_sup_geral, 'NENHUMA'),
    (v_versao_id, c_prof40, f_apoio_perm, 'NENHUMA'),
    (v_versao_id, c_prof40, f_r2, 'NENHUMA'),
    (v_versao_id, c_prof40, f_regente, 'NENHUMA'),

    -- Prof. Arte e Prof. Ed. Física: Diretor (+ respectivas funções docentes)
    (v_versao_id, c_profart, f_dir, 'NENHUMA'),
    (v_versao_id, c_profart, f_prof_art, 'NENHUMA'),
    (v_versao_id, c_proffis, f_dir, 'NENHUMA'),
    (v_versao_id, c_proffis, f_prof_edfis, 'NENHUMA'),

    -- Professor Readaptado (READAPTADO_COMPATIVEL_LAUDO): Diretor, Coordenador, Suporte, Assessor de Sala de Leitura, Apoio Permanente
    (v_versao_id, c_readap, f_dir, 'READAPTADO_COMPATIVEL_LAUDO'),
    (v_versao_id, c_readap, f_coord, 'READAPTADO_COMPATIVEL_LAUDO'),
    (v_versao_id, c_readap, f_sup_geral, 'READAPTADO_COMPATIVEL_LAUDO'),
    (v_versao_id, c_readap, f_assessor, 'READAPTADO_COMPATIVEL_LAUDO'),
    (v_versao_id, c_readap, f_apoio_perm, 'READAPTADO_COMPATIVEL_LAUDO'),

    -- Assistente Administrativo II: Secretário Escolar, Assessor de Sala de Leitura
    (v_versao_id, c_astadm, f_secretario, 'NENHUMA'),
    (v_versao_id, c_astadm, f_assessor, 'NENHUMA'),

    -- Agente Educacional I e Aux. Serviços Gerais: Serviços Gerais Fem e Masc
    (v_versao_id, c_auxsg, f_sg_fem, 'NENHUMA'),
    (v_versao_id, c_auxsg, f_sg_masc, 'NENHUMA'),
    (v_versao_id, c_age1, f_sg_fem, 'NENHUMA'),
    (v_versao_id, c_age1, f_sg_masc, 'NENHUMA'),

    -- Agente Educacional II: Suporte Pedagógico de Sala (AUTORIZACAO_SEMED)
    (v_versao_id, c_age2, f_sup_sala, 'AUTORIZACAO_SEMED')
  ON CONFLICT (versao_id, cargo_id, funcao_id) DO NOTHING;


  -- 5. Tipos de Atendimento da versão
  DELETE FROM public.rh_tipos_atendimento WHERE versao_id = v_versao_id;

  INSERT INTO public.rh_tipos_atendimento (versao_id, nome, criterio_porte)
  VALUES (v_versao_id, 'Ensino Fundamental e Educação Infantil (20h)', 'ALUNOS')
  RETURNING id INTO v_tipo_20h_id;

  INSERT INTO public.rh_tipos_atendimento (versao_id, nome, criterio_porte)
  VALUES (v_versao_id, 'Educação Infantil (40h)', 'ALUNOS')
  RETURNING id INTO v_tipo_40h_id;

  -- Modalidades Excluídas
  INSERT INTO public.rh_modalidades_excluidas (tipo_atendimento_id, modalidade)
  VALUES
    (v_tipo_20h_id, 'JORNADA_AMPLIADA'),
    (v_tipo_20h_id, 'EJA'),
    (v_tipo_20h_id, 'SALA_RECURSOS_MULTIFUNCIONAIS'),
    (v_tipo_40h_id, 'JORNADA_AMPLIADA'),
    (v_tipo_40h_id, 'EJA'),
    (v_tipo_40h_id, 'SALA_RECURSOS_MULTIFUNCIONAIS')
  ON CONFLICT DO NOTHING;


  -- 6. Níveis de Porte
  -- Tipo 20h: I <=100 | II 101-150 | III 151-220 | IV 221-320 | V 321-420 | VI 421-500 | VII 501-600 | VIII >600
  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'I', 1, 0, 100) RETURNING id INTO n_20_1;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'II', 2, 101, 150) RETURNING id INTO n_20_2;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'III', 3, 151, 220) RETURNING id INTO n_20_3;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'IV', 4, 221, 320) RETURNING id INTO n_20_4;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'V', 5, 321, 420) RETURNING id INTO n_20_5;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'VI', 6, 421, 500) RETURNING id INTO n_20_6;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'VII', 7, 501, 600) RETURNING id INTO n_20_7;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_20h_id, 'VIII', 8, 601, NULL) RETURNING id INTO n_20_8;

  -- Tipo 40h: A <=100 | B 101-140 | C >=141
  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_40h_id, 'A', 1, 0, 100) RETURNING id INTO n_40_a;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_40h_id, 'B', 2, 101, 140) RETURNING id INTO n_40_b;

  INSERT INTO public.rh_niveis (versao_id, tipo_atendimento_id, codigo_nivel, ordem, min_alunos, max_alunos)
  VALUES (v_versao_id, v_tipo_40h_id, 'C', 3, 141, NULL) RETURNING id INTO n_40_c;


  -- 7. Regras do Nível (Tipo 20h - Níveis I a VIII)
  -- Diretor (FIXO_ESCOLA: 1 em todos)
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_2, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_3, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_4, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_5, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_6, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_7, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_8, f_dir, 1, 'FIXO_ESCOLA', 'FIXO');

  -- Coordenador Pedagógico (POR_TURNO: 1,1,1,1,1,1,1,2)
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_2, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_3, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_4, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_5, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_6, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_7, f_coord, 1, 'POR_TURNO', 'FIXO'),
    (n_20_8, f_coord, 2, 'POR_TURNO', 'FIXO');

  -- Suporte Pedagógico geral (POR_TURNO: 0,0,1,1,1,1,2,3)
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_sup_geral, 0, 'POR_TURNO', 'FIXO'),
    (n_20_2, f_sup_geral, 0, 'POR_TURNO', 'FIXO'),
    (n_20_3, f_sup_geral, 1, 'POR_TURNO', 'FIXO'),
    (n_20_4, f_sup_geral, 1, 'POR_TURNO', 'FIXO'),
    (n_20_5, f_sup_geral, 1, 'POR_TURNO', 'FIXO'),
    (n_20_6, f_sup_geral, 1, 'POR_TURNO', 'FIXO'),
    (n_20_7, f_sup_geral, 2, 'POR_TURNO', 'FIXO'),
    (n_20_8, f_sup_geral, 3, 'POR_TURNO', 'FIXO');

  -- Professor Regente (POR_TURMA: 1 em todos)
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_2, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_3, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_4, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_5, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_6, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_7, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_20_8, f_regente, 1, 'POR_TURMA', 'FIXO');

  -- Secretário Escolar: I e II = 1 ITINERANTE; III a VI = 1 FIXO; VII e VIII = 2 FIXO
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_secretario, 1, 'FIXO_ESCOLA', 'ITINERANTE'),
    (n_20_2, f_secretario, 1, 'FIXO_ESCOLA', 'ITINERANTE'),
    (n_20_3, f_secretario, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_4, f_secretario, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_5, f_secretario, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_6, f_secretario, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_7, f_secretario, 2, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_8, f_secretario, 2, 'FIXO_ESCOLA', 'FIXO');

  -- Assessor Sala de Leitura: I e II = 1 ITINERANTE; III a VII = 1 FIXO; VIII = 2 FIXO
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_assessor, 1, 'FIXO_ESCOLA', 'ITINERANTE'),
    (n_20_2, f_assessor, 1, 'FIXO_ESCOLA', 'ITINERANTE'),
    (n_20_3, f_assessor, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_4, f_assessor, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_5, f_assessor, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_6, f_assessor, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_7, f_assessor, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_8, f_assessor, 2, 'FIXO_ESCOLA', 'FIXO');

  -- Serviços Gerais Feminino: 2,5,6,7,8,9,10,13
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_sg_fem, 2, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_2, f_sg_fem, 5, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_3, f_sg_fem, 6, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_4, f_sg_fem, 7, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_5, f_sg_fem, 8, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_6, f_sg_fem, 9, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_7, f_sg_fem, 10, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_8, f_sg_fem, 13, 'FIXO_ESCOLA', 'FIXO');

  -- Serviços Gerais Masculino: 1 em todos
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_20_1, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_2, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_3, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_4, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_5, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_6, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_7, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_20_8, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO');


  -- 8. Regras do Nível (Tipo 40h - Níveis A, B, C)
  -- Diretor: 1 em todos
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_b, f_dir, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_c, f_dir, 1, 'FIXO_ESCOLA', 'FIXO');

  -- Coordenador Pedagógico: 1 em todos
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_coord, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_b, f_coord, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_c, f_coord, 1, 'FIXO_ESCOLA', 'FIXO');

  -- Regente POR_TURMA 1 em todos
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_40_b, f_regente, 1, 'POR_TURMA', 'FIXO'),
    (n_40_c, f_regente, 1, 'POR_TURMA', 'FIXO');

  -- Suporte Pedagógico de Sala: POR_TURMA_ETAPA 1, etapas ["INFANTIL", "INFANTIL_I", "INFANTIL_II"]
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade, etapas_filtro)
  VALUES
    (n_40_a, f_sup_sala, 1, 'POR_TURMA_ETAPA', 'FIXO', '["INFANTIL", "INFANTIL_I", "INFANTIL_II"]'::jsonb),
    (n_40_b, f_sup_sala, 1, 'POR_TURMA_ETAPA', 'FIXO', '["INFANTIL", "INFANTIL_I", "INFANTIL_II"]'::jsonb),
    (n_40_c, f_sup_sala, 1, 'POR_TURMA_ETAPA', 'FIXO', '["INFANTIL", "INFANTIL_I", "INFANTIL_II"]'::jsonb);

  -- Suporte Pedagógico Geral: A=1, B=2, C=2
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_sup_geral, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_b, f_sup_geral, 2, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_c, f_sup_geral, 2, 'FIXO_ESCOLA', 'FIXO');

  -- Secretário Escolar: A = 1 ITINERANTE 2x/sem; B = 1 ITINERANTE 3x/sem; C = 1 FIXO
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade, dias_semana)
  VALUES
    (n_40_a, f_secretario, 1, 'FIXO_ESCOLA', 'ITINERANTE', 2),
    (n_40_b, f_secretario, 1, 'FIXO_ESCOLA', 'ITINERANTE', 3),
    (n_40_c, f_secretario, 1, 'FIXO_ESCOLA', 'FIXO', NULL);

  -- Serviços Gerais Feminino: 4, 6, 7
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_sg_fem, 4, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_b, f_sg_fem, 6, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_c, f_sg_fem, 7, 'FIXO_ESCOLA', 'FIXO');

  -- Serviços Gerais Masculino: 1, 1, 1
  INSERT INTO public.rh_regras_nivel (nivel_id, funcao_id, quantidade, base_calculo, modalidade)
  VALUES
    (n_40_a, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_b, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO'),
    (n_40_c, f_sg_masc, 1, 'FIXO_ESCOLA', 'FIXO');


  -- 9. Regras por número de turmas (Arte, Ed. Física, R2)
  -- Padrão: aplicar ao tipo 20h. Para o 40h, deixar configurável e desligado.
  DELETE FROM public.rh_regras_turmas WHERE versao_id = v_versao_id;

  -- Arte (tipo 20h)
  -- <=6 -> 0 fixo + 1 itin | 7 -> 1+0 | 8-13 -> 1+1 | 14 -> 2+0 | >=15 -> 2+1
  INSERT INTO public.rh_regras_turmas (versao_id, funcao_id, tipo_atendimento_id, min_turmas, max_turmas, qtd_fixo, qtd_itinerante)
  VALUES
    (v_versao_id, f_prof_art, v_tipo_20h_id, 1, 6, 0, 1),
    (v_versao_id, f_prof_art, v_tipo_20h_id, 7, 7, 1, 0),
    (v_versao_id, f_prof_art, v_tipo_20h_id, 8, 13, 1, 1),
    (v_versao_id, f_prof_art, v_tipo_20h_id, 14, 14, 2, 0),
    (v_versao_id, f_prof_art, v_tipo_20h_id, 15, NULL, 2, 1);

  -- R2 (tipo 20h)
  -- <=6 -> 0+1 | 7 -> 1+0 | 8-13 -> 1+1 | 14 -> 2+0 | >=15 -> 2+1
  INSERT INTO public.rh_regras_turmas (versao_id, funcao_id, tipo_atendimento_id, min_turmas, max_turmas, qtd_fixo, qtd_itinerante)
  VALUES
    (v_versao_id, f_r2, v_tipo_20h_id, 1, 6, 0, 1),
    (v_versao_id, f_r2, v_tipo_20h_id, 7, 7, 1, 0),
    (v_versao_id, f_r2, v_tipo_20h_id, 8, 13, 1, 1),
    (v_versao_id, f_r2, v_tipo_20h_id, 14, 14, 2, 0),
    (v_versao_id, f_r2, v_tipo_20h_id, 15, NULL, 2, 1);

  -- Ed. Física (tipo 20h)
  -- <=5 -> 0+1 | 6-7 -> 1+0 | 8-13 -> 1+1 | 14 -> 2+0 | >=15 -> 2+1
  INSERT INTO public.rh_regras_turmas (versao_id, funcao_id, tipo_atendimento_id, min_turmas, max_turmas, qtd_fixo, qtd_itinerante)
  VALUES
    (v_versao_id, f_prof_edfis, v_tipo_20h_id, 1, 5, 0, 1),
    (v_versao_id, f_prof_edfis, v_tipo_20h_id, 6, 7, 1, 0),
    (v_versao_id, f_prof_edfis, v_tipo_20h_id, 8, 13, 1, 1),
    (v_versao_id, f_prof_edfis, v_tipo_20h_id, 14, 14, 2, 0),
    (v_versao_id, f_prof_edfis, v_tipo_20h_id, 15, NULL, 2, 1);

END $$;
