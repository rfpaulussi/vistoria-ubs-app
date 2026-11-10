import React, { useEffect, useState } from 'react';
import { Printer, MessageSquare, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DocumentoVistoria from '../components/DocumentoVistoria';
import { resumoEquipe, usaConferenciaEquipe } from '../lib/equipe';
import { buscarConferenciaEquipe, buscarEvidencias, buscarItensRelatorio, buscarTreinamento, buscarVistorias } from '../lib/vistorias';
import { apontamentosWhatsApp, formatarData, formatarNota, tituloPdfVistoria, visitasAnteriores } from '../lib/relatorio';

function itensDaVisita(perguntas, respostas) {
  return perguntas.map(pergunta => {
    const resposta = respostas[pergunta.id];
    const falhou = resposta.status === pergunta.trigger;
    return {
      item_id: pergunta.id, item_titulo: pergunta.label, critico: pergunta.critical,
      resultado: resposta.status === 'na' ? 'nao_se_aplica' : falhou ? 'nao_conforme' : 'conforme',
      observacao: resposta.reason, corrigido_na_visita: Boolean(resposta.corrigidoNaVisita),
      requiresVolante: pergunta.requiresVolante,
    };
  });
}

function fotosDaVisita(perguntas, respostas) {
  return perguntas.flatMap(({ id, label }) => [
    { item_id: id, titulo: label, tipo: 'antes', url: respostas[id].photoBefore },
    { item_id: id, titulo: label, tipo: 'depois', url: respostas[id].photo },
  ].filter(foto => foto.url));
}

async function carregarRelatorio(visita, lista, recente) {
  const dados = await Promise.allSettled([
    lista ?? buscarVistorias(),
    buscarItensRelatorio(visita.id),
    recente ? null : buscarConferenciaEquipe(visita.id),
    recente ? [] : buscarEvidencias(visita.id),
    recente ? null : buscarTreinamento(visita.id),
  ]);
  const [historico, itens, equipe, fotos, treinamento] = dados.map(resultado => resultado.value);
  const indisponiveis = ['histórico', 'apontamentos', 'conferência da equipe', 'evidências', 'treinamento']
    .filter((_, i) => dados[i].status === 'rejected');
  const anteriores = visitasAnteriores(historico ?? [], visita);
  let itensAnteriores = [];
  if (anteriores[0]?.id) {
    try {
      itensAnteriores = await buscarItensRelatorio(anteriores[0].id);
    } catch {
      indisponiveis.push('checklist da visita anterior');
    }
  }
  return { anteriores, itens, equipe, fotos, treinamento, itensAnteriores, indisponiveis };
}

export default function RelatorioScreen({ arquivada, historico, onVoltar }) {
  const { meta, respostas, PERGUNTAS, resetVistoria, perfil, conferencia, treinamentos, vistoriaId } = useApp();
  const [visita] = useState(() => arquivada ?? ({
    id: perfil ? vistoriaId : null,
    ubs: meta.ubs,
    data: meta.dataVistoria,
    dataFinalizacao: perfil ? new Date().toISOString() : null,
    encarregada: meta.encarregada,
    notaVistoria: meta.notaVistoria,
    dataRetorno: meta.dataRetorno,
    consideracoesGerais: meta.consideracoesGerais,
  }));
  const [dados, setDados] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [imprimindo, setImprimindo] = useState(false);
  const recente = !arquivada;
  const tituloPdf = tituloPdfVistoria(visita);

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = tituloPdf;
    return () => { document.title = tituloAnterior; };
  }, [tituloPdf]);

  useEffect(() => {
    if (arquivada) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [arquivada]);

  useEffect(() => {
    let ativo = true;
    carregarRelatorio(visita, historico, recente).then(resultado => {
      if (ativo) setDados(resultado);
    });
    return () => { ativo = false; };
  }, [visita, historico, recente, tentativa]);

  const perguntas = new Map(PERGUNTAS.map((pergunta, ordem) => [pergunta.id, { ...pergunta, ordem }]));
  const acoes = new Map(dados?.itens?.map(item => [item.item_id, item.acao]));
  const itens = recente ? itensDaVisita(PERGUNTAS, respostas).map(item => ({ ...item, acao: acoes.get(item.item_id) }))
    : (dados?.itens ?? []).map(item => ({ ...item, requiresVolante: perguntas.get(item.item_id)?.requiresVolante }))
      .sort((a, b) => (perguntas.get(a.item_id)?.ordem ?? Infinity) - (perguntas.get(b.item_id)?.ordem ?? Infinity));
  const equipe = recente
    ? (usaConferenciaEquipe && perfil && conferencia?.unidade === meta.ubs ? conferencia : null)
    : dados?.equipe;
  const fotos = recente ? fotosDaVisita(PERGUNTAS, respostas) : (dados?.fotos ?? []).map(foto => ({
    ...foto, titulo: foto.respostas?.item_titulo || 'Evidência da vistoria',
  }));

  function compartilharWhatsApp() {
    const resumo = equipe && resumoEquipe(equipe);
    const nota = visita.notaVistoria == null ? 'Não informada' : `${formatarNota(visita.notaVistoria)}/10`;
    const texto = [
      `*RELATÓRIO DE VISTORIA · ${visita.ubs}*`,
      `Data da visita: ${formatarData(visita.data)}`,
      `Encarregada: ${visita.encarregada || 'Não informada'}`,
      `Nota: ${nota}`,
      `Retorno previsto: ${visita.dataRetorno ? formatarData(visita.dataRetorno) : 'A definir'}`,
      ...(resumo ? [`Equipe: ${resumo.encontrados} encontrados e ${resumo.naoEncontrados} não encontrados.`] : []),
      '',
      ...apontamentosWhatsApp(itens, visita.falhas),
      ...(visita.consideracoesGerais ? ['', '*Considerações*', visita.consideracoesGerais] : []),
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  }

  async function imprimir() {
    setImprimindo(true);
    const imagens = [...document.querySelectorAll('#relatorio-pdf img')];
    await Promise.allSettled(imagens.map(imagem => imagem.decode()));
    window.print();
    setImprimindo(false);
  }

  function tentarNovamente() {
    setDados(null);
    setTentativa(valor => valor + 1);
  }

  return (
    <main className="app-content field-content report-screen">
      {!dados && <p className="field-card text-sm print:hidden" role="status">Preparando dados do relatório…</p>}
      {dados?.indisponiveis.length > 0 && <button type="button" className="app-secondary mb-3 print:hidden"
        onClick={tentarNovamente}>Tentar carregar dados novamente</button>}
      {(dados || recente) && <DocumentoVistoria visita={visita} itens={itens} equipe={equipe} fotos={fotos}
        treinamento={recente ? treinamentos : dados?.treinamento}
        anteriores={dados?.anteriores ?? []} itensAnteriores={dados?.itensAnteriores ?? []}
        indisponiveis={dados?.indisponiveis} />}
      <div className="report-actions print:hidden">
        <button type="button" onClick={imprimir} disabled={!dados || imprimindo} className="app-primary flex-1">
          <Printer size={17} aria-hidden="true" /> {imprimindo ? 'Preparando…' : 'PDF'}
        </button>
        <button type="button" onClick={compartilharWhatsApp} disabled={!dados} className="app-secondary flex-1">
          <MessageSquare size={17} aria-hidden="true" /> WhatsApp
        </button>
        <button type="button" onClick={onVoltar ?? resetVistoria} className="app-secondary flex-1">
          <ArrowLeft size={17} aria-hidden="true" /> {arquivada ? 'Histórico' : 'Nova'}
        </button>
      </div>
    </main>
  );
}
