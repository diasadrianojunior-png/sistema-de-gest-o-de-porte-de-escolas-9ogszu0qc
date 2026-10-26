-- Migration: Zerar todas as vagas criadas no sistema e limpar data_ultima_geracao em unidade_escolar_ano
-- Objetivo: permitir que o usuário recomece a geração de vagas do zero, mantendo a estrutura, os cadastros das escolas e os dados de alunos/turmas intactos.

-- 1. Excluir todos os registros da tabela vaga
DELETE FROM public.vaga;

-- 2. Zerar a data_ultima_geracao em unidade_escolar_ano para que novas gerações recomecem limpas
UPDATE public.unidade_escolar_ano
SET data_ultima_geracao = NULL
WHERE data_ultima_geracao IS NOT NULL;
