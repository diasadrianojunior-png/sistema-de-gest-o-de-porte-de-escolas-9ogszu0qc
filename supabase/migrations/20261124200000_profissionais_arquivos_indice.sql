-- Índice de conteúdo dos "Arquivo(s) Comprobatório(s) de Especialidade(s)" do
-- Cadastro de Profissionais. Guarda o texto extraído de cada arquivo (limite de
-- 25 milhões de caracteres por arquivo) em uma coluna tsvector gerada com
-- configuração 'portuguese' e índice GIN, para busca por palavras performática.

create table if not exists public.profissionais_arquivos_indice (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  nome_arquivo text not null,
  caminho text not null unique,
  tipo_arquivo text not null default 'PDF',
  texto_indexado text not null default '',
  caracteres_indexados integer not null default 0,
  indexado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profissionais_arquivos_indice enable row level security;

create policy "Autenticados leem indice de comprovantes"
  on public.profissionais_arquivos_indice
  for select to authenticated using (true);

create policy "Autenticados inserem indice de comprovantes"
  on public.profissionais_arquivos_indice
  for insert to authenticated with check (true);

create policy "Autenticados atualizam indice de comprovantes"
  on public.profissionais_arquivos_indice
  for update to authenticated using (true) with check (true);

create policy "Autenticados excluem indice de comprovantes"
  on public.profissionais_arquivos_indice
  for delete to authenticated using (true);

-- Coluna gerada de busca (tsvector em português) + índice GIN
alter table public.profissionais_arquivos_indice
  add column if not exists busca tsvector
  generated always as (to_tsvector('portuguese', coalesce(texto_indexado, ''))) stored;

create index if not exists idx_prof_arquivos_indice_busca_gin
  on public.profissionais_arquivos_indice using gin (busca);

create index if not exists idx_prof_arquivos_indice_profissional
  on public.profissionais_arquivos_indice (profissional_id);

-- RPC: devolve os ids dos profissionais que possuem ao menos um arquivo
-- comprobatório cujo conteúdo indexado contém as palavras buscadas.
create or replace function public.profissionais_busca_por_arquivos(p_busca text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct pai.profissional_id
  from public.profissionais_arquivos_indice pai
  where p_busca is not null
    and length(btrim(p_busca)) > 0
    and pai.busca @@ websearch_to_tsquery('portuguese', p_busca);
$$;
