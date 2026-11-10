begin;

alter table public.procedimentos_treinamento add column fonte_url text
  check (fonte_url is null or starts_with(fonte_url, 'https://'));

insert into public.procedimentos_treinamento (id, titulo, fonte, versao, conteudo, ativo, fonte_url) values
  ('contaminacao-biologica-1', 'Derramamento biológico e matéria orgânica', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, seções 7.4 e 7.4.1', 'Referência técnica 1',
   'O manual aborda superfícies contaminadas por sangue ou fluidos corporais. O procedimento depende da superfície, do local e da quantidade de material. A sequência geral é remover a matéria orgânica, limpar e depois desinfetar. Antes da execução, confirme a sinalização, os EPIs, o produto, a diluição, o tempo de contato e o descarte previstos no procedimento aprovado para a unidade. Esta orientação é específica para material biológico. Para produto químico, consulte o procedimento de emergência aplicável ao produto.', true,
   'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf'),
  ('superficies-alto-toque-1', 'Higienização de superfícies de alto toque', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, capítulo 7', 'Referência técnica 1',
   'Identifique as superfícies manuseadas com frequência, como maçanetas, interruptores e telefones, e assegure sua cobertura na rotina de higienização da unidade. Confira os pontos de contato de cada ambiente. Siga o procedimento local para frequência, produto compatível e critérios de desinfecção.', true,
   'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf#page=63'),
  ('segregacao-residuos-1', 'Segregação e acondicionamento de resíduos', 'Anvisa · RDC nº 222/2018 comentada, arts. 11 e 86 e Anexo I; NR-32, item 32.2.4.14', 'Referência técnica 1',
   'Os resíduos devem ser separados no local e no momento em que são gerados, conforme o risco e o grupo. Diferencie o grupo A, com possível risco biológico, o grupo D, de resíduos comuns, e o grupo E, de perfurocortantes. O descarte de perfurocortantes cabe a quem os utilizou e deve ocorrer em recipiente apropriado, rígido e identificado. Confira a identificação e o acondicionamento previstos no PGRSS da unidade. Em caso de descarte inadequado, siga o fluxo de comunicação da unidade.', true,
   'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/rdc-222-de-marco-de-2018-comentada.pdf/@@download/file'),
  ('transporte-residuos-infectantes-1', 'Coleta e transporte interno de resíduos infectantes', 'Anvisa · RDC nº 222/2018 comentada, arts. 12 a 17 e 25 a 26', 'Referência técnica 1',
   'Confira a identificação, a integridade e o fechamento do acondicionamento conforme o PGRSS da unidade. O transporte interno segue rota e horários definidos pelo serviço, em coletor identificado e adequado para essa finalidade. Antes da execução, confirme no PGRSS os EPIs, os coletores, os horários, a rota e o local de armazenamento aplicáveis ao posto.', true,
   'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/rdc-222-de-marco-de-2018-comentada.pdf/@@download/file');

commit;
