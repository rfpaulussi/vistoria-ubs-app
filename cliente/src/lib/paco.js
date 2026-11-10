import { supabase } from './supabase';

export const UNIDADE_PACO = 'Paço Municipal de Mogi';
export const usaPilotoPaco = import.meta.env.VITE_PILOTO_PACO === 'true';
const BUCKET = 'paco-evidencias';
const tipos = ['antes', 'depois'];
export const chaveFotoItem = (id, tipo) => 'item-' + id + '-' + tipo;
export const frequencias = {
  conforme: 'Frequência conforme o roteiro',
  fora_do_previsto: 'Frequência fora do previsto',
  nao_verificada: 'Frequência não verificada',
};
export const qualidades = {
  conforme: 'Limpeza conforme',
  precisa_corrigir: 'Limpeza precisa de correção',
  nao_avaliada: 'Qualidade não avaliada',
};
export const acessos = {
  livre: 'Acesso livre',
  autorizado: 'Acesso autorizado',
  aguardando_autorizacao: 'Aguardando autorização',
  agendado: 'Agendamento confirmado',
  aguardando_agendamento: 'Aguardando agendamento',
};

function dados({ data, error }) {
  if (error) throw error;
  return data;
}

export async function carregarRoteiroPaco() {
  return dados(await supabase.from('roteiro_paco').select('rotina').order('id')).map(row => row.rotina);
}

const semAcompanhamento = erro => ['42P01', 'PGRST205'].includes(erro?.code);

export async function carregarVistoriasPaco(inicio, fim, pendencias = false) {
  const resultado = [];
  const pagina = 100;
  let origem = 'acompanhamento_paco';
  for (;;) {
    const offset = resultado.length;
    const consulta = supabase.from(origem).select('*');
    if (pendencias) consulta.gt('total_pendencias', 0);
    else consulta.gte('registrada_em', inicio).lt('registrada_em', fim);
    const resposta = await consulta.order('registrada_em', { ascending: false }).order('id')
      .range(offset, offset + pagina - 1);
    if (!offset && semAcompanhamento(resposta.error) && origem === 'acompanhamento_paco') {
      if (pendencias) throw new Error('A aba Pendências precisa da atualização do banco do Paço.');
      origem = 'vistorias_paco';
      continue;
    }
    const linhas = dados(resposta);
    resultado.push(...linhas);
    if (linhas.length < pagina) return resultado;
  }
}

export async function salvarVistoriaPaco(id, campos, fotos) {
  const visitas = supabase.from('vistorias_paco');
  const colunas = campos.itens ? 'registrada_em,itens' : 'registrada_em';
  const existente = dados(await visitas.select(colunas).eq('id', id).maybeSingle());
  if (existente?.registrada_em) return;
  if (!existente) dados(await visitas.insert({ id, rotina_id: campos.rotina_id }));

  const bucket = supabase.storage.from(BUCKET);
  for (const [chave, foto] of Object.entries(fotos)) {
    if (!foto) continue;
    dados(await bucket.upload(id + '/' + chave, foto, { upsert: true, contentType: 'image/jpeg' }));
  }
  dados(await visitas.update({
    ...campos,
    registrada_em: new Date().toISOString(),
    foto_antes: Boolean(fotos.antes),
    foto_depois: Boolean(fotos.depois),
  }).eq('id', id).is('registrada_em', null).select('id').single());
}

export async function registrarRetornoPaco(vistoriaId, itemId, { id, arquivo }) {
  const caminho = vistoriaId + '/retorno-' + itemId + '-' + id;
  const { error: falhaEnvio } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: 'image/jpeg',
  });
  // A foto pode já estar no bucket se a confirmação anterior falhou.
  const resposta = await supabase.rpc('registrar_retorno_paco', {
    p_vistoria_id: vistoriaId, p_item_id: itemId, p_foto_id: id,
  });
  if (resposta.error && falhaEnvio) throw falhaEnvio;
  dados(resposta);
}

export async function carregarFotosPaco(vistoria) {
  const fotos = tipos.filter(tipo => vistoria['foto_' + tipo]).map(tipo => ({ tipo, chave: tipo }));
  for (const item of vistoria.itens ?? []) {
    for (const tipo of tipos) {
      if (item['foto_' + tipo]) fotos.push({ tipo, itemId: item.id, chave: chaveFotoItem(item.id, tipo) });
    }
    const caminho = vistoria.retornos?.[item.id]?.foto_caminho;
    if (caminho) fotos.push({ tipo: 'depois', itemId: item.id, chave: caminho, caminho });
  }
  if (!fotos.length) return [];
  const links = dados(await supabase.storage.from(BUCKET).createSignedUrls(
    fotos.map(foto => foto.caminho ?? vistoria.id + '/' + foto.chave), 600,
  ));
  return fotos.map((foto, index) => ({ ...foto, url: links[index]?.signedUrl }));
}

export async function prepararFotoPaco(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode();
    const escala = Math.min(1, 1200 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const tela = document.createElement('canvas');
    tela.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    tela.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
    const foto = await new Promise(resolve => tela.toBlob(resolve, 'image/jpeg', 0.75));
    if (!foto) throw new Error('Foto inválida');
    return foto;
  } finally {
    URL.revokeObjectURL(url);
  }
}
