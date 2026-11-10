insert into public.postos_demax (unidade)
values ('CENTRO POP'), ('NUBEA')
on conflict (unidade) do nothing;
