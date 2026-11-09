import { normalizarUnidade } from './unidades.js';

export function chaveUnidade(nome) {
  return (nome ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .trim().replace(/^ubs\s+/, '').replace(/\s+/g, ' ');
}

export function dataISO(valor) {
  const texto = String(valor ?? '');
  const iso = texto.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : '';
}

export function limitePeriodo(periodo, hoje) {
  if (periodo === 'todos' || periodo === 'personalizado') return '';
  const data = new Date(`${hoje}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - (Number(periodo) - 1));
  return data.toISOString().slice(0, 10);
}

export function filtrarHistorico(vistorias, { busca, unidade, inicio, fim, frequencia, nomes }) {
  const termo = chaveUnidade(busca);
  const termoOficial = chaveUnidade(normalizarUnidade(busca));
  const grupos = new Map();
  const correspondencias = vistorias.filter(v => {
    const chave = chaveUnidade(v.ubs);
    const data = dataISO(v.data);
    if (unidade ? chave !== unidade : termo && !chave.includes(termo) && !chave.includes(termoOficial)) return false;
    if ((inicio || fim) && (!data || (inicio && data < inicio) || (fim && data > fim))) return false;
    if (chave) {
      const grupo = grupos.get(chave);
      if (grupo) {
        grupo.total += 1;
        if (data > grupo.ultima) grupo.ultima = data;
      } else {
        grupos.set(chave, { chave, nome: nomes.get(chave) ?? v.ubs.trim(), total: 1, ultima: data });
      }
    }
    return true;
  });
  const unidades = [...grupos.values()].filter(grupo => grupo.total >= frequencia)
    .sort((a, b) => b.total - a.total || b.ultima.localeCompare(a.ultima) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const visitas = correspondencias.filter(v => frequencia === 1 || (grupos.get(chaveUnidade(v.ubs))?.total ?? 0) >= frequencia);
  return { visitas, unidades };
}
