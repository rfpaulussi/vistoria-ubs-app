begin;

alter table public.apontamentos add column prazo_supervisao date;

create table private.links_supervisao (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references public.vistorias(id) on delete cascade,
  supervisor text not null check (char_length(btrim(supervisor)) between 1 and 120),
  token_hash bytea not null unique,
  criado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default clock_timestamp(),
  expira_em timestamptz not null default (clock_timestamp() + interval '60 days'),
  revogado_em timestamptz,
  unique (id, vistoria_id)
);

create unique index links_supervisao_ativo on private.links_supervisao (vistoria_id)
  where revogado_em is null;

create table private.itens_supervisao (
  link_id uuid not null,
  vistoria_id uuid not null,
  item_id text not null,
  primary key (link_id, vistoria_id, item_id),
  foreign key (link_id, vistoria_id) references private.links_supervisao(id, vistoria_id) on delete cascade,
  foreign key (vistoria_id, item_id) references public.apontamentos(vistoria_id, item_id) on delete cascade
);

create table private.respostas_supervisao (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  vistoria_id uuid not null,
  item_id text not null,
  respondido_por text not null check (char_length(btrim(respondido_por)) between 1 and 120),
  situacao text not null check (situacao in ('planejada', 'corrigida', 'impedida')),
  descricao text not null check (char_length(btrim(descricao)) between 1 and 2000),
  responsavel text not null check (char_length(btrim(responsavel)) between 1 and 120),
  data_acao date,
  comprovacao text not null default '' check (char_length(comprovacao) <= 1000),
  enviada_em timestamptz not null default clock_timestamp(),
  decisao text check (decisao in ('aceito', 'devolvido')),
  nota_revisao text check (char_length(nota_revisao) <= 1000),
  revisada_em timestamptz,
  revisada_por uuid references public.perfis(id) on delete set null,
  foreign key (link_id, vistoria_id, item_id)
    references private.itens_supervisao(link_id, vistoria_id, item_id) on delete cascade,
  check (situacao = 'impedida' or data_acao is not null)
);

create index respostas_supervisao_item on private.respostas_supervisao
  (vistoria_id, item_id, enviada_em desc, id desc);

revoke all on private.links_supervisao, private.itens_supervisao, private.respostas_supervisao
  from public, anon, authenticated;

create function private.dados_resposta_supervisao(r private.respostas_supervisao)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'respondido_por', r.respondido_por, 'situacao', r.situacao,
    'descricao', r.descricao, 'responsavel', r.responsavel, 'data_acao', r.data_acao,
    'comprovacao', r.comprovacao, 'enviada_em', r.enviada_em,
    'decisao', r.decisao, 'nota_revisao', r.nota_revisao, 'revisada_em', r.revisada_em
  );
$$;

