import { supabase } from './supabase';
import { buscarVistorias as buscarSheets } from './sheets';
import { normalizarUnidade } from './unidades';

const BUCKET = 'vistoria-evidencias';

function resultado({ status }, pergunta) {
  if (status === 'na') return 'nao_se_aplica';
  return status === pergunta.trigger ? 'nao_conforme' : 'conforme';
}

function conferir({ data, error }) {
  if (error) throw error;
  return data;
}

export async function buscarVistorias() {
  if (!supabase) return (await buscarSheets()).map(v => ({ ...v, ubs: normalizarUnidade(v.ubs) }));
  const visitas = [];
  const pagina = 100;
  for (let inicio = 0; ; inicio += pagina) {
    const linhas = conferir(await supabase.from('vistorias')
      .select('id, unidade, encarregada, data_vistoria, nota, data_retorno, observacoes, finalizada_em, falhas_legado, respostas(item_titulo, observacao)')
      .eq('estado', 'finalizada')
      .eq('respostas.resultado', 'nao_conforme')
      .order('data_vistoria').order('finalizada_em').order('id')
      .range(inicio, inicio + pagina - 1));
    visitas.push(...linhas.map(v => ({
      id: v.id,
      ubs: normalizarUnidade(v.unidade),
      encarregada: v.encarregada,
      data: v.data_vistoria,
      notaVistoria: v.nota,
      dataRetorno: v.data_retorno,
      consideracoesGerais: v.observacoes,
      dataFinalizacao: v.finalizada_em,
      falhas: v.falhas_legado ?? v.respostas.map(r =>
        `${r.item_titulo}: ${r.observacao || 'Sem observação'}`).join(' | '),
    })));
    if (linhas.length < pagina) return visitas;
  }
}

async function enviarFotos(id, perguntas, respostas) {
  const bucket = supabase.storage.from(BUCKET);
  const fotos = [];
  for (const { id: item } of perguntas) {
    for (const [tipo, foto] of [['antes', respostas[item].photoBefore], ['depois', respostas[item].photo]]) {
      if (!foto) continue;
      const arquivo = await (await fetch(foto)).blob();
      const hash = await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer());
      const chave = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      const caminho = `${id}/${item}-${tipo}-${chave}.jpg`;
      const upload = await bucket.upload(caminho, arquivo, { contentType: 'image/jpeg' });
      const duplicado = ['Duplicate', 'ResourceAlreadyExists', '409'].includes(upload.error?.statusCode)
        || ['Duplicate', 'ResourceAlreadyExists'].includes(upload.error?.error)
        || upload.error?.status === 409;
      if (!duplicado) conferir(upload);
      fotos.push({ vistoria_id: id, item_id: item, caminho, tipo });
    }
  }

  if (fotos.length) conferir(await supabase.from('evidencias').upsert(fotos));
  const registradas = conferir(await supabase.from('evidencias').select('caminho').eq('vistoria_id', id));
  const atuais = new Set(fotos.map(foto => foto.caminho));
  const obsoletas = registradas.map(foto => foto.caminho).filter(caminho => !atuais.has(caminho));
  if (obsoletas.length) {
    conferir(await bucket.remove(obsoletas));
    conferir(await supabase.from('evidencias').delete().in('caminho', obsoletas));
  }
}

export async function salvarNoSupabase(id, meta, perguntas, respostas, conferencia, treinamentos) {
  const campos = {
    unidade: meta.ubs.trim(),
    encarregada: meta.encarregada.trim(),
    data_vistoria: meta.dataVistoria,
    nota: meta.notaVistoria,
    data_retorno: meta.dataRetorno || null,
    observacoes: meta.consideracoesGerais,
  };
  const existente = conferir(await supabase.from('vistorias').select('estado').eq('id', id).maybeSingle());
  if (existente?.estado === 'finalizada') return false;
  if (existente) conferir(await supabase.from('vistorias').update(campos).eq('id', id).select('id').single());
  else conferir(await supabase.from('vistorias').insert({ id, ...campos }));

  conferir(await supabase.from('respostas').upsert(perguntas.map(pergunta => {
    const resposta = respostas[pergunta.id];
    const status = resultado(resposta, pergunta);
    return {
      vistoria_id: id,
      item_id: pergunta.id,
      item_titulo: pergunta.label,
      resultado: status,
      critico: pergunta.critical,
      observacao: resposta.reason,
      corrigido_na_visita: status === 'nao_conforme' && Boolean(resposta.corrigidoNaVisita),
    };
  })));
  await enviarFotos(id, perguntas, respostas);
  const finalizacao = { estado: 'finalizada', finalizada_em: new Date().toISOString() };
  if (conferencia) finalizacao.conferencia_equipe = conferencia;
  if (treinamentos.length) finalizacao.treinamento = treinamentos.length === 1 ? treinamentos[0] : treinamentos;
  conferir(await supabase.from('vistorias')
    .update(finalizacao)
    .eq('id', id).eq('estado', 'rascunho').select('id').single());
  return true;
}

export async function buscarItensRelatorio(id) {
  if (!supabase || !id) return [];
  const [respostas, apontamentos] = await Promise.all([
    supabase.from('respostas')
      .select('item_id, item_titulo, resultado, critico, observacao, corrigido_na_visita').eq('vistoria_id', id),
    supabase.from('apontamentos')
      .select('item_id, situacao, prazo, prazo_supervisao, orientacao, responsavel_id, responsavel:perfis(nome)').eq('vistoria_id', id),
  ]);
  const acoes = new Map(conferir(apontamentos).map(item => [item.item_id, { ...item, prazo: item.prazo ?? item.prazo_supervisao }]));
  return conferir(respostas).map(item => ({ ...item, acao: acoes.get(item.item_id) }));
}

export async function buscarConferenciaEquipe(id) {
  if (!supabase || !id) return null;
  const consulta = await supabase.from('vistorias').select('conferencia_equipe').eq('id', id).single();
  // Projetos anteriores à migração da equipe ainda podem gerar relatórios.
  if (consulta.error?.code === '42703') return null;
  return conferir(consulta).conferencia_equipe;
}

export async function buscarTreinamento(id) {
  if (!supabase || !id) return null;
  const consulta = await supabase.from('vistorias').select('treinamento').eq('id', id).single();
  if (consulta.error?.code === '42703') return null;
  return conferir(consulta).treinamento;
}

export async function buscarEvidencias(id) {
  if (!supabase || !id) return [];
  const linhas = conferir(await supabase.from('evidencias')
    .select('caminho, item_id, tipo, respostas(item_titulo)').eq('vistoria_id', id).order('tipo'));
  if (!linhas.length) return [];
  const urls = conferir(await supabase.storage.from(BUCKET)
    .createSignedUrls(linhas.map(linha => linha.caminho), 600));
  return linhas.map((linha, i) => ({ ...linha, url: urls[i]?.signedUrl }));
}
