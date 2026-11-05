-- Novo atributo "Classificação no Concurso" no Cadastro de Profissionais
-- Campo de texto livre. Regra de obrigatoriedade é aplicada na aplicação:
-- "Antigos na Rede" -> opcional; "Novos na Rede" -> obrigatório.
-- Registros existentes ficam sem valor (aceitável, pois são "Antigos na Rede").
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS classificacao_concurso TEXT;