create function public.emitir_link_supervisao(p_vistoria_id uuid, p_supervisor text, p_link_anterior uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  novo private.links_supervisao;
  anterior uuid;
begin
  if not private.e_admin() then
    raise exception 'Apenas a gestão pode emitir o link.';
  end if;
  if char_length(btrim(coalesce(p_supervisor, ''))) not between 1 and 120 then
    raise exception 'Informe o nome do supervisor.';
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
  insert into private.links_supervisao (vistoria_id, supervisor, token_hash, criado_por)
    values (p_vistoria_id, btrim(p_supervisor), sha256(convert_to(token, 'UTF8')), auth.uid())
    returning * into novo;
  insert into private.itens_supervisao (link_id, vistoria_id, item_id)
    select novo.id, a.vistoria_id, a.item_id from public.apontamentos a
    where a.vistoria_id = p_vistoria_id and a.situacao <> 'resolvido';
  if not found then raise exception 'Esta vistoria não tem apontamentos em aberto.'; end if;
  return jsonb_build_object('id', novo.id, 'token', token, 'supervisor', novo.supervisor, 'expira_em', novo.expira_em);
end;
$$;

create function public.revogar_link_supervisao(p_vistoria_id uuid, p_link_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'Apenas a gestão pode revogar o link.';
  end if;
  perform 1 from public.vistorias where id = p_vistoria_id for update;
  update private.links_supervisao set revogado_em = now()
    where id = p_link_id and vistoria_id = p_vistoria_id and revogado_em is null;
end;
$$;

create function public.consultar_retorno_supervisao(p_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'unidade', v.unidade, 'data_vistoria', v.data_vistoria, 'data_retorno', v.data_retorno,
    'supervisor', l.supervisor, 'expira_em', l.expira_em,
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

create function public.enviar_retorno_supervisao(
  p_token text, p_item_id text, p_resposta_anterior uuid, p_respondido_por text,
  p_situacao text, p_descricao text, p_responsavel text, p_data_acao date, p_comprovacao text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  link private.links_supervisao;
  anterior private.respostas_supervisao;
  nova private.respostas_supervisao;
  situacao_atual text;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Link inválido, expirado ou substituído.';
  end if;
  select l.* into link from private.links_supervisao l
    where l.token_hash = sha256(convert_to(p_token, 'UTF8'))
      and l.revogado_em is null and l.expira_em > clock_timestamp()
    for update;
  if not found then raise exception 'Link inválido, expirado ou substituído.'; end if;

  select a.situacao into situacao_atual
    from public.apontamentos a
    join private.itens_supervisao i using (vistoria_id, item_id)
    where i.link_id = link.id and a.item_id = p_item_id
    for update of a;
  if not found or situacao_atual = 'resolvido' then
    raise exception 'Este apontamento não está disponível para resposta.';
  end if;

  select s.* into anterior from private.respostas_supervisao s
    where s.vistoria_id = link.vistoria_id and s.item_id = p_item_id
    order by s.enviada_em desc, s.id desc limit 1;
  if anterior.id is distinct from p_resposta_anterior
    or (anterior.id is not null and anterior.decisao is null) then
    raise exception 'O apontamento já recebeu um retorno. Atualize a página para acompanhar.';
  end if;

  if coalesce(p_situacao, '') not in ('planejada', 'corrigida', 'impedida')
    or char_length(btrim(coalesce(p_respondido_por, ''))) not between 1 and 120
    or char_length(btrim(coalesce(p_descricao, ''))) not between 1 and 2000
    or char_length(btrim(coalesce(p_responsavel, ''))) not between 1 and 120
    or char_length(coalesce(p_comprovacao, '')) > 1000
    or (p_situacao = 'planejada' and (p_data_acao is null or p_data_acao < hoje))
    or (p_situacao = 'corrigida' and (p_data_acao is null or p_data_acao > hoje)) then
    raise exception 'Confira o nome, a ação, o responsável e a data informada.';
  end if;

  insert into private.respostas_supervisao (
    link_id, vistoria_id, item_id, respondido_por, situacao, descricao, responsavel, data_acao, comprovacao
  ) values (
    link.id, link.vistoria_id, p_item_id, btrim(p_respondido_por), p_situacao,
    btrim(p_descricao), btrim(p_responsavel), p_data_acao, btrim(coalesce(p_comprovacao, ''))
  ) returning * into nova;
  update public.apontamentos
    set situacao = 'em_andamento',
        prazo_supervisao = case when p_situacao = 'corrigida' then prazo_supervisao else p_data_acao end
    where vistoria_id = link.vistoria_id and item_id = p_item_id;
  return private.dados_resposta_supervisao(nova);
end;
$$;

create function public.acompanhar_retorno_supervisao(p_vistoria_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.e_admin() then raise exception 'Apenas a gestão pode consultar os retornos.'; end if;
  return jsonb_build_object(
    'link', (
      select jsonb_build_object('id', l.id, 'supervisor', l.supervisor, 'expira_em', l.expira_em,
        'ativo', l.revogado_em is null and l.expira_em > now())
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

create function public.revisar_retorno_supervisao(p_resposta_id uuid, p_decisao text, p_nota text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  resposta private.respostas_supervisao;
  situacao_atual text;
  nota text := btrim(coalesce(p_nota, ''));
begin
  if not private.e_admin() then raise exception 'Apenas a gestão pode revisar os retornos.'; end if;
  if coalesce(p_decisao, '') not in ('aceito', 'devolvido') or char_length(nota) > 1000
    or (p_decisao = 'devolvido' and nota = '') then
    raise exception 'Informe a decisão e, em caso de devolução, o que deve ser esclarecido.';
  end if;
  select s.* into resposta from private.respostas_supervisao s where s.id = p_resposta_id;
  if not found then raise exception 'Resposta não encontrada.'; end if;

  select a.situacao into situacao_atual from public.apontamentos a
    where a.vistoria_id = resposta.vistoria_id and a.item_id = resposta.item_id for update;
  if not found or situacao_atual = 'resolvido' then
    raise exception 'Este apontamento já foi encerrado ou não está disponível.';
  end if;
  update private.respostas_supervisao
    set decisao = p_decisao, nota_revisao = nota, revisada_em = clock_timestamp(), revisada_por = auth.uid()
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

revoke all on function private.dados_resposta_supervisao(private.respostas_supervisao) from public, anon, authenticated;
revoke all on function public.emitir_link_supervisao(uuid, text, uuid),
  public.revogar_link_supervisao(uuid, uuid), public.acompanhar_retorno_supervisao(uuid),
  public.revisar_retorno_supervisao(uuid, text, text) from public, anon, authenticated;
grant execute on function public.emitir_link_supervisao(uuid, text, uuid),
  public.revogar_link_supervisao(uuid, uuid), public.acompanhar_retorno_supervisao(uuid),
  public.revisar_retorno_supervisao(uuid, text, text) to authenticated;

revoke all on function public.consultar_retorno_supervisao(text),
  public.enviar_retorno_supervisao(text, text, uuid, text, text, text, text, date, text)
  from public, anon, authenticated;
grant execute on function public.consultar_retorno_supervisao(text),
  public.enviar_retorno_supervisao(text, text, uuid, text, text, text, text, date, text)
  to anon, authenticated;

commit;
