begin;

insert into public.procedimentos_treinamento (id, titulo, fonte, versao, conteudo, ativo, fonte_url) values
  ('abrigo-residuos-organizacao-1', 'Organização do abrigo de resíduos', 'Anvisa · RDC nº 222/2018 comentada, arts. 22, 29, 31, 34 e 35', 'Referência técnica 1',
   'Identifique se o local funciona como abrigo temporário, expurgo compartilhado ou abrigo externo, conforme o PGRSS do posto. Confira a identificação do local e dos coletores e organize os resíduos conforme o fluxo e a separação definidos para o abrigo. No abrigo externo, o grupo D tem ambiente exclusivo, separado dos grupos A e E. Mantenha o acesso para a coleta e siga a rotina de higienização aprovada pela unidade. Comunique problemas de infraestrutura, vazamentos ou odores persistentes pelo fluxo local. Confirme a rotina e os EPIs aplicáveis no PGRSS antes de orientar a execução.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/rdc-222-de-marco-de-2018-comentada.pdf/@@download/file'),

  ('epi-limpeza-1', 'Uso, retirada e conservação dos EPIs na limpeza', 'Ministério do Trabalho e Emprego · NR-32, itens 32.2.4.7 e 32.8.1', 'Referência técnica 1',
   'Antes da atividade, confira os EPIs definidos para a tarefa no procedimento da unidade e verifique a integridade e o ajuste. Demonstre como colocar, usar e retirar os EPIs segundo a orientação da empresa, evitando contato com as partes contaminadas. Higienize as mãos após retirar as luvas. Encaminhe os EPIs reutilizáveis para higienização e guarda conforme o procedimento. Comunique falta, dano ou necessidade de substituição à supervisão antes de iniciar a tarefa.',
   true, 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-32-atualizada-2023.pdf'),

  ('higienizacao-lixeiras-1', 'Higienização de lixeiras e reposição do saco', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, seção 7.3.1.4, e RDC nº 222/2018', 'Referência técnica 1',
   'Identifique o coletor e confirme no PGRSS qual acondicionamento e fluxo se aplicam ao resíduo. Depois da retirada conforme o fluxo local, higienize e seque o coletor pelo procedimento da unidade, incluindo as partes externas previstas na rotina. Instale o saco indicado para o grupo de resíduo e confira o fechamento da tampa. Se o pedal ou a tampa estiver com defeito, comunique a manutenção. Em caso de resíduo infectante, siga o procedimento específico da unidade para retirada e encaminhamento.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf/@@download/file#page=68'),

  ('higienizacao-materiais-limpeza-1', 'Higienização e guarda de materiais de limpeza', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, capítulos 6 e 7', 'Referência técnica 1',
   'Ao terminar a tarefa, encaminhe panos e refis usados para o processamento definido pela unidade. Descarte a água dos baldes no local indicado. Higienize, seque e guarde baldes, rodos, mops e carrinhos conforme a rotina local. Mantenha materiais limpos separados dos usados. Comunique equipamentos danificados para avaliação ou substituição.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf/@@download/file#page=52'),

  ('rotulagem-produtos-quimicos-1', 'Rotulagem de produtos químicos de limpeza', 'Ministério do Trabalho e Emprego · NR-32, itens 32.3.1 a 32.3.3 e 32.3.7', 'Referência técnica 1',
   'Mantenha legível o rótulo original. Para produtos manipulados ou fracionados conforme o procedimento autorizado, confira a etiqueta com nome, composição, concentração, datas de envase e validade e identificação da pessoa responsável. Preserve a identificação ao longo do uso e siga a vedação à reutilização de embalagens de produtos químicos. Se o rótulo estiver ausente, ilegível ou incompatível com o conteúdo, suspenda o uso e comunique a supervisão para encaminhamento.',
   true, 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-32-atualizada-2023.pdf#page=6'),

  ('limpeza-ventiladores-1', 'Limpeza externa de ventiladores acessíveis', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, capítulo 4, e manual do equipamento', 'Referência técnica 1',
   'Confira se o ventilador faz parte da rotina autorizada, se está acessível a partir do piso e se o manual do modelo prevê limpeza externa pelo usuário. Confirme no procedimento local e no manual como desligar o equipamento e quais partes e métodos de limpeza são permitidos. Limite a orientação de campo às superfícies externas acessíveis, mantendo o motor e as conexões protegidos de líquidos. Para desmontagem, acesso a partes internas, equipamento fixo fora de alcance ou defeito, encaminhe ao setor responsável.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf/@@download/file#page=26'),

  ('higienizacao-papeleiras-1', 'Limpeza e abastecimento de dispensadores de papel', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, seção 7.3.1.4', 'Referência técnica 1',
   'Inclua o dispensador na limpeza do ambiente conforme a rotina local. Antes de abastecer, confira se o dispensador está limpo e seco. Manuseie o refil com as mãos higienizadas, mantenha o papel protegido de umidade e confira a saída após fechar o dispensador. Registre a falta de refil, a quantidade insuficiente de dispensadores ou problemas no mecanismo pelo fluxo operacional do posto.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf/@@download/file#page=68'),

  ('higienizacao-saboneteiras-1', 'Higienização e abastecimento de saboneteiras', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, seção 9.3', 'Referência técnica 1',
   'Identifique se o dispensador utiliza refil descartável ou reservatório reutilizável. Para refil descartável, faça a troca conforme as instruções do fabricante e a rotina local. Para reservatório reutilizável, retire o produto remanescente e siga o procedimento da unidade para limpeza e secagem antes do reabastecimento. Evite completar um reservatório com produto residual. Confira o funcionamento e comunique falhas no mecanismo ou falta de insumo.',
   true, 'https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/servicosdesaude/publicacoes/manual-de-limpeza-e-desinfeccao-de-superficies.pdf/@@download/file#page=94'),

  ('limpeza-vidros-acessiveis-1', 'Limpeza de vidros acessíveis a partir do piso', 'Anvisa · Manual de Limpeza e Desinfecção de Superfícies, capítulo 7, e HU Brasil · POP CCIH 009, seção 12.6', 'Referência técnica 1',
   'Avalie se a face do vidro está íntegra e pode ser alcançada com segurança a partir do piso. Organize e sinalize a área conforme a rotina do posto. Use os materiais e o produto compatível previstos no procedimento da unidade. Limpe a superfície acessível e confira se ficaram resíduos ou marcas. Encaminhe ao setor responsável vidros trincados, faces externas com risco de queda ou pontos que exijam subir ou se projetar para fora.',
   true, 'https://www.gov.br/hubrasil/pt-br/hospitais-universitarios/regiao-nordeste/huab-ufrn/documentos-institucionais/arquivos-documentos-institucionais-geral/pop-ccih-009-higienizacao-hospitalar-padrao-ebserh.pdf/@@download/file'),

  ('derramamento-quimico-comunicacao-1', 'Derramamento químico: reconhecimento e comunicação', 'Ministério do Trabalho e Emprego · NR-32, itens 32.3.4.1.1, 32.3.6.1.1 e 32.8.1', 'Referência técnica 1',
   'Use o treinamento para localizar o procedimento de emergência da unidade, a ficha de segurança do produto e os contatos responsáveis. Em caso de derramamento, mantenha distância, evite a exposição de outras pessoas e acione o fluxo de emergência do posto. Informe o local e a identificação do produto apenas quando isso puder ser feito com segurança. A contenção e a limpeza dependem do produto e do procedimento aprovado e cabem à equipe designada e capacitada. Faça a verificação com um cenário simulado, sem manipular o produto.',
   true, 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-32-atualizada-2023.pdf#page=7')
on conflict (id) do nothing;

commit;

select count(*) as temas_ativos
from public.procedimentos_treinamento
where ativo;
