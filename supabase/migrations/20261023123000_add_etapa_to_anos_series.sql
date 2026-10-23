-- Migration: Vincular Etapa ao cadastro de Ano/Série e reforçar consistência em Turmas
-- 1. Adicionar coluna etapa_id em public.anos_series (nullable para compatibilidade com legados)
ALTER TABLE public.anos_series
  ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES public.etapas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_anos_series_etapa_id ON public.anos_series(etapa_id);

-- 2. Trigger de validação de consistência em public.anos_series
-- Impede salvar Ano/Série com etapa incompatível com o ano letivo informado
CREATE OR REPLACE FUNCTION public.fn_validate_ano_serie_vinculos()
RETURNS trigger AS $$
DECLARE
  v_ano_etapa INTEGER;
BEGIN
  IF NEW.etapa_id IS NOT NULL THEN
    SELECT ano_letivo INTO v_ano_etapa FROM public.etapas WHERE id = NEW.etapa_id;
    IF v_ano_etapa IS NULL THEN
      RAISE EXCEPTION 'Etapa vinculada não encontrada no cadastro de etapas.';
    END IF;
    IF v_ano_etapa <> NEW.ano_letivo THEN
      RAISE EXCEPTION 'Vínculo inconsistente: a etapa selecionada pertence ao ano letivo %, que difere do ano letivo % do ano/série.', v_ano_etapa, NEW.ano_letivo;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ano_serie_vinculos ON public.anos_series;
CREATE TRIGGER trg_validate_ano_serie_vinculos
  BEFORE INSERT OR UPDATE ON public.anos_series
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_ano_serie_vinculos();

-- 3. Atualizar trigger de validação de turmas para validar que o ano/série pertence à etapa e ao ano letivo da turma
CREATE OR REPLACE FUNCTION public.fn_validate_turma_vinculos()
RETURNS trigger AS $$
DECLARE
  v_ano_etapa INTEGER;
  v_ano_serie INTEGER;
  v_serie_etapa_id UUID;
BEGIN
  IF NEW.etapa_id IS NOT NULL THEN
    SELECT ano_letivo INTO v_ano_etapa FROM public.etapas WHERE id = NEW.etapa_id;
    IF v_ano_etapa IS NULL THEN
      RAISE EXCEPTION 'Etapa vinculada não encontrada no cadastro de etapas.';
    END IF;
    IF v_ano_etapa <> NEW.ano_letivo THEN
      RAISE EXCEPTION 'Vínculo inconsistente: a etapa selecionada pertence ao ano letivo %, que difere do ano letivo % da turma.', v_ano_etapa, NEW.ano_letivo;
    END IF;
  END IF;

  IF NEW.ano_serie_id IS NOT NULL THEN
    SELECT ano_letivo, etapa_id INTO v_ano_serie, v_serie_etapa_id
    FROM public.anos_series
    WHERE id = NEW.ano_serie_id;

    IF v_ano_serie IS NULL THEN
      RAISE EXCEPTION 'Ano/Série vinculado não encontrado no cadastro de anos/séries.';
    END IF;
    IF v_ano_serie <> NEW.ano_letivo THEN
      RAISE EXCEPTION 'Vínculo inconsistente: o ano/série selecionado pertence ao ano letivo %, que difere do ano letivo % da turma.', v_ano_serie, NEW.ano_letivo;
    END IF;

    -- Se a turma tem etapa_id definida e o ano/série tem etapa_id vinculada, devem coincidir
    IF NEW.etapa_id IS NOT NULL AND v_serie_etapa_id IS NOT NULL THEN
      IF v_serie_etapa_id <> NEW.etapa_id THEN
        RAISE EXCEPTION 'Vínculo inconsistente: o ano/série selecionado pertence a uma etapa diferente da etapa da turma.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_turma_vinculos ON public.turmas;
CREATE TRIGGER trg_validate_turma_vinculos
  BEFORE INSERT OR UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_turma_vinculos();
