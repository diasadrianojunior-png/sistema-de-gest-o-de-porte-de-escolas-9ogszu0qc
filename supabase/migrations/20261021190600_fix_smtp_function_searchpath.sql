-- Resetar e permitir explicitamente com SECURITY DEFINER e busca de schema
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

GRANT ALL ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO postgres, anon, authenticated, service_role;
