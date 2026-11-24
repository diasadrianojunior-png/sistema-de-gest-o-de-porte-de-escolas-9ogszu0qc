-- Bucket correto dos "Arquivos Comprobatórios de Especialidade(s)":
-- o serviço (src/services/profissionais-arquivos.ts) usa o bucket "profissionais-comprobantes".
-- A rodada anterior havia criado "profissionais-arquivos" pela migração; aqui criamos o
-- bucket correto (privado, 10 MB, PDF/PNG/JPG/WEBP) com as políticas de acesso e
-- removemos o bucket com nome incorreto se ainda estiver vazio.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profissionais-comprobantes',
  'profissionais-comprobantes',
  false,
  10485760,
  '{application/pdf,image/png,image/jpeg,image/webp}'
)
on conflict (id) do update
  set file_size_limit = 10485760,
      allowed_mime_types = '{application/pdf,image/png,image/jpeg,image/webp}',
      public = false;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profissionais_comprobantes_acesso'
  ) then
    create policy profissionais_comprobantes_acesso on storage.objects
      for all to authenticated
      using (bucket_id = 'profissionais-comprobantes')
      with check (bucket_id = 'profissionais-comprobantes');
  end if;
end $$;

-- Nota: o bucket extra "profissionais-arquivos" (nome incorreto, criado pela migração
-- anterior) não pode ser removido via SQL — o Storage do Supabase só permite exclusão
-- via Storage API. Ele permanece vazio e inofensivo; pode ser removido pelo painel.
