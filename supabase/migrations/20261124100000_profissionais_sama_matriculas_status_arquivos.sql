-- Novos atributos do Cadastro de Profissionais:
-- 1) codigo_sama: "Código do Profissional no SAMA" — obrigatório e único (índice UNIQUE funcional,
--    validação amigável na tela e no serviço)
-- 2) matriculas: "Matrícula(s)" — obrigatório, múltiplo (text[]), sem repetição (garantida no app)
-- 3) status_profissional: "Status do Profissional" — obrigatório, valores Fixado | PS | PSS
-- 4) arquivos_comprobatorios: "Arquivo(s) Comprobatório(s) de Especialidade(s)" — jsonb com os
--    metadados dos arquivos enviados ao bucket de Storage "profissionais-arquivos"

alter table public.profissionais
  add column if not exists codigo_sama text,
  add column if not exists matriculas text[] not null default '{}'::text[],
  add column if not exists status_profissional text,
  add column if not exists arquivos_comprobatorios jsonb not null default '[]'::jsonb;

-- Preserva registros existentes: o código SAMA inicial é o identificador do sistema (PRO-XXXX)
update public.profissionais set codigo_sama = codigo where codigo_sama is null;
-- Preserva registros existentes: status inicial padrão
update public.profissionais set status_profissional = 'Fixado' where status_profissional is null;

alter table public.profissionais alter column codigo_sama set not null;
alter table public.profissionais alter column status_profissional set not null;

alter table public.profissionais drop constraint if exists profissionais_status_profissional_check;
alter table public.profissionais
  add constraint profissionais_status_profissional_check
  check (status_profissional in ('Fixado', 'PS', 'PSS'));

-- Unicidade do Código do Profissional no SAMA (case-insensitive, sem espaços nas bordas)
create unique index if not exists profissionais_codigo_sama_unico_idx
  on public.profissionais (lower(btrim(codigo_sama)));

-- Bucket de Storage para os Arquivos Comprobatórios de Especialidade(s)
insert into storage.buckets (id, name, public)
values ('profissionais-arquivos', 'profissionais-arquivos', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profissionais_arquivos_acesso'
  ) then
    create policy profissionais_arquivos_acesso on storage.objects
      for all to authenticated
      using (bucket_id = 'profissionais-arquivos')
      with check (bucket_id = 'profissionais-arquivos');
  end if;
end $$;
