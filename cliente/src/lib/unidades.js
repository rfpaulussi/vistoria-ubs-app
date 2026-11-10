// Os blocos mantêm os índices do roteiro salvo antes da padronização.
const blocosAnteriores = [
  'UBS PONTE GRANDE', 'UBS BRAZ CUBAS', 'UBS VILA SUISSA', 'CECCO',
  'UBS BOTUJURU', 'UBS VILA MORAES', 'UBS VILA JUNDIAI', 'CCZ CENTRO DE CONTROLE DE ZOONOSES',
  'UBS JARDIM CAMILA', 'UBS JARDIM IVETE', 'UBS SANTA TEREZA', 'EMESP SAÚDE',
  'UBS MINERAÇÃO', 'UBS JUNDIAPEBA', ['CURE SETOR AMBULÂNCIA', 'CEADIM'],
  [], // CAPS INFANTIL/CIAS
  'CAPS II', 'UBS SABAÚNA', 'UAPS I', 'UAPS II',
  'SECRETARIA DA SAÚDE', 'PROMEG HIPERDIA',
  [], // PRÓ HIPER
  'ALMOXARIFADO SAÚDE', 'CIAS - PRO MULHER', 'UBS SANTO ÂNGELO', 'UBS VILA NOVA APARECIDA',
  'CENTRO POP',
  'UBS VILA DA PRATA', 'UBS VILA NATAL',
];

export const ROTEIRO_UNIDADES = [
  ...blocosAnteriores.flat(),
  'CAPS I', 'CENTRO MUNICIPAL DE SAÚDE MENTAL', 'UBS JARDIM MARICÁ', 'NUBEA',
];
export const UNIDADES = [...ROTEIRO_UNIDADES].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function atualizarIndiceRoteiro(indiceAnterior) {
  // Um bloco removido passa a apontar para a próxima unidade do roteiro.
  return blocosAnteriores.slice(0, indiceAnterior).flat().length;
}

function chave(nome) {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim().replace(/\s+/g, ' ');
}

const nomesOficiais = new Map(UNIDADES.map(nome => [chave(nome), nome]));
const nomesAnteriores = new Map([
  ['ZOONOZES', 'CCZ CENTRO DE CONTROLE DE ZOONOSES'],
  ['UBS SANTA TERESA', 'UBS SANTA TEREZA'],
  ['EMESP', 'EMESP SAÚDE'],
  ['CAPS 2', 'CAPS II'],
  ['UAPS 1', 'UAPS I'],
  ['UAPS 2', 'UAPS II'],
  ['SECRETARIA DE SAUDE', 'SECRETARIA DA SAÚDE'],
  ['PROMEG', 'PROMEG HIPERDIA'],
  ['PRO MULHER', 'CIAS - PRO MULHER'],
  ['UBS VILA APARECIDA', 'UBS VILA NOVA APARECIDA'],
]);

export function normalizarUnidade(nome) {
  const id = chave(nome ?? '');
  return nomesOficiais.get(id) ?? nomesAnteriores.get(id) ?? nome;
}
