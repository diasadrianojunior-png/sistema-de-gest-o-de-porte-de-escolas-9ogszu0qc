-- Migração: Criação da tabela de auditoria com identificador automático AUD-0001 e RLS
-- Data: 2026-10-21

CREATE SEQUENCE IF NOT EXISTS seq_auditoria_codigo START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  registro_codigo TEXT,
  entidade TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  usuario_id UUID,
  usuario_nome TEXT NOT NULL DEFAULT 'Sistema',
  usuario_email TEXT NOT NULL DEFAULT 'sistema@local',
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Função e Trigger para gerar código AUD-0001
CREATE OR REPLACE FUNCTION public.fn_generate_auditoria_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'AUD-' || LPAD(nextval('seq_auditoria_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_auditoria_codigo ON public.auditoria;
CREATE TRIGGER trg_generate_auditoria_codigo
  BEFORE INSERT ON public.auditoria
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_auditoria_codigo();

-- Índices para buscas e filtros rápidos
CREATE INDEX IF NOT EXISTS idx_auditoria_codigo ON public.auditoria(codigo);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON public.auditoria(entidade);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON public.auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_email ON public.auditoria(usuario_email);

-- Configuração de RLS
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem visualizar todos os registros de auditoria
DROP POLICY IF EXISTS "authenticated_select_auditoria" ON public.auditoria;
CREATE POLICY "authenticated_select_auditoria" ON public.auditoria
  FOR SELECT TO authenticated USING (true);

-- Usuários autenticados podem inserir novos registros de auditoria (via serviços da aplicação)
DROP POLICY IF EXISTS "authenticated_insert_auditoria" ON public.auditoria;
CREATE POLICY "authenticated_insert_auditoria" ON public.auditoria
  FOR INSERT TO authenticated WITH CHECK (true);

-- Sem políticas de UPDATE ou DELETE para clientes: a auditoria é estritamente imutável na interface
