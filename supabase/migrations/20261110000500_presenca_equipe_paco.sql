begin;

alter table public.vistorias_paco add column presentes jsonb not null default '[]'::jsonb;

alter table public.vistorias_paco add constraint vistorias_paco_presentes_validos check (
  jsonb_typeof(presentes) = 'array'
  and not jsonb_path_exists(
    presentes,
    '$[*] ? (!exists(@.id) || @.id.type() != "string" || !exists(@.nome) || @.nome.type() != "string")'
  )
);

grant update (presentes) on public.vistorias_paco to authenticated;

commit;
