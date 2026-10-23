-- ============================================================================
-- Migration: 20261023180000_remove_rh_modulo_v45.sql
-- Objetivo: REMOVER por completo o módulo "Configuração de Recursos Humanos por Tipo e Nível"
--           criado na v0.0.45, conforme confirmação explícita do usuário.
-- Tabelas a remover:
--   - rh_vagas
--   - rh_excecoes_vaga
--   - rh_lotacoes
--   - rh_servidores
--   - rh_escolas_ano
--   - rh_regras_turmas
--   - rh_regras_nivel
--   - rh_cargo_funcao
--   - rh_niveis
--   - rh_modalidades_excluidas
--   - rh_tipos_atendimento
--   - rh_versoes_configuracao
-- Triggers e funções fn_generate_rh_*
-- Entradas de permissões antigas do módulo rh_*
-- Mantém intactos: cargos, funcoes, unidades_escolares, turmas, etapas, anos_series,
--                  crh_configuracoes, care_vagas, auditoria, usuarios_sistema.
-- ============================================================================

-- 1. DROP DAS TABELAS COM CASCADE (ordem de dependência reversa)
DROP TABLE IF EXISTS public.rh_vagas CASCADE;
DROP TABLE IF EXISTS public.rh_excecoes_vaga CASCADE;
DROP TABLE IF EXISTS public.rh_lotacoes CASCADE;
DROP TABLE IF EXISTS public.rh_servidores CASCADE;
DROP TABLE IF EXISTS public.rh_escolas_ano CASCADE;
DROP TABLE IF EXISTS public.rh_regras_turmas CASCADE;
DROP TABLE IF EXISTS public.rh_regras_nivel CASCADE;
DROP TABLE IF EXISTS public.rh_cargo_funcao CASCADE;
DROP TABLE IF EXISTS public.rh_niveis CASCADE;
DROP TABLE IF EXISTS public.rh_modalidades_excluidas CASCADE;
DROP TABLE IF EXISTS public.rh_tipos_atendimento CASCADE;
DROP TABLE IF EXISTS public.rh_versoes_configuracao CASCADE;

-- 2. DROP DAS FUNÇÕES E TRIGGERS DO MÓDULO ANTIGO
DROP FUNCTION IF EXISTS public.fn_generate_rh_vaga_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_excecao_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_lotacao_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_servidor_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_escola_ano_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_regra_turma_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_regra_nivel_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_nivel_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_tipo_atend_codigo() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_rh_versao_codigo() CASCADE;

-- 3. REMOVER SEQUÊNCIAS DO MÓDULO ANTIGO (SE HOUVER)
DROP SEQUENCE IF EXISTS public.seq_rh_vagas_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_excecoes_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_lotacoes_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_servidores_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_escolas_ano_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_regras_turmas_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_regras_nivel_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_niveis_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_tipos_atendimento_codigo CASCADE;
DROP SEQUENCE IF EXISTS public.seq_rh_versoes_codigo CASCADE;

-- 4. REMOVER ENTRADAS DAS 7 TELAS ANTIGAS DA MATRIZ DE PERMISSÕES
DELETE FROM public.permissoes_perfil
WHERE menu_key IN (
  'rh_versoes',
  'rh_matriz',
  'rh_niveis_regras',
  'rh_regras_turmas',
  'rh_cenario_escola',
  'rh_painel_geral',
  'rh_vagas_itinerantes'
);

DELETE FROM public.permissoes_usuario
WHERE menu_key IN (
  'rh_versoes',
  'rh_matriz',
  'rh_niveis_regras',
  'rh_regras_turmas',
  'rh_cenario_escola',
  'rh_painel_geral',
  'rh_vagas_itinerantes'
);
