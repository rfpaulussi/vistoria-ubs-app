import { supabase } from './supabase';

export const usaConferenciaEquipe = import.meta.env.VITE_CONFERENCIA_EQUIPE === 'true';

export async function consultarEquipe(unidade) {
  const { data, error } = await supabase.functions.invoke('equipe-posto', { body: { unidade } });
  if (error) {
    const detalhe = await error.context?.json?.().catch(() => null);
    if (detalhe?.codigo === 'POSTO_SEM_VINCULO') {
      throw new Error('Não foi possível identificar um único posto correspondente no Gestão. Peça à administração para conferir o vínculo.');
    }
    throw new Error('Não foi possível consultar a equipe no Gestão. Tente novamente.');
  }
  if (data?.unidade !== unidade || !data.postoId || !Array.isArray(data.colaboradores)) {
    throw new Error('O Gestão retornou uma equipe inválida. Tente novamente.');
  }
  return data;
}

export const resultadosEquipe = {
  encontrado: 'Encontrado no posto',
  nao_encontrado: 'Não encontrado no posto',
};

export function resumoEquipe({ colaboradores }) {
  const encontrados = colaboradores.filter(pessoa => pessoa.resultado === 'encontrado').length;
  const naoEncontrados = colaboradores.filter(pessoa => pessoa.resultado === 'nao_encontrado').length;
  return { encontrados, naoEncontrados, pendentes: colaboradores.length - encontrados - naoEncontrados };
}

export function requerConferencia(pessoa) {
  return pessoa.resultado === 'nao_encontrado' && !(
    pessoa.atestado || pessoa.falta || pessoa.ferias || pessoa.afastado
  );
}
