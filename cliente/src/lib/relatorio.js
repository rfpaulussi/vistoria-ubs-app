import { dataISO, chaveUnidade } from './filtrosHistorico.js';

export const resultados = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  nao_se_aplica: 'Não se aplica',
};

export function agruparApontamentos(itens) {
  const falhas = itens.filter(item => item.resultado === 'nao_conforme');
  return {
    total: falhas.length,
    pendentes: falhas.filter(item => !item.corrigido_na_visita && item.acao?.situacao !== 'resolvido'),
    corrigidos: falhas.filter(item => item.corrigido_na_visita),
    resolvidos: falhas.filter(item => !item.corrigido_na_visita && item.acao?.situacao === 'resolvido'),
  };
}

export function apontamentosWhatsApp(itens, falhasLegado) {
  if (!itens.length) return ['*Apontamentos*', falhasLegado || 'Dados detalhados indisponíveis.'];

  const { total, pendentes, corrigidos, resolvidos } = agruparApontamentos(itens);
  if (!total) return ['*Apontamentos*', 'Nenhuma não conformidade registrada.'];
  return [
    `*Apontamentos · ${total} ${total === 1 ? 'não conformidade' : 'não conformidades'}*`,
    ...[
      ['Pendentes de ação', pendentes],
      ['Corrigidos na visita', corrigidos],
      ['Resolvidos pela gestão', resolvidos],
    ].flatMap(([rotulo, grupo]) => grupo.length ? [
      '',
      `*${rotulo} (${grupo.length})*`,
      ...grupo.map(item => `• ${item.item_titulo}: ${item.observacao?.trim() || 'Sem observação'}`),
    ] : []),
  ];
}

export function tituloPdfVistoria({ ubs, data }) {
  const posto = (ubs ?? '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${posto || 'Vistoria UBS'} - ${dataISO(data) || 'data não informada'}`;
}

export function visitasAnteriores(visitas, atual, limite = 5) {
  const unidade = chaveUnidade(atual.ubs);
  const dataAtual = dataISO(atual.data);
  if (!unidade || !dataAtual) return [];

  return visitas.filter(visita => {
    if (visita === atual || (atual.id && visita.id === atual.id) || chaveUnidade(visita.ubs) !== unidade) return false;
    const data = dataISO(visita.data);
    if (!data) return false;
    if (data !== dataAtual) return data < dataAtual;
    const hora = Date.parse(visita.dataFinalizacao);
    const horaAtual = Date.parse(atual.dataFinalizacao);
    return Number.isFinite(hora) && Number.isFinite(horaAtual) && hora < horaAtual;
  }).sort((a, b) => dataISO(b.data).localeCompare(dataISO(a.data))
    || ((Date.parse(b.dataFinalizacao) || 0) - (Date.parse(a.dataFinalizacao) || 0)))
    .slice(0, limite);
}

export function compararItens(itens, anteriores) {
  const porId = new Map(anteriores.map(item => [item.item_id, item.resultado]));
  return {
    melhorias: itens.filter(item => item.resultado === 'conforme' && porId.get(item.item_id) === 'nao_conforme'),
    recorrencias: itens.filter(item => item.resultado === 'nao_conforme' && porId.get(item.item_id) === 'nao_conforme'),
    novasFalhas: itens.filter(item => item.resultado === 'nao_conforme' && porId.get(item.item_id) === 'conforme'),
  };
}

export function formatarData(valor) {
  const data = dataISO(valor);
  return data ? data.split('-').reverse().join('/') : 'Não informada';
}

export function formatarNota(valor) {
  return valor == null || valor === '' ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
