begin;

create table public.postos_demax (
  unidade text primary key,
  posto_id uuid unique
);

insert into public.postos_demax (unidade) values
  ('ALMOXARIFADO SAÚDE'), ('CAPS I'), ('CAPS II'), ('CCZ CENTRO DE CONTROLE DE ZOONOSES'),
  ('CEADIM'), ('CECCO'), ('CENTRO MUNICIPAL DE SAÚDE MENTAL'), ('CIAS - PRO MULHER'),
  ('CURE SETOR AMBULÂNCIA'), ('EMESP SAÚDE'), ('PROMEG HIPERDIA'), ('SECRETARIA DA SAÚDE'),
  ('UAPS I'), ('UAPS II'), ('UBS BOTUJURU'), ('UBS BRAZ CUBAS'), ('UBS JARDIM CAMILA'),
  ('UBS JARDIM IVETE'), ('UBS JARDIM MARICÁ'), ('UBS JUNDIAPEBA'), ('UBS MINERAÇÃO'),
  ('UBS PONTE GRANDE'), ('UBS SABAÚNA'), ('UBS SANTA TEREZA'), ('UBS SANTO ÂNGELO'),
  ('UBS VILA DA PRATA'), ('UBS VILA JUNDIAI'), ('UBS VILA MORAES'), ('UBS VILA NATAL'),
  ('UBS VILA NOVA APARECIDA'), ('UBS VILA SUISSA');

alter table public.postos_demax enable row level security;
revoke all on public.postos_demax from public, anon, authenticated;
grant select on public.postos_demax to authenticated;
create policy postos_demax_leitura on public.postos_demax for select to authenticated
  using (exists (select 1 from public.perfis where id = (select auth.uid())));

-- A conferência é registrada junto da finalização e segue a política da vistoria.
alter table public.vistorias add column conferencia_equipe jsonb
  check (conferencia_equipe is null or coalesce(
    estado = 'finalizada'
    and jsonb_typeof(conferencia_equipe) = 'object'
    and conferencia_equipe ->> 'unidade' = unidade
    and jsonb_typeof(conferencia_equipe -> 'postoId') = 'string'
    and jsonb_typeof(conferencia_equipe -> 'dataReferencia') = 'string'
    and jsonb_typeof(conferencia_equipe -> 'colaboradores') = 'array'
    and not jsonb_path_exists(
      conferencia_equipe,
      '$.colaboradores[*] ? (!exists(@.resultado ? (@ == "encontrado" || @ == "nao_encontrado")))'
    ), false));
grant update (conferencia_equipe) on public.vistorias to authenticated;

commit;
