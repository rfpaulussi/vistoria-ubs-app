const perguntas = {
  piso: 'O piso, os cantos e os rodapés estão sem resíduos, pó ou marcas visíveis?',
  tapetes: 'Os tapetes vistoriados estão sem resíduos visíveis?',
  mobiliario: 'Mesas, bancadas e cadeiras estão sem pó, resíduos ou marcas?',
  estofados: 'Poltronas, sofás e outros estofados vistoriados estão sem pó ou manchas visíveis?',
  portas: 'Portas, maçanetas e divisórias vistoriadas estão sem marcas ou sujeira visível?',
  paredes: 'Paredes e teto vistoriados estão sem teias ou acúmulo visível de sujeira?',
  vasos: 'Os vasos sanitários e assentos estão sem sujeira visível?',
  banheiro: 'Pias, bancadas e espelhos dos banheiros estão limpos?',
  ralos: 'O piso e o entorno dos ralos estão sem resíduos?',
  insumos: 'Há papel higiênico, papel-toalha e sabonete nos pontos de reposição previstos?',
  pia: 'A pia da copa está sem resíduos de alimentos e com a bancada limpa?',
  mesas: 'Mesas e superfícies de apoio estão sem resíduos de alimentos ou marcas?',
  geladeira: 'A limpeza da geladeira prevista para sexta-feira às 14h foi verificada?',
  bancadas: 'As bancadas de atendimento estão sem resíduos ou marcas visíveis?',
  toque: 'Maçanetas, corrimãos ou outros pontos de toque previstos no roteiro estão limpos?',
  botoeiras: 'Botoeiras, portas e superfícies internas do elevador estão sem marcas visíveis?',
  trilhos: 'Trilhos e peitoris vistoriados estão sem acúmulo visível de sujeira?',
  vidros: 'Os vidros do trecho vistoriado estão sem manchas ou marcas visíveis?',
  circulacao: 'A área de circulação vistoriada está sem poeira ou resíduos no piso?',
  externas: 'O acesso, a escadaria ou a garagem vistoriada estão livres de resíduos?',
  filtros: 'A área ao redor do filtro de água está sem resíduos ou marcas visíveis?',
  tanque: 'O tanque e as superfícies de apoio do depósito estão sem resíduos?',
  dml: 'O depósito de material de limpeza está limpo e com os itens organizados?',
  ventiladores: 'Após o atendimento agendado, as partes visíveis do ventilador estão sem acúmulo de pó?',
  vestiario: 'As áreas de troca e as superfícies de apoio estão limpas?',
  pontos: 'As superfícies de uso frequente indicadas no roteiro estão sem sujeira visível?',
};

const tipos = {
  gabinete: ['piso', 'tapetes', 'mobiliario', 'estofados', 'portas', 'vidros'],
  banheiro: ['vasos', 'banheiro', 'ralos', 'insumos'],
  copa: ['piso', 'mesas', 'pia', 'portas'],
  atendimento: ['piso', 'bancadas', 'mobiliario', 'toque'],
  circulacao: ['circulacao', 'toque', 'portas'],
  vidro: ['vidros', 'trilhos', 'paredes'],
  externa: ['externas', 'vidros', 'paredes'],
  elevador: ['piso', 'botoeiras', 'trilhos'],
  dml: ['piso', 'dml', 'tanque', 'portas'],
  ventilador: ['ventiladores'],
  vestiario: ['piso', 'vestiario', 'portas'],
  sala: ['piso', 'mobiliario', 'portas', 'paredes', 'pontos'],
};

const regras = [
  [/BANHEIR/, 'banheiro'],
  [/VENTILADOR/, 'ventilador'],
  [/ELEVADOR/, 'elevador'],
  [/DML/, 'dml'],
  [/VESTIÁRIO/, 'vestiario'],
  [/COZINHA|COPA|CONVIVÊNCIA|DESCANSO - RESTAURANTE/, 'copa'],
  [/^VIDROS|^FACHADAS FRENTE TÉRREO/, 'vidro'],
  [/FACHADA|GARAGEM|ESCADARIA/, 'externa'],
  [/RECEPÇÃO|ATENDIMENTO|BANCADA DE ATEND/, 'atendimento'],
  [/CORREDOR/, 'circulacao'],
  [/GABINETE|REUNIÃO|AUDITÓRIO/, 'gabinete'],
];

const diaHora = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', weekday: 'short', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
});

export const resultadosItens = {
  conforme: 'Conforme',
  precisa_corrigir: 'Precisa corrigir',
  nao_verificado: 'Não verificado',
  nao_se_aplica: 'Não se aplica',
};

export function perguntasDoSetor(rotina, agora = new Date()) {
  if (!rotina) return [];
  const tipo = regras.find(([expressao]) => expressao.test(rotina.local))?.[1] ?? 'sala';
  const itens = [...tipos[tipo]];
  if (rotina.local.includes('FILTRO DE ÁGUA')) itens.push('filtros');
  if (rotina.tarefas_adicionais?.some(tarefa => tarefa.atividade === 'Limpeza da geladeira')) {
    const partes = Object.fromEntries(diaHora.formatToParts(agora).map(({ type, value }) => [type, value]));
    if (partes.weekday === 'Fri' && partes.hour + ':' + partes.minute >= '14:00') itens.push('geladeira');
  }
  return itens.map(id => ({ id, pergunta: perguntas[id] }));
}

export function qualidadeDosItens(itens) {
  if (itens.some(item => item.resultado === 'precisa_corrigir')) return 'precisa_corrigir';
  if (itens.some(item => item.resultado === 'conforme')) return 'conforme';
  return 'nao_avaliada';
}
