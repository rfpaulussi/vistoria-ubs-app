begin;

alter table public.apontamentos
  add column verificacoes_execucao jsonb not null default '[]'::jsonb;

create function public.verificar_execucao_supervisao(
  p_resposta_id uuid, p_executada boolean, p_fonte text, p_nota text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  plano private.respostas_supervisao;
  apontamento public.apontamentos;
  ultimo_id uuid;
  nota text := btrim(coalesce(p_nota, ''));
  verificacao jsonb;
begin
  if p_executada is null or coalesce(p_fonte, '') not in ('visita', 'informacao')
    or char_length(nota) not between 1 and 1000 then
    raise exception 'Informe o resultado, como verificou e uma observação.';
  end if;

  select s.* into plano from private.respostas_supervisao s where s.id = p_resposta_id;
  if not found or not private.pode_acompanhar_supervisao(plano.vistoria_id) then
    raise exception 'Este apontamento não está disponível para o seu perfil.';
  end if;

  select a.* into apontamento from public.apontamentos a
    where a.vistoria_id = plano.vistoria_id and a.item_id = plano.item_id for update;
  if not found or apontamento.situacao = 'resolvido' then
    raise exception 'Este apontamento já foi encerrado ou não está disponível.';
  end if;

  select s.id into ultimo_id from private.respostas_supervisao s
    where s.vistoria_id = plano.vistoria_id and s.item_id = plano.item_id
    order by s.enviada_em desc, s.id desc limit 1;
  if ultimo_id is distinct from p_resposta_id or plano.situacao <> 'planejada'
    or plano.decisao is distinct from 'aceito' then
    raise exception 'Atualize a vistoria. O plano aceito mudou.';
  end if;

  verificacao := jsonb_build_object(
    'plano_id', plano.id, 'executada', p_executada, 'fonte', p_fonte, 'nota', nota,
    'verificada_em', clock_timestamp(), 'verificada_por', auth.uid(),
    'nome', (select p.nome from public.perfis p where p.id = auth.uid())
  );

  update public.apontamentos
    set situacao = case when p_executada then 'resolvido' else 'em_andamento' end,
        verificacoes_execucao = apontamento.verificacoes_execucao || jsonb_build_array(verificacao)
    where vistoria_id = plano.vistoria_id and item_id = plano.item_id
    returning * into apontamento;
  return to_jsonb(apontamento);
end;
$$;

revoke all on function public.verificar_execucao_supervisao(uuid, boolean, text, text) from public, anon;
grant execute on function public.verificar_execucao_supervisao(uuid, boolean, text, text) to authenticated;

create or replace function public.enviar_retorno_supervisao(
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
  if anterior.situacao = 'planejada' and anterior.decisao = 'aceito' then
    raise exception 'A encarregada vai verificar a execução deste plano.';
  end if;

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

commit;
