import { supabase } from './supabase';

export const situacoesRetorno = {
  planejada: 'Ação planejada',
  corrigida: 'Correção realizada',
  impedida: 'Impedimento',
};

export const dataBr = data => data?.split('-').reverse().join('/') || 'Sem prazo';
export const hoje = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export function somarDias(data, dias) {
  const dia = new Date(data + 'T00:00:00Z');
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

export function prazoDeResposta(situacao, resposta, prazoLink) {
  if (situacao === 'resolvido') return null;
  if (!resposta) return prazoLink;
  return resposta.decisao === 'devolvido' ? resposta.prazo_complemento ?? prazoLink : null;
}

export const dataHoraBr = data => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(data));

export function urlRetorno(token) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.hash = `retorno=` + token;
  return url.href;
}

export async function operacaoSupervisao(funcao, parametros) {
  if (!supabase) throw new Error('O serviço de retorno está indisponível.');
  const { data, error } = await supabase.rpc(funcao, parametros);
  if (error) {
    if (error.code === 'P0001') throw new Error(error.message);
    throw new Error('Não foi possível concluir a operação. Tente novamente.');
  }
  return data;
}

export function statusRetorno(situacao, resposta) {
  if (situacao === 'resolvido') return 'Resolvido';
  if (!resposta) return 'Aguardando resposta';
  if (resposta.decisao === 'devolvido') return 'Complemento solicitado';
  if (!resposta.decisao) return 'Aguardando validação';
  return resposta.situacao === 'impedida' ? 'Impedimento registrado' : 'Plano aceito';
}
