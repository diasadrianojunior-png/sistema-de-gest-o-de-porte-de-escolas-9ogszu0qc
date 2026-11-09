-- Módulo "Gera Lista de Vagas Abertas" (último item do grupo Cadastros Mestres)
-- Regra permanente: todo novo menu entra na matriz de permissões
-- (permissoes_perfil para Administrador e Operador) e é liberado
-- para os operadores já existentes (permissoes_usuario).

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES
  ('Administrador', 'gera_lista_vagas_abertas', 'Gera Lista de Vagas Abertas', true, true, true, 11),
  ('Operador', 'gera_lista_vagas_abertas', 'Gera Lista de Vagas Abertas', true, true, true, 11)
ON CONFLICT (perfil, menu_key) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  suporta_edicao = EXCLUDED.suporta_edicao,
  ordem = EXCLUDED.ordem;

-- Liberar também para todos os operadores/usuários já existentes na tabela permissoes_usuario
INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT
  u.id AS usuario_id,
  'gera_lista_vagas_abertas' AS menu_key,
  'Gera Lista de Vagas Abertas' AS menu_label,
  true AS pode_ver,
  true AS pode_editar,
  true AS suporta_edicao,
  11 AS ordem
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO NOTHING;
