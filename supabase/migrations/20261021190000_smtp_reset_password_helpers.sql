-- Migração para função segura de obtenção de conta SMTP ativa e envio de redefinição de senha
-- Data: 2026-10-21
-- Apenas acessível internamente ou via service role / edge function com chave de criptografia segura

CREATE OR REPLACE FUNCTION public.obter_conta_smtp_ativa(
  p_encryption_key TEXT DEFAULT 'sk_porte_smtp_secret_2026_aes256_key'
)
RETURNS TABLE (
  id UUID,
  codigo TEXT,
  descricao TEXT,
  host TEXT,
  porta INTEGER,
  criptografia TEXT,
  usuario_smtp TEXT,
  senha_smtp TEXT,
  email_from TEXT,
  nome_from TEXT,
  reply_to TEXT,
  limite_diario INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.codigo,
    c.descricao,
    c.host,
    c.porta,
    c.criptografia,
    c.usuario_smtp,
    CASE 
      WHEN c.senha_smtp_encrypted IS NOT NULL THEN
        extensions.pgp_sym_decrypt(c.senha_smtp_encrypted, p_encryption_key)
      ELSE ''
    END AS senha_smtp,
    c.email_from,
    c.nome_from,
    c.reply_to,
    c.limite_diario
  FROM public.contas_email c
  WHERE c.ativa = true
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões controladas (SECURITY DEFINER para leitura controlada por service_role e postgres)
REVOKE ALL ON FUNCTION public.obter_conta_smtp_ativa(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_conta_smtp_ativa(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.obter_conta_smtp_ativa(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO postgres;
