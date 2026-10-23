-- Migration: Configuracao de Recursos Humanos por Tipo de Atendimento e Nivel
-- Data: 2026-10-23
-- Idempotente, estende tabelas existentes sem quebrar dados/menus de CRH e CARE legados

-- 1. Extensões nas tabelas existentes de Cargos e Funções
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS carga_horaria text DEFAULT '20h';
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS natureza text DEFAULT 'EFETIVO'; -- EFETIVO | TERCEIRIZADO
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS docente boolean DEFAULT false;
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

ALTER TABLE public.funcoes ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.funcoes ADD COLUMN IF NOT EXISTS exige_autorizacao_semed boolean DEFAULT false;
ALTER TABLE public.funcoes ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- 2. Versão de Configuração
CREATE TABLE IF NOT EXISTS public.rh_versoes_configuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  ano_letivo integer NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'VIGENTE', 'ARQUIVADA')),
  criado_por text DEFAULT 'Sistema',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gerador de código para rh_versoes_configuracao (VER-0001)
CREATE OR REPLACE FUNCTION public.fn_generate_rh_versao_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
  v_prefix text := 'VER-';
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_versoes_configuracao
    WHERE codigo ~ '^VER-[0-9]+$';

    NEW.codigo := v_prefix || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_versao_codigo ON public.rh_versoes_configuracao;
CREATE TRIGGER trg_rh_versao_codigo
BEFORE INSERT ON public.rh_versoes_configuracao
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_versao_codigo();

-- Garantir que haja apenas 1 versão VIGENTE por ano_letivo
CREATE UNIQUE INDEX IF NOT EXISTS uq_rh_versao_ano_vigente
ON public.rh_versoes_configuracao (ano_letivo)
WHERE status = 'VIGENTE';

-- 3. Tipos de Atendimento versionados
CREATE TABLE IF NOT EXISTS public.rh_tipos_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  versao_id uuid NOT NULL REFERENCES public.rh_versoes_configuracao(id) ON DELETE CASCADE,
  nome text NOT NULL,
  criterio_porte text NOT NULL DEFAULT 'ALUNOS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_tipo_atend_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_tipos_atendimento
    WHERE codigo ~ '^TAT-[0-9]+$';

    NEW.codigo := 'TAT-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_tipo_atend_codigo ON public.rh_tipos_atendimento;
CREATE TRIGGER trg_rh_tipo_atend_codigo
BEFORE INSERT ON public.rh_tipos_atendimento
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_tipo_atend_codigo();

-- 4. Modalidades Excluídas do Porte
CREATE TABLE IF NOT EXISTS public.rh_modalidades_excluidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_atendimento_id uuid NOT NULL REFERENCES public.rh_tipos_atendimento(id) ON DELETE CASCADE,
  modalidade text NOT NULL CHECK (modalidade IN ('JORNADA_AMPLIADA', 'EJA', 'SALA_RECURSOS_MULTIFUNCIONAIS')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rh_tipo_modalidade_excluida UNIQUE (tipo_atendimento_id, modalidade)
);

-- 5. Níveis de Porte por Tipo de Atendimento
CREATE TABLE IF NOT EXISTS public.rh_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  versao_id uuid NOT NULL REFERENCES public.rh_versoes_configuracao(id) ON DELETE CASCADE,
  tipo_atendimento_id uuid NOT NULL REFERENCES public.rh_tipos_atendimento(id) ON DELETE CASCADE,
  codigo_nivel text NOT NULL, -- ex: "I", "II", "A", "B"
  ordem integer NOT NULL DEFAULT 1,
  min_alunos integer NOT NULL DEFAULT 0,
  max_alunos integer, -- NULL = sem teto
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_nivel_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_niveis
    WHERE codigo ~ '^NIV-[0-9]+$';

    NEW.codigo := 'NIV-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_nivel_codigo ON public.rh_niveis;
CREATE TRIGGER trg_rh_nivel_codigo
BEFORE INSERT ON public.rh_niveis
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_nivel_codigo();

