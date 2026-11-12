begin;

alter table private.links_supervisao add column prazo_resposta date;
alter table private.respostas_supervisao add column prazo_complemento date;

create index itens_supervisao_vistoria_item on private.itens_supervisao (vistoria_id, item_id, link_id);

create function private.pode_acompanhar_supervisao(p_vistoria_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.vistorias v
    join public.perfis p on p.id = auth.uid()
    where v.id = p_vistoria_id and v.estado = 'finalizada'
      and (p.papel = 'admin' or (p.papel = 'campo' and v.responsavel_id = p.id))
  );
$$;

revoke all on function private.pode_acompanhar_supervisao(uuid) from public, anon, authenticated;

create or replace function private.dados_resposta_supervisao(r private.respostas_supervisao)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'respondido_por', r.respondido_por, 'situacao', r.situacao,
    'descricao', r.descricao, 'responsavel', r.responsavel, 'data_acao', r.data_acao,
    'comprovacao', r.comprovacao, 'enviada_em', r.enviada_em,
    'prazo_complemento', r.prazo_complemento, 'decisao', r.decisao, 'nota_revisao', r.nota_revisao, 'revisada_em', r.revisada_em
  );
$$;

create function public.emitir_link_supervisao(p_vistoria_id uuid, p_supervisor text, p_link_anterior uuid, p_prazo_resposta date)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  novo private.links_supervisao;
  anterior uuid;
begin
  if not private.pode_acompanhar_supervisao(p_vistoria_id) then
    raise exception 'Esta vistoria não está disponível para o seu perfil.';
  end if;
  if char_length(btrim(coalesce(p_supervisor, ''))) not between 1 and 120 then
    raise exception 'Informe o nome do supervisor.';
  end if;

  if p_prazo_resposta is null or p_prazo_resposta not between
    (now() at time zone 'America/Sao_Paulo')::date
    and (now() at time zone 'America/Sao_Paulo')::date + 60 then
    raise exception 'Informe um prazo para resposta entre hoje e os próximos 60 dias.';
  end if;

  perform 1 from public.vistorias where id = p_vistoria_id and estado = 'finalizada' for update;
  if not found then raise exception 'A vistoria precisa estar finalizada.'; end if;

  select id into anterior from private.links_supervisao where vistoria_id = p_vistoria_id
    order by criado_em desc, id desc limit 1;
  if anterior is distinct from p_link_anterior then
    raise exception 'O link desta vistoria mudou. Atualize o acompanhamento antes de emitir outro.';
  end if;

  update private.links_supervisao set revogado_em = clock_timestamp()
    where vistoria_id = p_vistoria_id and revogado_em is null;
  insert into private.links_supervisao (vistoria_id, supervisor, token_hash, criado_por, prazo_resposta)
    values (p_vistoria_id, btrim(p_supervisor), sha256(convert_to(token, 'UTF8')), auth.uid(), p_prazo_resposta)
    returning * into novo;
  insert into private.itens_supervisao (link_id, vistoria_id, item_id)
    select novo.id, a.vistoria_id, a.item_id from public.apontamentos a
    where a.vistoria_id = p_vistoria_id and a.situacao <> 'resolvido';
  if not found then raise exception 'Esta vistoria não tem apontamentos em aberto.'; end if;
  return jsonb_build_object('id', novo.id, 'token', token, 'supervisor', novo.supervisor, 'expira_em', novo.expira_em, 'prazo_resposta', novo.prazo_resposta);
end;
$$;

-- Mantém a emissão disponível para a versão anterior do aplicativo durante a publicação.
create or replace function public.emitir_link_supervisao(p_vistoria_id uuid, p_supervisor text, p_link_anterior uuid)
returns jsonb language sql security invoker set search_path = ''
as $$
  select public.emitir_link_supervisao(p_vistoria_id, p_supervisor, p_link_anterior,
    (now() at time zone 'America/Sao_Paulo')::date + 3);
$$;

