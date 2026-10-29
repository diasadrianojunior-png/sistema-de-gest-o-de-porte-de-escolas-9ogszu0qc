-- Migration para adicionar menu 'limpeza_banco' e função RPC de execução de limpeza atômica
-- Data: 2026-10-29T19:35:00.000Z

-- 1. Inserir permissões de perfil para o novo menu 'limpeza_banco'
INSERT INTO public.permissoes_perfil (
  codigo, perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem
) VALUES
  ('PERM-0015', 'Administrador', 'limpeza_banco', 'Rotina de Limpeza do Banco de Dados', true, true, true, 15),
  ('PERM-0016', 'Operador', 'limpeza_banco', 'Rotina de Limpeza do Banco de Dados', true, false, true, 15)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET
  menu_label = EXCLUDED.menu_label,
  ordem = EXCLUDED.ordem,
  suporta_edicao = EXCLUDED.suporta_edicao;

-- 2. Liberar permissão do novo menu para todos os operadores e administradores já cadastrados em permissoes_usuario
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, perfil FROM public.usuarios_sistema LOOP
    IF r.perfil = 'Administrador' THEN
      INSERT INTO public.permissoes_usuario (
        usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem
      ) VALUES (
        r.id, 'limpeza_banco', 'Rotina de Limpeza do Banco de Dados', true, true, true, 15
      ) ON CONFLICT (usuario_id, menu_key) DO UPDATE
      SET
        menu_label = EXCLUDED.menu_label,
        ordem = EXCLUDED.ordem,
        suporta_edicao = EXCLUDED.suporta_edicao;
    ELSE
      INSERT INTO public.permissoes_usuario (
        usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem
      ) VALUES (
        r.id, 'limpeza_banco', 'Rotina de Limpeza do Banco de Dados', true, false, true, 15
      ) ON CONFLICT (usuario_id, menu_key) DO UPDATE
      SET
        menu_label = EXCLUDED.menu_label,
        ordem = EXCLUDED.ordem,
        suporta_edicao = EXCLUDED.suporta_edicao;
    END IF;
  END LOOP;
END $$;

-- 3. Função RPC segura com SECURITY DEFINER para executar a rotina de limpeza do banco de dados
CREATE OR REPLACE FUNCTION public.executar_limpeza_banco(
  p_preservar_auditoria BOOLEAN,
  p_preservar_cargos_funcoes BOOLEAN,
  p_usuario_nome TEXT DEFAULT 'Administrador',
  p_usuario_email TEXT DEFAULT 'sistema@local'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_count_prof_vagas INT := 0;
  v_count_vagas INT := 0;
  v_count_profissionais INT := 0;
  v_count_turmas INT := 0;
  v_count_usuarios_op INT := 0;
  v_count_porte_escola INT := 0;
  v_count_funcao_cargos INT := 0;
  v_count_cfg_vagas INT := 0;
  v_count_cfg_niveis INT := 0;
  v_count_cfg_linhas_cargos INT := 0;
  v_count_cfg_linhas INT := 0;
  v_count_cfg_rh INT := 0;
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

  -- 1. Desvincular turmas de vagas se houver (caso alguma vaga não seja excluída de imediato)
  UPDATE public.vaga SET turma_id = NULL WHERE turma_id IS NOT NULL;

  -- 2. Excluir profissional_vagas (vínculos de profissionais com vagas)
  DELETE FROM public.profissional_vagas;
  GET DIAGNOSTICS v_count_prof_vagas = ROW_COUNT;

  -- 3. Excluir vagas
  DELETE FROM public.vaga;
  GET DIAGNOSTICS v_count_vagas = ROW_COUNT;

  -- 4. Excluir profissionais
  DELETE FROM public.profissionais;
  GET DIAGNOSTICS v_count_profissionais = ROW_COUNT;

  -- 5. Excluir turmas
  DELETE FROM public.turmas;
  GET DIAGNOSTICS v_count_turmas = ROW_COUNT;

  -- 6. Excluir porte_escola_ano (avaliação de porte dos anos anteriores)
  DELETE FROM public.porte_escola_ano;
  GET DIAGNOSTICS v_count_porte_escola = ROW_COUNT;

  -- 7. Excluir usuários não-administradores (preservando perfil 'Administrador')
  -- Primeiro remove de permissoes_usuario para os usuários operadores
  DELETE FROM public.permissoes_usuario
  WHERE usuario_id IN (
    SELECT id FROM public.usuarios_sistema WHERE perfil <> 'Administrador'
  );

  DELETE FROM public.usuarios_sistema WHERE perfil <> 'Administrador';
  GET DIAGNOSTICS v_count_usuarios_op = ROW_COUNT;

  -- 8. Tratar cargos e funções se o usuário optou por NÃO preservar
  IF NOT p_preservar_cargos_funcoes THEN
    -- Desvincular qualquer referência residual
    DELETE FROM public.funcao_cargos;
    GET DIAGNOSTICS v_count_funcao_cargos = ROW_COUNT;

    -- Para que cargos e funções possam ser excluídos sem violação de FK com configuracao_rh_linha:
    -- Remove as linhas e vagas de configuração de RH dependentes
    DELETE FROM public.configuracao_rh_vaga;
    GET DIAGNOSTICS v_count_cfg_vagas = ROW_COUNT;

    DELETE FROM public.configuracao_rh_linha_cargo;
    GET DIAGNOSTICS v_count_cfg_linhas_cargos = ROW_COUNT;

    DELETE FROM public.configuracao_rh_linha;
    GET DIAGNOSTICS v_count_cfg_linhas = ROW_COUNT;

    -- Agora exclui funcoes
    DELETE FROM public.funcoes;
    GET DIAGNOSTICS v_count_funcoes = ROW_COUNT;

    -- Agora exclui cargos
    DELETE FROM public.cargos;
    GET DIAGNOSTICS v_count_cargos = ROW_COUNT;
  END IF;

  -- 9. Tratar registros de auditoria se o usuário optou por NÃO preservar
  IF NOT p_preservar_auditoria THEN
    DELETE FROM public.auditoria;
    GET DIAGNOSTICS v_count_auditoria_antiga = ROW_COUNT;
  END IF;

  -- Calcular total de registros excluídos
  v_total_excluidos := v_count_prof_vagas + v_count_vagas + v_count_profissionais +
                       v_count_turmas + v_count_porte_escola + v_count_usuarios_op +
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
      'profissionais', v_count_profissionais,
      'turmas', v_count_turmas,
      'porte_escola_ano', v_count_porte_escola,
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

  v_resultado := jsonb_build_object(
    'sucesso', true,
    'total_excluidos', v_total_excluidos,
    'contagens', v_detalhes_auditoria->'detalhes_por_tabela'
  );

  RETURN v_resultado;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro durante a rotina de limpeza: %', SQLERRM;
END;
$$;

-- 4. Permitir que authenticated execute a função RPC
GRANT EXECUTE ON FUNCTION public.executar_limpeza_banco(BOOLEAN, BOOLEAN, TEXT, TEXT) TO authenticated;
