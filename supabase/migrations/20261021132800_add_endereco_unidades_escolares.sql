-- Adicionar colunas de endereço e localização geográfica à tabela unidades_escolares
ALTER TABLE public.unidades_escolares
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS estado_uf TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Criar índice para buscas por CEP e Cidade
CREATE INDEX IF NOT EXISTS idx_unidades_escolares_cep ON public.unidades_escolares(cep);
CREATE INDEX IF NOT EXISTS idx_unidades_escolares_cidade ON public.unidades_escolares(cidade);
