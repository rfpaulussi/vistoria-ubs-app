begin;

create function private.treinamentos_vistoria_validos(registro jsonb, equipe jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  itens jsonb;
  item jsonb;
begin
  if jsonb_typeof(registro) = 'object' then
    itens := jsonb_build_array(registro);
  elsif jsonb_typeof(registro) = 'array' then
    itens := registro;
  else
    return false;
  end if;

  if jsonb_array_length(itens) = 0 or length(registro::text) > 800000 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(itens) loop
    if jsonb_typeof(item -> 'participantes') is distinct from 'array' then
      return false;
    end if;
    if not coalesce(
      jsonb_typeof(item) = 'object'
      and length(item ->> 'procedimentoId') > 0
      and length(item ->> 'roteiro') between 1 and 6000
      and jsonb_array_length(item -> 'participantes') between 1 and 60
      and private.assinaturas_treinamento_validas(item -> 'participantes', equipe),
      false
    ) then
      return false;
    end if;
  end loop;

  return (
    select count(*) = count(distinct value ->> 'procedimentoId')
    from jsonb_array_elements(itens)
  );
end;
$$;

revoke execute on function private.treinamentos_vistoria_validos(jsonb, jsonb) from public, anon;
grant execute on function private.treinamentos_vistoria_validos(jsonb, jsonb) to authenticated;

do $$
declare
  nome text;
begin
  select conname into strict nome
  from pg_catalog.pg_constraint
  where conrelid = 'public.vistorias'::regclass
    and contype = 'c'
    and pg_catalog.pg_get_constraintdef(oid) like '%assinaturas_treinamento_validas%';
  execute format('alter table public.vistorias drop constraint %I', nome);
end;
$$;

alter table public.vistorias add constraint vistorias_treinamento_check check (
    treinamento is null or (
      estado = 'finalizada'
      and private.treinamentos_vistoria_validos(treinamento, conferencia_equipe -> 'colaboradores')
    )
  );

commit;
