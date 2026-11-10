-- Recria a RPC da Rotina de Limpeza do Banco de Dados com:
-- 1. Ordem de exclusão pais→filhos revisada (todas as referências às entidades
--    selecionadas são eliminadas antes delas, incluindo as tabelas filhas de
--    profissionais: profissional_ano_inscricoes e profissional_especializacoes).
-- 2. Diagnóstico por etapa: cada DELETE tem seu próprio bloco EXCEPTION que
--    levanta erro estruturado "LIMPEZA_BLOQUEIO|<causa amigável>|<detalhe técnico>",
--    permitindo ao frontend informar exatamente qual vínculo/tabela impediu.
-- 3. Atomicidade preservada: qualquer falha reverte TODA a rotina (subtransações
--    + abort da função), mantendo a promessa "Nenhuma alteração foi realizada".

CREATE OR REPLACE FUNCTION public.executar_limpeza_banco(
  p_preservar_auditoria boolean,
  p_preservar_cargos_funcoes boolean,
  p_usuario_nome text DEFAULT 'Administrador'::text,
  p_usuario_email text DEFAULT 'sistema@local'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID;
  v_count_prof_vagas INT := 0;
  v_count_vagas INT := 0;
  v_count_prof_inscricoes INT := 0;
  v_count_prof_especializacoes INT := 0;
  v_count_profissionais INT := 0;
  v_count_turmas INT := 0;
  v_count_usuarios_op INT := 0;
  v_count_permissoes_op INT := 0;
  v_count_porte_escola INT := 0;
  v_count_funcao_cargos INT := 0;
  v_count_cfg_vagas INT := 0;
  v_count_cfg_niveis INT := 0;
  v_count_cfg_linhas_cargos INT := 0;
  v_count_cfg_linhas INT := 0;
  v_count_funcoes INT := 0;
  v_count_cargos INT := 0;
  v_count_auditoria_antiga INT := 0;
  v_total_excluidos INT := 0;
  v_resultado JSONB;
  v_detalhes_auditoria JSONB;
BEGIN
  -- Obter o ID do usuário conectado
  v_user_id := auth.uid();

  -- Se p_usuario_email foi passado mas o usuário logado existe, pode tentar enriquecer
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO p_usuario_email FROM auth.users WHERE id = v_user_id;
  END IF;

  -- ============================================================
  -- ETAPA 1: Vínculos de profissionais com vagas (profissional_vagas)
  -- ============================================================
  BEGIN
    DELETE FROM public.profissional_vagas;
    GET DIAGNOSTICS v_count_prof_vagas = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os vínculos entre profissionais e vagas porque ainda existem registros dependentes (integridade referencial).|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 2: Vagas (remove antes de turmas, cargos, funções e profissionais)
  -- ============================================================
  BEGIN
    DELETE FROM public.vaga;
    GET DIAGNOSTICS v_count_vagas = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as vagas porque ainda existem vínculos com profissionais, turmas ou configurações de RH que as referenciam.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 3: Tabelas filhas de profissionais (inscrições por ano e
  -- especializações) — precisam sair antes dos profissionais
  -- ============================================================
  BEGIN
    DELETE FROM public.profissional_ano_inscricoes;
    GET DIAGNOSTICS v_count_prof_inscricoes = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as inscrições de profissionais por ano letivo porque ainda existem registros vinculados.|% %', SQLSTATE, SQLERRM;
  END;

  BEGIN
    DELETE FROM public.profissional_especializacoes;
    GET DIAGNOSTICS v_count_prof_especializacoes = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as especializações dos profissionais porque ainda existem registros vinculados.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 4: Profissionais (vagas já foram excluídas na etapa 2,
  -- então não há mais RESTRICT de profissional_titular/ocupante)
  -- ============================================================
  BEGIN
    DELETE FROM public.profissionais;
    GET DIAGNOSTICS v_count_profissionais = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os profissionais porque ainda existem vagas ou vínculos que apontam para eles.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 5: Turmas (vagas já foram excluídas, sem FK pendente)
  -- ============================================================
  BEGIN
    DELETE FROM public.turmas;
    GET DIAGNOSTICS v_count_turmas = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as turmas porque ainda existem vagas ou vínculos que as referenciam.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 6: Porte da escola por ano letivo
  -- ============================================================
  BEGIN
    DELETE FROM public.porte_escola_ano;
    GET DIAGNOSTICS v_count_porte_escola = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os registros de porte escolar porque ainda existem vínculos com unidades ou anos letivos.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 7: Usuários não-administradores (preservando Administrador)
  -- ============================================================
  BEGIN
    DELETE FROM public.permissoes_usuario
    WHERE usuario_id IN (
      SELECT id FROM public.usuarios_sistema WHERE perfil <> 'Administrador'
    );
    GET DIAGNOSTICS v_count_permissoes_op = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as permissões individuais dos usuários operadores.|% %', SQLSTATE, SQLERRM;
  END;

  BEGIN
    DELETE FROM public.usuarios_sistema WHERE perfil <> 'Administrador';
    GET DIAGNOSTICS v_count_usuarios_op = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os usuários não-administradores porque ainda existem permissões ou registros vinculados a eles.|% %', SQLSTATE, SQLERRM;
  END;

  -- ============================================================
  -- ETAPA 8: Cargos e funções (somente se o usuário optou por NÃO preservar)
  -- ============================================================
  IF NOT p_preservar_cargos_funcoes THEN
    BEGIN
      DELETE FROM public.funcao_cargos;
      GET DIAGNOSTICS v_count_funcao_cargos = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os vínculos entre funções e cargos (funcao_cargos).|% %', SQLSTATE, SQLERRM;
    END;

    -- As linhas da configuração de RH referenciam funções/cargos com RESTRICT,
    -- e as vagas referenciam as linhas com RESTRICT — como as vagas já foram
    -- excluídas na etapa 2, a matriz de linhas pode ser removida com segurança.
    BEGIN
      DELETE FROM public.configuracao_rh_vaga;
      GET DIAGNOSTICS v_count_cfg_vagas = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as vagas previstas na configuração de RH (configuracao_rh_vaga).|% %', SQLSTATE, SQLERRM;
    END;

    BEGIN
      DELETE FROM public.configuracao_rh_linha_cargo;
      GET DIAGNOSTICS v_count_cfg_linhas_cargos = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os cargos vinculados às linhas da configuração de RH.|% %', SQLSTATE, SQLERRM;
    END;

    BEGIN
      DELETE FROM public.configuracao_rh_linha;
      GET DIAGNOSTICS v_count_cfg_linhas = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as linhas da configuração de RH porque ainda existem registros que as referenciam (ex.: vagas ainda não excluídas).|% %', SQLSTATE, SQLERRM;
    END;

    BEGIN
      DELETE FROM public.funcoes;
      GET DIAGNOSTICS v_count_funcoes = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir as funções porque ainda existem vagas ou linhas de configuração de RH que as referenciam.|% %', SQLSTATE, SQLERRM;
    END;

    BEGIN
      DELETE FROM public.cargos;
      GET DIAGNOSTICS v_count_cargos = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir os cargos porque ainda existem vagas, vínculos de profissionais ou linhas de configuração de RH que os referenciam.|% %', SQLSTATE, SQLERRM;
    END;
  END IF;

  -- ============================================================
  -- ETAPA 9: Auditoria histórica (somente se o usuário optou por NÃO preservar)
  -- ============================================================
  IF NOT p_preservar_auditoria THEN
    BEGIN
      DELETE FROM public.auditoria;
      GET DIAGNOSTICS v_count_auditoria_antiga = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|Não foi possível excluir o histórico de logs de auditoria.|% %', SQLSTATE, SQLERRM;
    END;
  END IF;

  -- Calcular total de registros excluídos
  v_total_excluidos := v_count_prof_vagas + v_count_vagas + v_count_prof_inscricoes +
                       v_count_prof_especializacoes + v_count_profissionais + v_count_turmas +
                       v_count_porte_escola + v_count_permissoes_op + v_count_usuarios_op +
                       v_count_funcao_cargos + v_count_cfg_vagas + v_count_cfg_linhas_cargos +
                       v_count_cfg_linhas + v_count_funcoes + v_count_cargos +
                       v_count_auditoria_antiga;

  -- Montar detalhes para a auditoria DESTA limpeza (SEMPRE gravada)
  v_detalhes_auditoria := jsonb_build_object(
    'preservar_auditoria', p_preservar_auditoria,
    'preservar_cargos_funcoes', p_preservar_cargos_funcoes,
    'total_excluidos', v_total_excluidos,
    'detalhes_por_tabela', jsonb_build_object(
      'profissional_vagas', v_count_prof_vagas,
      'vaga', v_count_vagas,
      'profissional_ano_inscricoes', v_count_prof_inscricoes,
      'profissional_especializacoes', v_count_prof_especializacoes,
      'profissionais', v_count_profissionais,
      'turmas', v_count_turmas,
      'porte_escola_ano', v_count_porte_escola,
      'permissoes_usuario_operadores', v_count_permissoes_op,
      'usuarios_operadores', v_count_usuarios_op,
      'funcao_cargos', v_count_funcao_cargos,
      'configuracao_rh_vaga', v_count_cfg_vagas,
      'configuracao_rh_linha_cargo', v_count_cfg_linhas_cargos,
      'configuracao_rh_linha', v_count_cfg_linhas,
      'funcoes', v_count_funcoes,
      'cargos', v_count_cargos,
      'auditoria_historica', v_count_auditoria_antiga
    )
  );

  -- Registrar na auditoria a execução da limpeza
  BEGIN
    INSERT INTO public.auditoria (
      entidade,
      acao,
      descricao,
      usuario_id,
      usuario_nome,
      usuario_email,
      detalhes
    ) VALUES (
      'Administração',
      'Exclusão',
      'Execução da Rotina de Limpeza do Banco de Dados: ' || v_total_excluidos || ' registros excluídos.',
      v_user_id,
      COALESCE(p_usuario_nome, 'Administrador'),
      COALESCE(p_usuario_email, 'sistema@local'),
      v_detalhes_auditoria
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'LIMPEZA_BLOQUEIO|A limpeza foi executada, mas não foi possível registrar a auditoria da operação. Toda a rotina foi revertida para manter a consistência.|% %', SQLSTATE, SQLERRM;
  END;

  v_resultado := jsonb_build_object(
    'sucesso', true,
    'total_excluidos', v_total_excluidos,
    'contagens', v_detalhes_auditoria->'detalhes_por_tabela'
  );

  RETURN v_resultado;
END;
$function$;

-- Garante que os perfis da aplicação continuam podendo executar a rotina
GRANT EXECUTE ON FUNCTION public.executar_limpeza_banco(boolean, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.executar_limpeza_banco(boolean, boolean, text, text) TO anon;
