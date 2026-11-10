begin;

create table private.uso_ia_vistoria (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  dia date not null,
  total integer not null check (total between 1 and 30),
  primary key (perfil_id, dia)
);

create function public.reservar_uso_ia_vistoria()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
begin
  if not exists (select 1 from public.perfis where id = usuario) then
    return 'SEM_ACESSO';
  end if;

  insert into private.uso_ia_vistoria as uso (perfil_id, dia, total)
  values (usuario, (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (perfil_id, dia) do update
    set total = uso.total + 1
    where uso.total < 30;

  return case when found then 'OK' else 'LIMITE_DIARIO' end;
end;
$$;

revoke execute on function public.reservar_uso_ia_vistoria() from public, anon;
grant execute on function public.reservar_uso_ia_vistoria() to authenticated;

commit;