create or replace function public.revogar_link_supervisao(p_vistoria_id uuid, p_link_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.pode_acompanhar_supervisao(p_vistoria_id) then
    raise exception 'Esta vistoria não está disponível para o seu perfil.';
  end if;
  perform 1 from public.vistorias where id = p_vistoria_id for update;
  update private.links_supervisao set revogado_em = now()
    where id = p_link_id and vistoria_id = p_vistoria_id and revogado_em is null;
end;
$$;

create function public.alterar_prazo_supervisao(p_vistoria_id uuid, p_link_id uuid, p_prazo_resposta date)
returns date language plpgsql security definer set search_path = ''
as $$
declare
  link private.links_supervisao;
begin
  if not private.pode_acompanhar_supervisao(p_vistoria_id) then
    raise exception 'Esta vistoria não está disponível para o seu perfil.';
  end if;
  select l.* into link from private.links_supervisao l
  where l.id = p_link_id and l.vistoria_id = p_vistoria_id
    and l.revogado_em is null and l.expira_em > clock_timestamp() for update;
  if not found then raise exception 'O link mudou ou expirou. Atualize os retornos.'; end if;
  if p_prazo_resposta is null or p_prazo_resposta not between
    (now() at time zone 'America/Sao_Paulo')::date
    and (link.expira_em at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe um prazo entre hoje e o fim da validade do link.';
  end if;
  update private.links_supervisao set prazo_resposta = p_prazo_resposta where id = link.id;
  return p_prazo_resposta;
end;
$$;

create or replace function public.consultar_retorno_supervisao(p_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'unidade', v.unidade, 'data_vistoria', v.data_vistoria, 'data_retorno', v.data_retorno,
    'supervisor', l.supervisor, 'expira_em', l.expira_em, 'prazo_resposta', l.prazo_resposta,
    'itens', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.item_id, 'titulo', r.item_titulo, 'observacao', r.observacao,
      'orientacao', a.orientacao, 'prazo', a.prazo, 'situacao', a.situacao,
      'resposta', case when s.id is not null then private.dados_resposta_supervisao(s) end
    ) order by r.critico desc, a.prazo nulls last, i.item_id) filter (where i.item_id is not null), '[]'::jsonb)
  )
  from private.links_supervisao l
  join public.vistorias v on v.id = l.vistoria_id
  left join private.itens_supervisao i on i.link_id = l.id
  left join public.respostas r on r.vistoria_id = i.vistoria_id and r.item_id = i.item_id
  left join public.apontamentos a on a.vistoria_id = i.vistoria_id and a.item_id = i.item_id
  left join lateral (
    select s.* from private.respostas_supervisao s
    where s.vistoria_id = i.vistoria_id and s.item_id = i.item_id
    order by s.enviada_em desc, s.id desc limit 1
  ) s on true
  where p_token ~ '^[a-f0-9]{64}$'
    and l.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and l.revogado_em is null and l.expira_em > now()
  group by l.id, v.id;
$$;

