-- Migração: Garantir sincronização do menu 'etapas' para todos os operadores
-- Data: 2026-10-22
-- Versão do Sistema: 0.0.29

-- 1. Assegurar que 'etapas' está presente em permissoes_perfil para Operador
INSERT INTO public.permissoes_perfil (perfil, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
VALUES ('Operador', 'etapas', 'Etapas', true, true, true, 5)
ON CONFLICT (perfil, menu_key) DO UPDATE
SET menu_label = 'Etapas',
    pode_ver = true,
    suporta_edicao = true,
    ordem = 5;

-- Atualizar ordens na permissoes_perfil caso estejam desalinhadas
UPDATE public.permissoes_perfil SET ordem = 8 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_perfil SET ordem = 7 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 6 WHERE menu_key = 'usuarios';

-- 2. Atualizar ordens na permissoes_usuario se necessário
UPDATE public.permissoes_usuario SET ordem = 8 WHERE menu_key = 'auditoria';
UPDATE public.permissoes_usuario SET ordem = 7 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 6 WHERE menu_key = 'usuarios';

-- 3. Para TODOS os operadores já cadastrados em usuarios_sistema,
-- garantir que existe a linha correspondente a 'etapas' em permissoes_usuario
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.usuarios_sistema WHERE perfil = 'Operador' LOOP
    INSERT INTO public.permissoes_usuario (usuario_id, menu_key, menu_label, pode_ver, pode_editar, suporta_edicao, ordem)
    VALUES (u.id, 'etapas', 'Etapas', true, true, true, 5)
    ON CONFLICT (usuario_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
