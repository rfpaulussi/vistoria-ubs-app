begin;

insert into public.procedimentos_treinamento (id, titulo, fonte, versao, conteudo, ativo) values
  ('sequencia-limpeza-1', 'Sequência e sentidos da limpeza', 'POP Saúde, páginas 3 e 16', 'Piloto 1',
   'Os princípios gerais apresentados são trabalhar de cima para baixo, da esquerda para a direita, do mais distante para o mais próximo, de dentro para fora e de trás para a frente. Para paredes, tetos e pisos, consulte o sentido específico indicado no material.', true),
  ('paredes-tetos-1', 'Sentido da limpeza de paredes e tetos', 'POP Saúde, páginas 4 e 17', 'Piloto 1',
   'Em paredes, trabalhe de cima para baixo. Em tetos, siga em uma só direção, começando no fundo do ambiente e avançando até a saída.', true),
  ('pisos-salas-1', 'Limpeza de pisos de salas, quartos e enfermarias', 'POP Saúde, páginas 5 e 17', 'Piloto 1',
   'Limpe o piso em sentido único, do fundo do ambiente até a porta de saída. Evite movimentos de ida e volta no trajeto.', true),
  ('pisos-circulacao-1', 'Limpeza e sinalização de áreas de circulação', 'POP Saúde, páginas 5 e 17', 'Piloto 1',
   'Ao limpar pisos de corredores, escadas e halls, sinalize a área e organize o trabalho em duas faixas para permitir a passagem por uma delas.', true),
  ('classificacao-areas-1', 'Classificação das áreas da UBS', 'POP Saúde, páginas 6 a 9', 'Piloto 1',
   'O material diferencia áreas críticas, com maior risco de infecção, áreas semicríticas, com risco de transmissão menor em relação às críticas, e áreas não críticas, sem ocupação ou circulação de pacientes. Use a classificação definida para o ambiente na unidade. O material lista salas de coleta entre os exemplos de mais de uma categoria, portanto não use esse exemplo para definir a classificação do posto.', true),
  ('limpeza-concorrente-1', 'Limpeza concorrente', 'POP Saúde, páginas 10, 11 e 15', 'Piloto 1',
   'A limpeza concorrente é apresentada como desinfecção com o ambiente ocupado. Também pode corresponder à limpeza de rotina em áreas não críticas. O material descreve quando se aplica, sem detalhar a sequência de execução.', true),
  ('limpeza-terminal-1', 'Limpeza terminal', 'POP Saúde, páginas 10, 12 e 15', 'Piloto 1',
   'A limpeza terminal é descrita como desinfecção após a desocupação do ambiente e limpeza profunda em áreas críticas e semicríticas. O material descreve quando se aplica, sem detalhar a sequência de execução.', true);

commit;
