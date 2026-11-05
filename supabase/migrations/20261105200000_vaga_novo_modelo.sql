-- =====================================================================
-- Novo modelo do Cadastro de Vagas (reforma solicitada):
-- - tipo_vinculo: 'CARGO' | 'FUNCAO' (pergunta se a vaga é de Cargo ou Função)
-- - funcao_id: FK RESTRICT para funcoes (obrigatória quando tipo = FUNCAO)
-- - cargo_id: passa a FK RESTRICT (obrigatório quando tipo = CARGO)
-- - profissional_titular_id / profissional_ocupante_id: FK RESTRICT para profissionais
--   (titular e ocupante podem ser o mesmo profissional; ambos opcionais)
-- - status permanece único no banco (ABERTA/OCUPADA/EXCEDENTE); "Preenchida" = OCUPADA
-- - nome_ocupante e servidor_id continuam gravados por compatibilidade quando
--   o ocupante é informado
-- =====================================================================

-- 1. Tipo de vínculo da vaga (vagas existentes eram todas por função)
alter table public.vaga
  add column if not exists tipo_vinculo text not null default 'FUNCAO';

alter table public.vaga
  drop constraint if exists vaga_tipo_vinculo_check;

alter table public.vaga
  add constraint vaga_tipo_vinculo_check
  check (tipo_vinculo in ('CARGO', 'FUNCAO'));

-- 2. Função da Vaga (integridade referencial com funcoes)
alter table public.vaga
  add column if not exists funcao_id uuid references public.funcoes(id) on delete restrict;

-- 3. Profissional Titular e Profissional Ocupante (integridade referencial)
alter table public.vaga
  add column if not exists profissional_titular_id uuid references public.profissionais(id) on delete restrict;

alter table public.vaga
  add column if not exists profissional_ocupante_id uuid references public.profissionais(id) on delete restrict;

-- 4. Cargo da Vaga: de SET NULL para RESTRICT (integridade referencial exigida)
alter table public.vaga
  drop constraint vaga_cargo_id_fkey;

alter table public.vaga
  add constraint vaga_cargo_id_fkey
  foreign key (cargo_id) references public.cargos(id) on delete restrict;

-- 5. Índices de apoio
create index if not exists idx_vaga_tipo_vinculo on public.vaga(tipo_vinculo);
create index if not exists idx_vaga_funcao_vaga on public.vaga(funcao_id);
create index if not exists idx_vaga_prof_titular on public.vaga(profissional_titular_id);
create index if not exists idx_vaga_prof_ocupante on public.vaga(profissional_ocupante_id);

-- 6. Backfill: vagas existentes apontam para a função da sua linha de configuração
update public.vaga v
set funcao_id = l.funcao_id
from public.configuracao_rh_linha l
where v.configuracao_rh_linha_id = l.id
  and v.funcao_id is null
  and l.funcao_id is not null;
