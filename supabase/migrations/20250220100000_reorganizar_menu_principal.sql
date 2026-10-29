-- Migração para atualizar a ordem de exibição das permissões dos operadores existentes
-- Reflete a nova ordem do Menu Principal:
-- 1: Painel de Início
-- 2..5: Cadastros de Apoio (Cargos, Funções, Etapas, Ano/Série)
-- 6..11: Cadastros Mestres (Unidades, Turmas, Profissionais, Porte, Configuração de RH, Cadastro de Vagas)
-- 12..14: Administração do Sistema (Usuários, Contas de Email, Auditoria)

UPDATE public.permissoes_usuario
SET ordem = CASE menu_key
  WHEN 'painel' THEN 1
  WHEN 'cargos' THEN 2
  WHEN 'funcoes' THEN 3
  WHEN 'etapas' THEN 4
  WHEN 'anos_series' THEN 5
  WHEN 'unidades_escolares' THEN 6
  WHEN 'turmas' THEN 7
  WHEN 'profissionais' THEN 8
  WHEN 'porte_escola' THEN 9
  WHEN 'configuracao_rh' THEN 10
  WHEN 'vagas' THEN 11
  WHEN 'usuarios' THEN 12
  WHEN 'contas_email' THEN 13
  WHEN 'auditoria' THEN 14
  ELSE ordem
END,
updated_at = NOW()
WHERE menu_key IN (
  'painel', 'cargos', 'funcoes', 'etapas', 'anos_series',
  'unidades_escolares', 'turmas', 'profissionais', 'porte_escola',
  'configuracao_rh', 'vagas', 'usuarios', 'contas_email', 'auditoria'
);

-- Registrar auditoria da reorganização de menu
INSERT INTO public.auditoria (
  entidade,
  acao,
  descricao,
  detalhes,
  created_at
) VALUES (
  'Administração',
  'Edição',
  'Reorganização da estrutura do Menu Principal do sistema: migração dos módulos de Vagas para Cadastros Mestres, Auditoria para Administração do Sistema, e reposicionamento de Cadastros de Apoio antes de Cadastros Mestres.',
  jsonb_build_object(
    'tipo', 'reorganizacao_menu_principal',
    'ordem_grupos', jsonb_build_array('Painel de Início', 'Cadastros de Apoio', 'Cadastros Mestres', 'Administração do Sistema'),
    'modulos_movidos', jsonb_build_object(
      'configuracao_rh', 'Cadastros Mestres',
      'vagas', 'Cadastros Mestres',
      'auditoria', 'Administração do Sistema'
    )
  ),
  NOW()
);
