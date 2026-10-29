-- Garantir que Roberto Conceição e CMEI Pasquina R. Jacomel possuam registro no cadastro porte_escola_ano
-- para o Ano Letivo 2026, de acordo com os dados das unidades e de unidade_escolar_ano.

DO $$
DECLARE
  v_roberto_id uuid;
  v_pasquina_id uuid;
BEGIN
  SELECT id INTO v_roberto_id FROM public.unidades_escolares WHERE nome ILIKE '%Roberto Conceição%' LIMIT 1;
  SELECT id INTO v_pasquina_id FROM public.unidades_escolares WHERE nome ILIKE '%Pasquina%' LIMIT 1;

  IF v_roberto_id IS NOT NULL THEN
    INSERT INTO public.porte_escola_ano (
      unidade_escolar_id,
      ano_letivo,
      quantidade_alunos,
      nivel_faixa,
      nivel_sugerido,
      justificativa_mudanca
    ) VALUES (
      v_roberto_id,
      2026,
      323,
      'Nível V: De 321 a 420 alunos',
      'Nível V: De 321 a 420 alunos',
      NULL
    )
    ON CONFLICT (unidade_escolar_id, ano_letivo)
    DO UPDATE SET
      quantidade_alunos = 323,
      nivel_faixa = 'Nível V: De 321 a 420 alunos',
      updated_at = NOW();
  END IF;

  IF v_pasquina_id IS NOT NULL THEN
    INSERT INTO public.porte_escola_ano (
      unidade_escolar_id,
      ano_letivo,
      quantidade_alunos,
      nivel_faixa,
      nivel_sugerido,
      justificativa_mudanca
    ) VALUES (
      v_pasquina_id,
      2026,
      65,
      'Nível A: De 0 a 90 alunos',
      'Nível A: De 0 a 90 alunos',
      NULL
    )
    ON CONFLICT (unidade_escolar_id, ano_letivo)
    DO UPDATE SET
      quantidade_alunos = 65,
      nivel_faixa = 'Nível A: De 0 a 90 alunos',
      updated_at = NOW();
  END IF;
END $$;
