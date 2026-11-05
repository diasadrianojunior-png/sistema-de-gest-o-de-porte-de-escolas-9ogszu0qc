-- Central de Ajuda: novo item do Menu Principal (último item)
-- Regra permanente: todo novo menu entra na matriz de permissões
-- (permissoes_perfil para Administrador e Operador) e é liberado
-- para os operadores já existentes (permissoes_usuario).

INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT p.perfil, 'central_ajuda', 'Central de Ajuda', true, false, false, 16
FROM (VALUES ('Administrador'), ('Operador')) AS p(perfil)
WHERE EXISTS (SELECT 1 FROM public.permissoes_perfil f WHERE f.perfil = p.perfil)
ON CONFLICT (perfil, menu_key) DO NOTHING;

-- Libera a Central de Ajuda (somente visualização) para os operadores já existentes
INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
SELECT u.id, 'central_ajuda', 'Central de Ajuda', true, false, false, 16
FROM public.usuarios_sistema u
ON CONFLICT (usuario_id, menu_key) DO NOTHING;
