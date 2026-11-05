-- Inscrições do Profissional no Processo Seletivo, por Ano Letivo (tabela filha de profissionais)
create table if not exists public.profissional_ano_inscricoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  ano_letivo integer not null check (ano_letivo between 2020 and 2040),
  inscrito boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profissional_ano_inscricoes_unico unique (profissional_id, ano_letivo)
);

alter table public.profissional_ano_inscricoes enable row level security;

create policy "Usuarios autenticados podem ver inscricoes por ano"
  on public.profissional_ano_inscricoes for select to authenticated using (true);

create policy "Usuarios autenticados podem criar inscricoes por ano"
  on public.profissional_ano_inscricoes for insert to authenticated with check (true);

create policy "Usuarios autenticados podem atualizar inscricoes por ano"
  on public.profissional_ano_inscricoes for update to authenticated using (true) with check (true);

create policy "Usuarios autenticados podem excluir inscricoes por ano"
  on public.profissional_ano_inscricoes for delete to authenticated using (true);
