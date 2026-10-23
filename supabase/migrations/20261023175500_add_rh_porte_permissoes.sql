-- Permissões para os novos menus de Configuração de RH por Porte
-- Regra permanente: cada novo cadastro/menu adicionado ao sistema deve ser incluído na matriz de permissões
-- do operador (Pode Ver/Pode Editar), liberado também para operadores já existentes.

DO $$
DECLARE
  v_user record;
BEGIN
  -- 1. Inserir nas permissões de Perfil (Operador)
  INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
  VALUES
    ('Operador', 'rh_versoes', 'Versões de Configuração RH', true, true, true, 13),
    ('Operador', 'rh_matriz', 'Cargos, Funções e Matriz', true, true, true, 14),
    ('Operador', 'rh_niveis_regras', 'Tipos, Níveis e Regras', true, true, true, 15),
    ('Operador', 'rh_regras_turmas', 'Regras por Turmas', true, true, true, 16),
    ('Operador', 'rh_cenario_escola', 'Cálculo de Porte por Escola', true, true, true, 17),
    ('Operador', 'rh_painel_geral', 'Classificação Geral do Porte', true, false, false, 18),
    ('Operador', 'rh_vagas_itinerantes', 'Vagas Itinerantes', true, true, true, 19)
  ON CONFLICT (perfil, menu_key) DO UPDATE
  SET pode_ver = EXCLUDED.pode_ver,
      pode_editar = EXCLUDED.pode_editar,
      suporta_edicao = EXCLUDED.suporta_edicao,
      ordem = EXCLUDED.ordem;

  -- 2. Propagar para todos os usuários existentes na tabela usuarios_sistema
  FOR v_user IN SELECT id, perfil FROM public.usuarios_sistema LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES
      (v_user.id, 'rh_versoes', 'Versões de Configuração RH', true, true, true, 13),
      (v_user.id, 'rh_matriz', 'Cargos, Funções e Matriz', true, true, true, 14),
      (v_user.id, 'rh_niveis_regras', 'Tipos, Níveis e Regras', true, true, true, 15),
      (v_user.id, 'rh_regras_turmas', 'Regras por Turmas', true, true, true, 16),
      (v_user.id, 'rh_cenario_escola', 'Cálculo de Porte por Escola', true, true, true, 17),
      (v_user.id, 'rh_painel_geral', 'Classificação Geral do Porte', true, false, false, 18),
      (v_user.id, 'rh_vagas_itinerantes', 'Vagas Itinerantes', true, true, true, 19)
    ON CONFLICT (usuario_id, menu_key) DO UPDATE
    SET pode_ver = EXCLUDED.pode_ver,
        pode_editar = EXCLUDED.pode_editar,
        suporta_edicao = EXCLUDED.suporta_edicao,
        ordem = EXCLUDED.ordem;
  END LOOP;
END $$;
