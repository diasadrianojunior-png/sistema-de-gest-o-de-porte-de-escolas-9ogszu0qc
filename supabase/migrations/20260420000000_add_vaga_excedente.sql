-- Adiciona coluna vaga_excedente na tabela vaga
ALTER TABLE public.vaga
ADD COLUMN IF NOT EXISTS vaga_excedente boolean NOT NULL DEFAULT false;

-- Backfill: vagas existentes foram criadas pela geração automática, então recebem false (Não)
UPDATE public.vaga
SET vaga_excedente = false
WHERE vaga_excedente IS NULL;

COMMENT ON COLUMN public.vaga.vaga_excedente IS 'Indica se a vaga é excedente pela origem: false (Não) para geração automática, true (Sim) para inserção manual.';
