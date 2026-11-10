begin;

create table public.procedimentos_treinamento (
  id text primary key,
  titulo text not null,
  fonte text not null,
  versao text not null,
  conteudo text not null check (length(conteudo) between 1 and 12000),
  ativo boolean not null default false
);

insert into public.procedimentos_treinamento (id, titulo, fonte, versao, conteudo, ativo) values
  ('diluicao-orientacao-1', 'Diluição de produtos — orientação geral', 'POP Saúde, página 14', 'Piloto 1',
   'Siga as instruções do fabricante no rótulo do produto e utilize somente procedimentos autorizados pela empresa. A fonte não informa proporções ou medidas. Confirme as instruções aplicáveis ao produto antes de orientar a execução.', true),
  ('lixeira-infectante-1', 'Retirada e higienização de lixeira de resíduos infectantes', 'POP Lixeira', 'Piloto 1',
   'Cartaz para o coletor de resíduos infectantes previsto no procedimento da unidade. Aborda identificação do coletor, EPIs, abertura sem contato manual, manuseio cuidadoso e verificação de fechamento e vazamento do saco, encaminhamento ao abrigo correto, higienização do coletor e das mãos. Não reutilizar o saco. A configuração do coletor, do saco e dos EPIs deve ser confirmada conforme o procedimento aplicável no posto.', false);

alter table public.procedimentos_treinamento enable row level security;
revoke all on public.procedimentos_treinamento from public, anon, authenticated;
grant select on public.procedimentos_treinamento to authenticated;
create policy procedimentos_treinamento_leitura on public.procedimentos_treinamento
  for select to authenticated using (
    ativo and exists (select 1 from public.perfis where id = (select auth.uid()))
  );

create function private.assinaturas_treinamento_validas(participantes jsonb, equipe jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(participantes) is distinct from 'array'
    or jsonb_typeof(equipe) is distinct from 'array' then
    return false;
  end if;

  return (
    select count(*) = count(distinct pessoa ->> 'id')
    from jsonb_array_elements(participantes) as lista(pessoa)
  ) and not exists (
    select 1 from jsonb_array_elements(participantes) as lista(pessoa)
    where not coalesce(
      starts_with(pessoa ->> 'assinatura', 'data:image/png;base64,')
      and length(pessoa ->> 'assinatura') between 100 and 80000
      and (pessoa ->> 'assinadaEm') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      and exists (
        select 1 from jsonb_array_elements(equipe) as elenco(colaborador)
        where colaborador ->> 'id' = pessoa ->> 'id'
          and colaborador ->> 'nome' = pessoa ->> 'nome'
      ),
      false
    )
  );
end;
$$;

revoke execute on function private.assinaturas_treinamento_validas(jsonb, jsonb) from public, anon;
grant execute on function private.assinaturas_treinamento_validas(jsonb, jsonb) to authenticated;

alter table public.vistorias add column treinamento jsonb check (
  treinamento is null or coalesce(
    estado = 'finalizada'
    and jsonb_typeof(treinamento) = 'object'
    and length(treinamento ->> 'roteiro') between 1 and 6000
    and length(treinamento ->> 'procedimentoId') > 0
    and jsonb_typeof(treinamento -> 'participantes') = 'array'
    and jsonb_array_length(treinamento -> 'participantes') between 1 and 60
    and private.assinaturas_treinamento_validas(treinamento -> 'participantes', conferencia_equipe -> 'colaboradores')
    and length(treinamento::text) <= 800000,
    false
  )
);
grant update (treinamento) on public.vistorias to authenticated;

commit;
