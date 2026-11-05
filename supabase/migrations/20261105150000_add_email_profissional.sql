-- Novo atributo "E-mail do Profissional" no Cadastro de Profissionais
-- Campo de texto livre e OPCIONAL: não é exigido na validação da aplicação.
-- Quando preenchido, o formato de e-mail é validado na aplicação (página e serviço).
-- Registros existentes ficam sem valor (NULL), o que é aceitável por se tratar de campo opcional.
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS email_profissional TEXT;
