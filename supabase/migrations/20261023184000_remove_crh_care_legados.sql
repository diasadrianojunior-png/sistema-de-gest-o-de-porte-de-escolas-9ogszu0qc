-- Migração: Remoção definitiva dos cadastros legados CRH (Configurações de RH por Unidade)
-- e CARE (Cargos e Funções / Vagas automáticas da v0.0.40–v0.0.43).
-- O novo módulo "Configuração de Vagas por Nível" (configuracao_rh, configuracao_rh_nivel,
-- configuracao_rh_linha, configuracao_rh_linha_cargo, configuracao_rh_vaga) PERMANECE 100% INTACTO.

-- 1. Dropar triggers associados
DROP TRIGGER IF EXISTS trg_validate_care_vaga_vinculos ON public.care_vagas;
DROP TRIGGER IF EXISTS trg_generate_care_vaga_codigo ON public.care_vagas;
DROP TRIGGER IF EXISTS trg_validate_crh_vinculos ON public.crh_configuracoes;
DROP TRIGGER IF EXISTS trg_generate_crh_codigo ON public.crh_configuracoes;
DROP TRIGGER IF EXISTS trg_generate_nivel_porte_codigo ON public.niveis_porte;

-- 2. Dropar tabelas exclusivas desses dois cadastros legados (respeitando dependências FK)
DROP TABLE IF EXISTS public.care_vagas CASCADE;
DROP TABLE IF EXISTS public.crh_configuracoes CASCADE;
DROP TABLE IF EXISTS public.niveis_porte CASCADE;

-- 3. Dropar funções de código e validação dedicadas
DROP FUNCTION IF EXISTS public.fn_generate_care_vaga_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_care_vaga_vinculos() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_crh_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_crh_vinculos() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_nivel_porte_codigo() CASCADE;

-- 4. Dropar sequências exclusivas
DROP SEQUENCE IF EXISTS public.seq_care_vagas_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_crh_configuracoes_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_niveis_porte_codigo CASCADE;

-- 5. Remover permissões dos perfis e usuários para os menus 'crh' e 'care'
DELETE FROM public.permissoes_perfil WHERE menu_key IN ('crh', 'care');
DELETE FROM public.permissoes_usuario WHERE menu_key IN ('crh', 'care');

-- 6. Reorganizar ordem das permissões restantes nos perfis para manter sequência limpa
UPDATE public.permissoes_perfil SET ordem = 1 WHERE menu_key = 'painel';
UPDATE public.permissoes_perfil SET ordem = 2 WHERE menu_key = 'unidades_escolares';
UPDATE public.permissoes_perfil SET ordem = 3 WHERE menu_key = 'turmas';
UPDATE public.permissoes_perfil SET ordem = 4 WHERE menu_key = 'cargos';
UPDATE public.permissoes_perfil SET ordem = 5 WHERE menu_key = 'funcoes';
UPDATE public.permissoes_perfil SET ordem = 6 WHERE menu_key = 'etapas';
UPDATE public.permissoes_perfil SET ordem = 7 WHERE menu_key = 'anos_series';
UPDATE public.permissoes_perfil SET ordem = 8 WHERE menu_key = 'configuracao_rh';
UPDATE public.permissoes_perfil SET ordem = 9 WHERE menu_key = 'usuarios';
UPDATE public.permissoes_perfil SET ordem = 10 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_perfil SET ordem = 11 WHERE menu_key = 'auditoria';

-- Reorganizar também nas permissões personalizadas de usuários existentes
UPDATE public.permissoes_usuario SET ordem = 1 WHERE menu_key = 'painel';
UPDATE public.permissoes_usuario SET ordem = 2 WHERE menu_key = 'unidades_escolares';
UPDATE public.permissoes_usuario SET ordem = 3 WHERE menu_key = 'turmas';
UPDATE public.permissoes_usuario SET ordem = 4 WHERE menu_key = 'cargos';
UPDATE public.permissoes_usuario SET ordem = 5 WHERE menu_key = 'funcoes';
UPDATE public.permissoes_usuario SET ordem = 6 WHERE menu_key = 'etapas';
UPDATE public.permissoes_usuario SET ordem = 7 WHERE menu_key = 'anos_series';
UPDATE public.permissoes_usuario SET ordem = 8 WHERE menu_key = 'configuracao_rh';
UPDATE public.permissoes_usuario SET ordem = 9 WHERE menu_key = 'usuarios';
UPDATE public.permissoes_usuario SET ordem = 10 WHERE menu_key = 'contas_email';
UPDATE public.permissoes_usuario SET ordem = 11 WHERE menu_key = 'auditoria';
