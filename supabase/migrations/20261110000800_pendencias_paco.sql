begin;

create table public.retornos_paco (
  vistoria_id uuid not null references public.vistorias_paco(id) on delete cascade,
  item_id text not null,
  corrigida_em timestamptz not null default now(),
  foto_caminho text not null unique,
  primary key (vistoria_id, item_id)
);

alter table public.retornos_paco enable row level security;
revoke all on public.retornos_paco from public, anon, authenticated;
grant select on public.retornos_paco to authenticated;
create policy retornos_paco_leitura on public.retornos_paco for select to authenticated using (
  exists (select 1 from public.vistorias_paco v where v.id = vistoria_id)
);

create view public.acompanhamento_paco with (security_invoker = true) as
select v.*, r.retornos, (
  select count(*)::integer
  from jsonb_array_elements(v.itens) i(item)
  where item->>'resultado' = 'precisa_corrigir'
    and item->>'foto_depois' is distinct from 'true'
    and not r.retornos ? (item->>'id')
) as total_pendencias
from public.vistorias_paco v
cross join lateral (
  select coalesce(jsonb_object_agg(item_id, jsonb_build_object(
    'corrigida_em', corrigida_em, 'foto_caminho', foto_caminho
  )), '{}'::jsonb) as retornos
  from public.retornos_paco
  where vistoria_id = v.id
) r
where v.registrada_em is not null;

revoke all on public.acompanhamento_paco from public, anon, authenticated;
grant select on public.acompanhamento_paco to authenticated;

create policy fotos_retorno_paco_leitura on storage.objects for select to authenticated using (
  bucket_id = 'paco-evidencias' and exists (
    select 1 from public.retornos_paco r where r.foto_caminho = name
  )
);

create policy fotos_retorno_paco_enviar on storage.objects for insert to authenticated with check (
  bucket_id = 'paco-evidencias' and exists (
    select 1
    from public.acompanhamento_paco v
    cross join lateral jsonb_array_elements(v.itens) i(item)
    where v.id::text = (storage.foldername(name))[1]
      and v.encarregado_id = (select auth.uid())
      and item->>'resultado' = 'precisa_corrigir'
      and item->>'foto_depois' is distinct from 'true'
      and not v.retornos ? (item->>'id')
      and item->>'id' ~ '^[a-z0-9_]{1,40}$'
      and name ~ ('^' || v.id::text || '/retorno-' || (item->>'id') ||
        '-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
  )
);

create function public.registrar_retorno_paco(p_vistoria_id uuid, p_item_id text, p_foto_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  caminho text := p_vistoria_id::text || '/retorno-' || p_item_id || '-' || p_foto_id::text;
begin
  if p_item_id is null or p_item_id !~ '^[a-z0-9_]{1,40}$' or not exists (
    select 1
    from public.vistorias_paco v
    join public.equipe_paco e on e.encarregado_id = v.encarregado_id
    join public.perfis p on p.id = e.encarregado_id
    cross join lateral jsonb_array_elements(v.itens) i(item)
    where v.id = p_vistoria_id and v.registrada_em is not null
      and v.encarregado_id = (select auth.uid()) and p.papel = 'campo_paco'
      and item->>'id' = p_item_id and item->>'resultado' = 'precisa_corrigir'
      and item->>'foto_depois' is distinct from 'true'
  ) then
    raise exception 'Esta correção não está disponível para o seu perfil.';
  end if;

  if exists (
    select 1 from public.retornos_paco where vistoria_id = p_vistoria_id and item_id = p_item_id
  ) then return; end if;

  if not exists (
    select 1 from storage.objects where bucket_id = 'paco-evidencias' and name = caminho
  ) then
    raise exception 'Anexe a foto de depois para concluir a correção.';
  end if;

  insert into public.retornos_paco (vistoria_id, item_id, foto_caminho)
  values (p_vistoria_id, p_item_id, caminho)
  on conflict (vistoria_id, item_id) do nothing;
end;
$$;

revoke all on function public.registrar_retorno_paco(uuid, text, uuid) from public, anon;
grant execute on function public.registrar_retorno_paco(uuid, text, uuid) to authenticated;

commit;