-- 6. Matriz Cargo × Função (versionada com condição)
CREATE TABLE IF NOT EXISTS public.rh_cargo_funcao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id uuid NOT NULL REFERENCES public.rh_versoes_configuracao(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  condicao text NOT NULL DEFAULT 'NENHUMA' CHECK (condicao IN ('NENHUMA', 'READAPTADO_COMPATIVEL_LAUDO', 'AUTORIZACAO_SEMED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rh_cargo_funcao_versao UNIQUE (versao_id, cargo_id, funcao_id)
);

-- 7. Regras de Dimensionamento por Nível
CREATE TABLE IF NOT EXISTS public.rh_regras_nivel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  nivel_id uuid NOT NULL REFERENCES public.rh_niveis(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  base_calculo text NOT NULL CHECK (base_calculo IN ('FIXO_ESCOLA', 'POR_TURNO', 'POR_TURMA', 'POR_TURMA_ETAPA')),
  modalidade text NOT NULL DEFAULT 'FIXO' CHECK (modalidade IN ('FIXO', 'ITINERANTE')),
  dias_semana integer, -- para itinerante (ex: 2 para 2x/semana)
  etapas_filtro jsonb DEFAULT '[]'::jsonb, -- lista de strings de etapas ex: ["INFANTIL", "INFANTIL_I"]
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rh_regra_nivel_funcao UNIQUE (nivel_id, funcao_id)
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_regra_nivel_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_regras_nivel
    WHERE codigo ~ '^RGN-[0-9]+$';

    NEW.codigo := 'RGN-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_regra_nivel_codigo ON public.rh_regras_nivel;
CREATE TRIGGER trg_rh_regra_nivel_codigo
BEFORE INSERT ON public.rh_regras_nivel
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_regra_nivel_codigo();

-- 8. Regras por Número de Turmas (Arte, Ed. Física, R2)
CREATE TABLE IF NOT EXISTS public.rh_regras_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  versao_id uuid NOT NULL REFERENCES public.rh_versoes_configuracao(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  tipo_atendimento_id uuid REFERENCES public.rh_tipos_atendimento(id) ON DELETE CASCADE, -- NULL = todos os tipos
  min_turmas integer NOT NULL DEFAULT 1,
  max_turmas integer, -- NULL = sem teto
  qtd_fixo integer NOT NULL DEFAULT 0,
  qtd_itinerante integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_regra_turma_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_regras_turmas
    WHERE codigo ~ '^RGT-[0-9]+$';

    NEW.codigo := 'RGT-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_regra_turma_codigo ON public.rh_regras_turmas;
CREATE TRIGGER trg_rh_regra_turma_codigo
BEFORE INSERT ON public.rh_regras_turmas
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_regra_turma_codigo();

-- 9. Cenário de Cálculo por Escola e Ano Letivo (EscolaAnoLetivo)
CREATE TABLE IF NOT EXISTS public.rh_escolas_ano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  escola_id uuid NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE CASCADE,
  ano_letivo integer NOT NULL,
  tipo_atendimento_id uuid REFERENCES public.rh_tipos_atendimento(id) ON DELETE SET NULL,
  alunos_total integer NOT NULL DEFAULT 0,
  alunos_por_modalidade jsonb NOT NULL DEFAULT '{"jornada_ampliada": 0, "eja": 0, "srm": 0}'::jsonb,
  turnos jsonb NOT NULL DEFAULT '["MATUTINO", "VESPERTINO"]'::jsonb,
  metragem_m2 numeric(10,2) DEFAULT 0,
  nivel_calculado_id uuid REFERENCES public.rh_niveis(id) ON DELETE SET NULL,
  nivel_override_id uuid REFERENCES public.rh_niveis(id) ON DELETE SET NULL,
  justificativa_override text,
  versao_id uuid REFERENCES public.rh_versoes_configuracao(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rh_escola_ano UNIQUE (escola_id, ano_letivo)
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_escola_ano_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_escolas_ano
    WHERE codigo ~ '^EAN-[0-9]+$';

    NEW.codigo := 'EAN-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_escola_ano_codigo ON public.rh_escolas_ano;
CREATE TRIGGER trg_rh_escola_ano_codigo
BEFORE INSERT ON public.rh_escolas_ano
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_escola_ano_codigo();

-- 10. Exceção de Vaga autorizada pela SEMED
CREATE TABLE IF NOT EXISTS public.rh_excecoes_vaga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  escola_ano_id uuid NOT NULL REFERENCES public.rh_escolas_ano(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  delta integer NOT NULL, -- +1, -1, +2 etc
  justificativa text NOT NULL,
  autorizado_por text NOT NULL DEFAULT 'SEMED',
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_excecao_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_excecoes_vaga
    WHERE codigo ~ '^EXC-[0-9]+$';

    NEW.codigo := 'EXC-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_excecao_codigo ON public.rh_excecoes_vaga;
CREATE TRIGGER trg_rh_excecao_codigo
BEFORE INSERT ON public.rh_excecoes_vaga
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_excecao_codigo();

-- 11. Servidor e Lotação (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.rh_servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  nome text NOT NULL,
  cpf text,
  matricula text,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL,
  readaptado boolean DEFAULT false,
  laudo_compatibilidade text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_servidor_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_servidores
    WHERE codigo ~ '^SRV-[0-9]+$';

    NEW.codigo := 'SRV-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_servidor_codigo ON public.rh_servidores;
CREATE TRIGGER trg_rh_servidor_codigo
BEFORE INSERT ON public.rh_servidores
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_servidor_codigo();

CREATE TABLE IF NOT EXISTS public.rh_lotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  servidor_id uuid NOT NULL REFERENCES public.rh_servidores(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES public.unidades_escolares(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  turno text, -- MATUTINO, VESPERTINO, NOTURNO, INTEGRAL
  readaptado boolean DEFAULT false,
  vigencia text DEFAULT '2026',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_lotacao_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_lotacoes
    WHERE codigo ~ '^LOT-[0-9]+$';

    NEW.codigo := 'LOT-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_lotacao_codigo ON public.rh_lotacoes;
CREATE TRIGGER trg_rh_lotacao_codigo
BEFORE INSERT ON public.rh_lotacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_lotacao_codigo();

-- 12. Vagas Geradas (rh_vagas)
CREATE TABLE IF NOT EXISTS public.rh_vagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  escola_ano_id uuid NOT NULL REFERENCES public.rh_escolas_ano(id) ON DELETE CASCADE,
  versao_id uuid REFERENCES public.rh_versoes_configuracao(id) ON DELETE SET NULL,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  turno text,
  modalidade text NOT NULL DEFAULT 'FIXO' CHECK (modalidade IN ('FIXO', 'ITINERANTE')),
  dias_semana integer,
  origem text NOT NULL CHECK (origem IN ('REGRA_NIVEL', 'REGRA_TURMAS', 'EXCECAO_MANUAL')),
  regra_origem_id uuid,
  status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'OCUPADA', 'BLOQUEADA', 'EXCEDENTE')),
  servidor_id uuid REFERENCES public.rh_servidores(id) ON DELETE SET NULL,
  sequencial integer NOT NULL DEFAULT 1,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_rh_vaga_codigo()
RETURNS trigger AS $$
DECLARE
  v_next_val integer;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::integer), 0) + 1
    INTO v_next_val
    FROM public.rh_vagas
    WHERE codigo ~ '^VAG-[0-9]+$';

    NEW.codigo := 'VAG-' || LPAD(v_next_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rh_vaga_codigo ON public.rh_vagas;
CREATE TRIGGER trg_rh_vaga_codigo
BEFORE INSERT ON public.rh_vagas
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_rh_vaga_codigo();

-- 13. Habilitar RLS em todas as novas tabelas com políticas para authenticated
ALTER TABLE public.rh_versoes_configuracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_tipos_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_modalidades_excluidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_cargo_funcao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_regras_nivel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_regras_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_escolas_ano ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_excecoes_vaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_lotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'rh_versoes_configuracao',
    'rh_tipos_atendimento',
    'rh_modalidades_excluidas',
    'rh_niveis',
    'rh_cargo_funcao',
    'rh_regras_nivel',
    'rh_regras_turmas',
    'rh_escolas_ano',
    'rh_excecoes_vaga',
    'rh_servidores',
    'rh_lotacoes',
    'rh_vagas'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_sel_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_sel_%I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "auth_ins_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_ins_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "auth_upd_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_upd_%I" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "auth_del_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_del_%I" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;
