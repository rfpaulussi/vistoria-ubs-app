begin;

alter table public.vistorias_paco add column itens jsonb not null default '[]'::jsonb
  check (jsonb_typeof(itens) = 'array');
grant update (itens) on public.vistorias_paco to authenticated;

create policy fotos_itens_paco_leitura on storage.objects for select to authenticated using (
  bucket_id = 'paco-evidencias' and exists (
    select 1
    from public.vistorias_paco v
    cross join lateral jsonb_array_elements(v.itens) as itens(item)
    where v.id::text = (storage.foldername(name))[1]
      and v.registrada_em is not null
      and (
        (item->>'foto_antes' = 'true' and name = v.id::text || '/item-' || (item->>'id') || '-antes')
        or (item->>'foto_depois' = 'true' and name = v.id::text || '/item-' || (item->>'id') || '-depois')
      )
  )
);

create policy fotos_itens_paco_enviar on storage.objects for insert to authenticated with check (
  bucket_id = 'paco-evidencias' and exists (
    select 1 from public.vistorias_paco v
    where name ~ ('^' || v.id::text || '/item-[a-z0-9_]{1,40}-(antes|depois)$')
      and v.id::text = (storage.foldername(name))[1]
      and v.registrada_em is null and v.encarregado_id = (select auth.uid())
  )
);

create policy fotos_itens_paco_substituir on storage.objects for update to authenticated using (
  bucket_id = 'paco-evidencias' and exists (
    select 1 from public.vistorias_paco v
    where name ~ ('^' || v.id::text || '/item-[a-z0-9_]{1,40}-(antes|depois)$')
      and v.id::text = (storage.foldername(name))[1]
      and v.registrada_em is null and v.encarregado_id = (select auth.uid())
  )
);

create function private.validar_itens_paco()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  item jsonb;
  item_id text;
  ids text[] := '{}';
  resultado text;
  qualidade_calculada text := 'nao_avaliada';
  tipo text;
begin
  if new.itens = '[]'::jsonb then return new; end if;
  if jsonb_typeof(new.itens) <> 'array' or jsonb_array_length(new.itens) > 20
    or new.acesso not in ('livre', 'autorizado', 'agendado') then
    raise exception 'Os itens da avaliação são inválidos para esta vistoria';
  end if;

  for item in select value from jsonb_array_elements(new.itens) loop
    item_id := item->>'id';
    resultado := item->>'resultado';
    if not coalesce(
      item_id ~ '^[a-z0-9_]{1,40}$' and not item_id = any(ids)
      and length(btrim(item->>'pergunta')) between 1 and 300
      and resultado in ('conforme', 'precisa_corrigir', 'nao_verificado', 'nao_se_aplica')
      and length(coalesce(item->>'observacao', '')) <= 1000, false
    ) then
      raise exception 'Verifique as respostas dos itens da avaliação';
    end if;
    ids := array_append(ids, item_id);

    if resultado = 'precisa_corrigir' then
      qualidade_calculada := 'precisa_corrigir';
      if btrim(coalesce(item->>'observacao', '')) = '' then
        raise exception 'Descreva a correção necessária em cada item com desvio';
      end if;
    elsif resultado = 'conforme' and qualidade_calculada = 'nao_avaliada' then
      qualidade_calculada := 'conforme';
    end if;

    foreach tipo in array array['antes', 'depois'] loop
      if item->>('foto_' || tipo) = 'true' then
        if resultado <> 'precisa_corrigir' or not exists (
          select 1 from storage.objects
          where bucket_id = 'paco-evidencias'
            and name = new.id::text || '/item-' || item_id || '-' || tipo
        ) then
          raise exception 'Confira as fotos vinculadas aos itens da avaliação';
        end if;
      end if;
    end loop;
  end loop;

  if new.qualidade <> qualidade_calculada then
    raise exception 'A qualidade do setor deve refletir as respostas dos itens';
  end if;
  return new;
end;
$$;

create trigger validar_itens_paco before update on public.vistorias_paco for each row
  when (old.registrada_em is null and new.registrada_em is not null)
  execute function private.validar_itens_paco();

commit;