create or replace function public.acompanhar_retorno_supervisao(p_vistoria_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.pode_acompanhar_supervisao(p_vistoria_id) then
    raise exception 'Esta vistoria não está disponível para o seu perfil.';
  end if;
  return jsonb_build_object(
    'link', (
      select jsonb_build_object('id', l.id, 'supervisor', l.supervisor, 'expira_em', l.expira_em,
        'prazo_resposta', l.prazo_resposta, 'ativo', l.revogado_em is null and l.expira_em > now())
      from private.links_supervisao l where l.vistoria_id = p_vistoria_id
      order by l.criado_em desc, l.id desc limit 1
    ),
    'apontamentos', (
      select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
      from public.apontamentos a where a.vistoria_id = p_vistoria_id
    ),
    'respostas', (
      select coalesce(jsonb_agg(private.dados_resposta_supervisao(s)
        || jsonb_build_object('item_id', s.item_id, 'supervisor', l.supervisor, 'revisor', p.nome)
        order by s.enviada_em desc, s.id desc), '[]'::jsonb)
      from private.respostas_supervisao s
      join private.links_supervisao l on l.id = s.link_id
      left join public.perfis p on p.id = s.revisada_por
      where s.vistoria_id = p_vistoria_id
    )
  );
end;
$$;

create function public.revisar_retorno_supervisao(p_resposta_id uuid, p_decisao text, p_nota text, p_prazo_complemento date)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  resposta private.respostas_supervisao;
  situacao_atual text;
  nota text := btrim(coalesce(p_nota, ''));
begin
  if coalesce(p_decisao, '') not in ('aceito', 'devolvido') or char_length(nota) > 1000
    or (p_decisao = 'devolvido' and (nota = '' or p_prazo_complemento is null
      or p_prazo_complemento < (now() at time zone 'America/Sao_Paulo')::date)) then
    raise exception 'Informe a decisão e, em caso de devolução, o que deve ser esclarecido e o novo prazo.';
  end if;
  select s.* into resposta from private.respostas_supervisao s where s.id = p_resposta_id;
  if not found or not private.pode_acompanhar_supervisao(resposta.vistoria_id) then
    raise exception 'Esta resposta não está disponível para o seu perfil.';
  end if;

  select a.situacao into situacao_atual from public.apontamentos a
    where a.vistoria_id = resposta.vistoria_id and a.item_id = resposta.item_id for update;
  if not found or situacao_atual = 'resolvido' then
    raise exception 'Este apontamento já foi encerrado ou não está disponível.';
  end if;
  update private.respostas_supervisao
    set decisao = p_decisao, nota_revisao = nota,
        prazo_complemento = case when p_decisao = 'devolvido' then p_prazo_complemento end,
        revisada_em = clock_timestamp(), revisada_por = auth.uid()
    where id = p_resposta_id and decisao is null;
  if not found then raise exception 'Esta resposta já foi revisada.'; end if;

  if p_decisao = 'aceito' and resposta.situacao = 'corrigida' then
    update public.apontamentos set situacao = 'resolvido'
      where vistoria_id = resposta.vistoria_id and item_id = resposta.item_id;
    situacao_atual := 'resolvido';
  end if;
  return situacao_atual;
end;
$$;

create or replace function public.revisar_retorno_supervisao(p_resposta_id uuid, p_decisao text, p_nota text)
returns text language sql security invoker set search_path = ''
as $$
  select public.revisar_retorno_supervisao(p_resposta_id, p_decisao, p_nota,
    (now() at time zone 'America/Sao_Paulo')::date + 3);
$$;

create function public.resumo_retornos_supervisao(p_vistorias uuid[])
returns table(vistoria_id uuid, a_validar bigint, respostas_atrasadas bigint)
language sql stable security definer set search_path = ''
as $$
  select a.vistoria_id,
    count(*) filter (where s.id is not null and s.decisao is null),
    count(*) filter (
      where (s.id is null or s.decisao = 'devolvido')
        and coalesce(s.prazo_complemento, l.prazo_resposta) < (now() at time zone 'America/Sao_Paulo')::date
    )
  from public.apontamentos a
  left join lateral (
    select r.id, r.decisao, r.prazo_complemento
    from private.respostas_supervisao r
    where r.vistoria_id = a.vistoria_id and r.item_id = a.item_id
    order by r.enviada_em desc, r.id desc limit 1
  ) s on true
  left join lateral (
    select ls.prazo_resposta from private.links_supervisao ls
    join private.itens_supervisao i on i.link_id = ls.id
    where i.vistoria_id = a.vistoria_id and i.item_id = a.item_id
    order by ls.criado_em desc, ls.id desc limit 1
  ) l on true
  where a.vistoria_id = any(p_vistorias) and a.situacao <> 'resolvido'
    and private.pode_acompanhar_supervisao(a.vistoria_id)
  group by a.vistoria_id;
$$;

revoke all on function public.emitir_link_supervisao(uuid, text, uuid, date),
  public.alterar_prazo_supervisao(uuid, uuid, date), public.revisar_retorno_supervisao(uuid, text, text, date),
  public.resumo_retornos_supervisao(uuid[]) from public, anon, authenticated;
grant execute on function public.emitir_link_supervisao(uuid, text, uuid, date),
  public.alterar_prazo_supervisao(uuid, uuid, date), public.revisar_retorno_supervisao(uuid, text, text, date),
  public.resumo_retornos_supervisao(uuid[]) to authenticated;

commit;
