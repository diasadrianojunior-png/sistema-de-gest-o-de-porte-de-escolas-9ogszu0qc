-- Migração para Contas de E-mail (SMTP)
-- Data: 2026-10-21
-- Identificador sequencial no padrão MAIL-0001
-- Criptografia de senha com pgcrypto (AES-256 via pgp_sym_encrypt / pgp_sym_decrypt)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sequência para identificador automático MAIL-XXXX
CREATE SEQUENCE IF NOT EXISTS seq_contas_email_codigo START WITH 1 INCREMENT BY 1;

-- Tabela contas_email
CREATE TABLE IF NOT EXISTS public.contas_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  descricao TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  host TEXT NOT NULL,
  porta INTEGER NOT NULL DEFAULT 587,
  criptografia TEXT NOT NULL DEFAULT 'TLS', -- 'TLS', 'SSL', 'NENHUMA'
  usuario_smtp TEXT NOT NULL,
  senha_smtp_encrypted BYTEA, -- Armazenamento criptografado seguro AES-256
  email_from TEXT NOT NULL,
  nome_from TEXT NOT NULL,
  reply_to TEXT,
  limite_diario INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para gerar código MAIL-0001 automaticamente
CREATE OR REPLACE FUNCTION public.fn_generate_conta_email_codigo()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MAIL-' || LPAD(nextval('public.seq_contas_email_codigo')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_conta_email_codigo ON public.contas_email;
CREATE TRIGGER tr_generate_conta_email_codigo
  BEFORE INSERT ON public.contas_email
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_conta_email_codigo();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.fn_update_contas_email_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_contas_email_timestamp ON public.contas_email;
CREATE TRIGGER tr_update_contas_email_timestamp
  BEFORE UPDATE ON public.contas_email
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_contas_email_timestamp();

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_contas_email_codigo ON public.contas_email(codigo);
CREATE INDEX IF NOT EXISTS idx_contas_email_descricao ON public.contas_email(descricao);
CREATE INDEX IF NOT EXISTS idx_contas_email_ativa ON public.contas_email(ativa);
CREATE INDEX IF NOT EXISTS idx_contas_email_created_at ON public.contas_email(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.contas_email ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuários autenticados
DROP POLICY IF EXISTS "authenticated_select_contas_email" ON public.contas_email;
CREATE POLICY "authenticated_select_contas_email" ON public.contas_email
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_contas_email" ON public.contas_email;
CREATE POLICY "authenticated_insert_contas_email" ON public.contas_email
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_contas_email" ON public.contas_email;
CREATE POLICY "authenticated_update_contas_email" ON public.contas_email
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_contas_email" ON public.contas_email;
CREATE POLICY "authenticated_delete_contas_email" ON public.contas_email
  FOR DELETE TO authenticated USING (true);

-- View ou funções seguras para manipulação de senha criptografada sem vazar senha em texto puro
-- Função para salvar conta criptografando a senha se fornecida
CREATE OR REPLACE FUNCTION public.salvar_conta_email(
  p_id UUID,
  p_descricao TEXT,
  p_ativa BOOLEAN,
  p_host TEXT,
  p_porta INTEGER,
  p_criptografia TEXT,
  p_usuario_smtp TEXT,
  p_senha_smtp TEXT,
  p_email_from TEXT,
  p_nome_from TEXT,
  p_reply_to TEXT,
  p_limite_diario INTEGER,
  p_encryption_key TEXT DEFAULT 'sk_porte_smtp_secret_2026_aes256_key'
)
RETURNS public.contas_email AS $$
DECLARE
  v_record public.contas_email;
  v_encrypted_pass BYTEA;
BEGIN
  IF p_id IS NULL THEN
    -- Inserção de nova conta
    IF p_senha_smtp IS NOT NULL AND p_senha_smtp <> '' THEN
      v_encrypted_pass := pgp_sym_encrypt(p_senha_smtp, p_encryption_key, 'compress-algo=1, cipher-algo=aes256');
    ELSE
      v_encrypted_pass := NULL;
    END IF;

    INSERT INTO public.contas_email (
      descricao,
      ativa,
      host,
      porta,
      criptografia,
      usuario_smtp,
      senha_smtp_encrypted,
      email_from,
      nome_from,
      reply_to,
      limite_diario
    ) VALUES (
      p_descricao,
      COALESCE(p_ativa, true),
      p_host,
      COALESCE(p_porta, 587),
      COALESCE(p_criptografia, 'TLS'),
      p_usuario_smtp,
      v_encrypted_pass,
      p_email_from,
      p_nome_from,
      p_reply_to,
      p_limite_diario
    )
    RETURNING * INTO v_record;
  ELSE
    -- Atualização de conta existente
    IF p_senha_smtp IS NOT NULL AND p_senha_smtp <> '' THEN
      v_encrypted_pass := pgp_sym_encrypt(p_senha_smtp, p_encryption_key, 'compress-algo=1, cipher-algo=aes256');
      
      UPDATE public.contas_email
      SET
        descricao = p_descricao,
        ativa = COALESCE(p_ativa, true),
        host = p_host,
        porta = COALESCE(p_porta, 587),
        criptografia = COALESCE(p_criptografia, 'TLS'),
        usuario_smtp = p_usuario_smtp,
        senha_smtp_encrypted = v_encrypted_pass,
        email_from = p_email_from,
        nome_from = p_nome_from,
        reply_to = p_reply_to,
        limite_diario = p_limite_diario,
        updated_at = NOW()
      WHERE id = p_id
      RETURNING * INTO v_record;
    ELSE
      -- Manter a senha atual sem sobrescrever
      UPDATE public.contas_email
      SET
        descricao = p_descricao,
        ativa = COALESCE(p_ativa, true),
        host = p_host,
        porta = COALESCE(p_porta, 587),
        criptografia = COALESCE(p_criptografia, 'TLS'),
        usuario_smtp = p_usuario_smtp,
        email_from = p_email_from,
        nome_from = p_nome_from,
        reply_to = p_reply_to,
        limite_diario = p_limite_diario,
        updated_at = NOW()
      WHERE id = p_id
      RETURNING * INTO v_record;
    END IF;
  END IF;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Semente inicial condicional para refletir as imagens de referência fornecidas pelo usuário se a tabela estiver vazia
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contas_email LIMIT 1) THEN
    PERFORM public.salvar_conta_email(
      NULL,
      'Secretaria Municipal de Educação - SMTP',
      false,
      'smtp.florianopolis.sc.gov.br',
      587,
      'TLS',
      'educacao@florianopolis.sc.gov.br',
      'ExemploSenha123!',
      'educacao@florianopolis.sc.gov.br',
      'Secretaria de Educação PMF',
      'contato.educacao@florianopolis.sc.gov.br',
      1000
    );

    PERFORM public.salvar_conta_email(
      NULL,
      'Conta de Notificações da AJRD',
      true,
      'smtp.gmail.com',
      587,
      'TLS',
      'telemedicina.ajrd@gmail.com',
      'ExemploAppPass123!',
      'telemedicina.ajrd@gmail.com',
      'Não Responda / E-mail de Notificação',
      NULL,
      2000
    );
  END IF;
END $$;
