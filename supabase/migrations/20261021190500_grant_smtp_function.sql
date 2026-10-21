-- Ajuste na permissão da função obter_conta_smtp_ativa para permitir execução no contexto seguro do banco
GRANT EXECUTE ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO authenticated;
