begin;

create schema if not exists private;

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  papel text not null check (papel in ('admin', 'campo'))
);

-- Os perfis são provisionados por um administrador de banco, fora do app.
create function private.e_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin'
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.e_admin() from public, anon;
grant execute on function private.e_admin() to authenticated;

create table public.vistorias (
  id uuid primary key default gen_random_uuid(),
  responsavel_id uuid references public.perfis(id) on delete set null default auth.uid(),
  unidade text not null check (btrim(unidade) <> ''),
  encarregada text not null check (btrim(encarregada) <> ''),
  data_vistoria date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'finalizada')),
  nota numeric(4, 2) check (nota between 0 and 10),
  data_retorno date,
  observacoes text not null default '',
  criada_em timestamptz not null default now(),
  finalizada_em timestamptz,
  referencia_legado text unique,
  falhas_legado text,
  check (estado <> 'rascunho' or finalizada_em is null),
  check (estado <> 'finalizada' or finalizada_em is not null or referencia_legado is not null)
);

create index vistorias_responsavel_idx on public.vistorias (responsavel_id);
create index vistorias_unidade_data_idx on public.vistorias (unidade, data_vistoria desc);

create table public.respostas (
  vistoria_id uuid not null references public.vistorias(id) on delete cascade,
  item_id text not null check (btrim(item_id) <> ''),
  item_titulo text not null check (btrim(item_titulo) <> ''),
  resultado text not null check (resultado in ('conforme', 'nao_conforme', 'nao_se_aplica')),
  critico boolean not null default false,
  observacao text not null default '',
  corrigido_na_visita boolean not null default false,
  primary key (vistoria_id, item_id),
  check (not corrigido_na_visita or resultado = 'nao_conforme')
);

create table public.apontamentos (
  vistoria_id uuid not null,
  item_id text not null,
  responsavel_id uuid references public.perfis(id) on delete set null,
  prazo date,
  situacao text not null default 'aberto'
    check (situacao in ('aberto', 'em_andamento', 'resolvido')),
  orientacao text not null default '',
  primary key (vistoria_id, item_id),
  foreign key (vistoria_id, item_id) references public.respostas(vistoria_id, item_id) on delete cascade
);

create index apontamentos_prazo_idx on public.apontamentos (prazo)
  where situacao <> 'resolvido';

create function private.abrir_apontamentos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.apontamentos (vistoria_id, item_id)
    select vistoria_id, item_id from public.respostas
    where vistoria_id = new.id and resultado = 'nao_conforme' and not corrigido_na_visita
    on conflict (vistoria_id, item_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.abrir_apontamentos() from public, anon, authenticated;

create trigger abrir_apontamentos_ao_finalizar
  after update of estado on public.vistorias
  for each row
  when (old.estado = 'rascunho' and new.estado = 'finalizada')
  execute function private.abrir_apontamentos();

create table public.evidencias (
  vistoria_id uuid not null,
  item_id text not null,
  caminho text primary key,
  tipo text not null check (tipo in ('antes', 'depois')),
  criada_em timestamptz not null default now(),
  foreign key (vistoria_id, item_id) references public.respostas(vistoria_id, item_id) on delete cascade,
  check (caminho like vistoria_id::text || '/_%')
);

create index evidencias_resposta_idx on public.evidencias (vistoria_id, item_id);

alter table public.perfis enable row level security;
alter table public.vistorias enable row level security;
alter table public.respostas enable row level security;
alter table public.apontamentos enable row level security;
alter table public.evidencias enable row level security;

revoke all on public.perfis, public.vistorias, public.respostas, public.apontamentos,
  public.evidencias from public, anon, authenticated;

grant select on public.perfis, public.vistorias, public.respostas, public.apontamentos,
  public.evidencias to authenticated;
grant insert (id, responsavel_id, unidade, encarregada, data_vistoria, nota, data_retorno, observacoes)
  on public.vistorias to authenticated;
grant update (unidade, encarregada, data_vistoria, estado, nota, data_retorno, observacoes, finalizada_em)
  on public.vistorias to authenticated;
grant insert, update, delete on public.respostas, public.evidencias to authenticated;
grant update (responsavel_id, prazo, situacao, orientacao) on public.apontamentos to authenticated;

create policy perfis_leitura on public.perfis
  for select to authenticated using (id = (select auth.uid()) or (select private.e_admin()));

create policy vistorias_leitura on public.vistorias
  for select to authenticated using (responsavel_id = (select auth.uid()) or (select private.e_admin()));

create policy vistorias_criar on public.vistorias
  for insert to authenticated with check (
    responsavel_id = (select auth.uid())
    and exists (select 1 from public.perfis where id = (select auth.uid()))
  );

create policy vistorias_editar_rascunho on public.vistorias
  for update to authenticated
  using (estado = 'rascunho' and responsavel_id = (select auth.uid()))
  with check (responsavel_id = (select auth.uid()));

-- Nas tabelas filhas, a consulta à vistoria aplica a política de leitura do pai.
create policy respostas_leitura on public.respostas
  for select to authenticated using (
    exists (select 1 from public.vistorias v where v.id = vistoria_id)
  );

create policy respostas_editar_rascunho on public.respostas
  for all to authenticated using (
    exists (
      select 1 from public.vistorias v
      where v.id = vistoria_id and v.estado = 'rascunho' and v.responsavel_id = (select auth.uid())
    )
  );

create policy apontamentos_leitura on public.apontamentos
  for select to authenticated using (
    exists (select 1 from public.vistorias v where v.id = vistoria_id)
  );

create policy apontamentos_editar_admin on public.apontamentos
  for update to authenticated using ((select private.e_admin()))
  with check ((select private.e_admin()));

create policy evidencias_leitura on public.evidencias
  for select to authenticated using (
    exists (select 1 from public.vistorias v where v.id = vistoria_id)
  );

create policy evidencias_editar_rascunho on public.evidencias
  for all to authenticated using (
    exists (
      select 1 from public.vistorias v
      where v.id = vistoria_id and v.estado = 'rascunho' and v.responsavel_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vistoria-evidencias', 'vistoria-evidencias', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);

create policy fotos_leitura on storage.objects
  for select to authenticated using (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.vistorias v where v.id::text = (storage.foldername(name))[1]
    )
  );

create policy fotos_enviar on storage.objects
  for insert to authenticated with check (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.vistorias v where v.id::text = (storage.foldername(name))[1]
        and v.estado = 'rascunho' and v.responsavel_id = (select auth.uid())
    )
  );

create policy fotos_excluir_rascunho on storage.objects
  for delete to authenticated using (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.vistorias v where v.id::text = (storage.foldername(name))[1]
        and v.estado = 'rascunho' and v.responsavel_id = (select auth.uid())
    )
  );

commit;
