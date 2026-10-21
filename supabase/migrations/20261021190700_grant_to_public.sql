-- Conceder permissão de execução explicitamente para supabase_read_only_user e public
GRANT EXECUTE ON FUNCTION public.obter_conta_smtp_ativa(TEXT) TO PUBLIC;
