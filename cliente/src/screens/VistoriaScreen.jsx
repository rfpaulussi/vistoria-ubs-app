import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ClipboardCheck, Loader2, Send, ShieldCheck, Sparkles, Trash2, Users, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UNIDADES } from '../lib/unidades';
import BentoCard from '../components/BentoCard';
import CardModal from '../components/CardModal';
import ConferenciaEquipe from '../components/ConferenciaEquipe';
import RevisaoIA, { usaRevisaoIA } from '../components/RevisaoIA';
import TreinamentoVistoria, { usaTreinamento } from '../components/TreinamentoVistoria';
import { salvarVistoria } from '../lib/sheets';
import { salvarFirestore } from '../lib/firebase';
import { salvarNoSupabase } from '../lib/vistorias';
import { resumoEquipe, usaConferenciaEquipe } from '../lib/equipe';

const secoes = [
  ['Equipe e EPIs', 0, 2, ShieldCheck, 'equipe'],
  ['Limpeza e higienização', 2, 8, Sparkles, 'limpeza'],
  ['Resíduos', 8, 13, Trash2, 'residuos'],
  ['Equipamentos e instalações', 13, 21, Wrench, 'equipamentos'],
  ['Acompanhamento da equipe', 21, undefined, Users, 'acompanhamento'],
];

export default function VistoriaScreen() {
  const {
    meta, updateMeta, respostas, updateResposta, contadores, PERGUNTAS, setScreen,
    perfil, vistoriaId, resetVistoria, conferencia, setConferencia, treinamentos, setTreinamentos,
  } = useApp();
  const [modalId, setModalId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [indice, setIndice] = useState(() => {
    const pendente = PERGUNTAS.findIndex(item => respostas[item.id].status === 'pending');
    return pendente === -1 ? PERGUNTAS.length : pendente;
  });
  const [irPara, setIrPara] = useState(null);
  const secaoAtual = secoes.findIndex(([, inicio, fim]) => indice >= inicio && indice < (fim ?? PERGUNTAS.length));
  const revisao = secaoAtual === -1;
  const [titulo, inicio, fim, Icone, tema] = secoes[secaoAtual] ?? ['Avaliação final', 0, 0, ClipboardCheck, 'revisao'];
  const perguntasSecao = revisao ? [] : PERGUNTAS.slice(inicio, fim);
  const pergunta = PERGUNTAS[indice];
  const resposta = pergunta && respostas[pergunta.id];
  const respondidasSecao = perguntasSecao.filter(item => respostas[item.id].status !== 'pending').length;
  const unidadeValida = UNIDADES.includes(meta.ubs);
  const conferirEquipe = Boolean(perfil && usaConferenciaEquipe);
  const equipeDaUnidade = conferencia?.unidade === meta.ubs ? conferencia : null;
  const equipeCompleta = !conferirEquipe || (equipeDaUnidade && resumoEquipe(equipeDaUnidade).pendentes === 0);
  const identificacaoCompleta = unidadeValida && meta.encarregada.trim() && meta.notaVistoria !== null;
  const treinamentoCompleto = treinamentos.every(item => item.participantes.length > 0);
  const canFinish = contadores.pending === 0 && identificacaoCompleta && equipeCompleta && treinamentoCompleto;

  useEffect(() => {
    if (irPara === null) return;
    const destino = document.getElementById('etapa-vistoria');
    destino?.focus({ preventScroll: true });
    destino?.scrollIntoView({ block: 'start' });
    setIrPara(null);
  }, [irPara]);

  function abrir(indiceNovo) {
    setIndice(indiceNovo);
    setIrPara(indiceNovo);
  }

  function verPendentes() {
    const pendente = PERGUNTAS.findIndex(item => respostas[item.id].status === 'pending');
    if (pendente >= 0) abrir(pendente);
  }

  function abrirSecao(indiceSecao) {
    if (indiceSecao === -1) return abrir(PERGUNTAS.length);
    const [, de, ate] = secoes[indiceSecao];
    const pendente = PERGUNTAS.slice(de, ate).findIndex(item => respostas[item.id].status === 'pending');
    abrir(de + Math.max(0, pendente));
  }

  function responder(pergunta, status) {
    updateResposta(pergunta.id, 'status', status);
    if (status !== pergunta.trigger) updateResposta(pergunta.id, 'corrigidoNaVisita', false);
  }

  function marcarColaborador(id, campos) {
    setConferencia(atual => ({
      ...atual,
      colaboradores: atual.colaboradores.map(pessoa => pessoa.id === id ? { ...pessoa, ...campos } : pessoa),
    }));
  }

  async function finalizar() {
    if (!canFinish || loading) return;
    if (new TextEncoder().encode(JSON.stringify(treinamentos)).length > 780000) {
      setErro('O registro das assinaturas ficou muito grande para salvar.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      if (perfil) {
        const finalizada = await salvarNoSupabase(
          vistoriaId, meta, PERGUNTAS, respostas, conferirEquipe ? equipeDaUnidade : null, treinamentos,
        );
        if (!finalizada) {
          resetVistoria('historico');
          return;
        }
      } else {
        const agora = new Date();
        const falhas = PERGUNTAS.filter(p => respostas[p.id].status === p.trigger)
          .map(p => `${p.label}: ${respostas[p.id].reason || 'Sem justificativa'}`).join(' | ');
        const dados = {
          ...meta,
          horaFim: agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dataFinalizacao: agora.toLocaleString('pt-BR'),
          falhas,
        };
        await salvarVistoria(dados);
        await salvarFirestore({ ...dados, respostas });
      }
      setScreen('relatorio');
    } catch {
      setErro('Não foi possível confirmar a gravação. Mantenha a vistoria aberta e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-content field-content">
      <fieldset disabled={loading} className="min-w-0 space-y-5">
        <section className="field-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold">Identificação da visita</h2>
            {contadores.pending > 0 && <button type="button" className="app-secondary" onClick={verPendentes}>
              <ArrowDown size={16} aria-hidden="true" /> {contadores.pending} {contadores.pending === 1 ? 'item pendente' : 'itens pendentes'}
            </button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">Unidade
              <select className="app-input" value={unidadeValida ? meta.ubs : ''} onChange={e => {
                if (treinamentos.length && !window.confirm('Trocar de posto descarta os treinamentos e as assinaturas desta visita. Continuar?')) return;
                updateMeta('ubs', e.target.value);
                setConferencia(null);
                setTreinamentos([]);
              }}>
                <option value="">Selecione a unidade</option>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {meta.ubs && !unidadeValida && <span className="text-sm text-slate-600">
                Unidade do rascunho: {meta.ubs}. Selecione o posto correspondente para finalizar.
              </span>}
            </label>
            <label className="grid gap-1 text-sm font-semibold">Encarregada
              <input type="text" className="app-input" value={meta.encarregada}
                onChange={e => updateMeta('encarregada', e.target.value)} />
            </label>
          </div>
        </section>

        {conferirEquipe && unidadeValida && <ConferenciaEquipe key={meta.ubs} unidade={meta.ubs}
          conferencia={equipeDaUnidade} onConsultar={setConferencia} onMarcar={marcarColaborador} />}

        <section className="inspection-step space-y-3" data-section={tema}>
          <div className="inspection-step-heading" id="etapa-vistoria" tabIndex={-1}>
            <div className="inspection-icon"><Icone size={23} aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-bold">{revisao ? 'Revisão' : `Seção ${secaoAtual + 1} de ${secoes.length}`}</p>
              <h2 className="field-section">{titulo}</h2>
            </div>
            {!revisao && <span className="inspection-count">{respondidasSecao}/{perguntasSecao.length}</span>}
          </div>
          <div className="inspection-jump">
            <label className="grid gap-1 text-sm font-semibold">Ir para uma seção
              <select className="app-input" value={secaoAtual} onChange={e => abrirSecao(Number(e.target.value))}>
                {secoes.map(([nome, de, ate], i) => {
                  const itens = PERGUNTAS.slice(de, ate);
                  const feitos = itens.filter(item => respostas[item.id].status !== 'pending').length;
                  return <option key={nome} value={i}>{nome} ({feitos}/{itens.length})</option>;
                })}
                <option value={-1}>Avaliação final</option>
              </select>
            </label>
            {!revisao && <label className="grid gap-1 text-sm font-semibold">Pergunta da seção
              <select className="app-input" value={indice} onChange={e => abrir(Number(e.target.value))}>
                {perguntasSecao.map((item, i) => <option key={item.id} value={inicio + i}>
                  {i + 1}. {item.label}{respostas[item.id].status === 'pending' ? ' · Pendente' : ' · Respondida'}
                </option>)}
              </select>
            </label>}
          </div>
          {!revisao && <>
            <p className="inspection-question-number">Pergunta {indice - inicio + 1} de {perguntasSecao.length} nesta seção</p>
            <BentoCard key={pergunta.id} pergunta={pergunta} status={resposta.status}
              reason={resposta.reason} hasPhoto={Boolean(resposta.photo || resposta.photoBefore)}
              onAnswer={status => responder(pergunta, status)}
              onReasonChange={(id, val) => updateResposta(id, 'reason', val)}
              onEvidencias={setModalId} corrigido={resposta.corrigidoNaVisita}
              revisarComIA={Boolean(perfil && usaRevisaoIA)}
              onCorrigir={perfil ? (id, val) => updateResposta(id, 'corrigidoNaVisita', val) : undefined} />
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="app-secondary" disabled={indice === 0} onClick={() => abrir(indice - 1)}>
                <ArrowLeft size={16} aria-hidden="true" /> Anterior
              </button>
              <button type="button" className="app-primary" onClick={() => abrir(indice + 1)}>
                {indice + 1 === PERGUNTAS.length ? 'Ir para avaliação' : indice + 1 === fim ? 'Próxima seção' : 'Próxima pergunta'}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>}
        </section>

        {usaTreinamento && perfil && equipeDaUnidade && <div key={meta.ubs} hidden={!revisao || contadores.pending > 0}>
          <TreinamentoVistoria equipe={equipeDaUnidade.colaboradores} treinamentos={treinamentos} onAlterar={setTreinamentos}
            perguntas={PERGUNTAS} respostas={respostas} visivel={revisao && contadores.pending === 0} />
        </div>}

        {revisao && <section className="field-card space-y-4">
          <button type="button" className="app-secondary" onClick={() => abrir(PERGUNTAS.length - 1)}>
            <ArrowLeft size={16} aria-hidden="true" /> Voltar à última pergunta
          </button>
          <div>
            <p className="text-sm font-semibold mb-2">Nota da unidade (0 a 10)</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Nota da unidade">
              {Array.from({ length: 11 }, (_, nota) => <button key={nota} type="button" className="score-button"
                aria-pressed={meta.notaVistoria === nota} onClick={() => updateMeta('notaVistoria', nota)}>{nota}</button>)}
            </div>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Previsão de retorno
            <input type="date" className="app-input" value={meta.dataRetorno} onChange={e => updateMeta('dataRetorno', e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Considerações gerais
            <textarea rows={3} className="app-input" value={meta.consideracoesGerais}
              onChange={e => updateMeta('consideracoesGerais', e.target.value)} />
          </label>
          {perfil && usaRevisaoIA && <RevisaoIA texto={meta.consideracoesGerais}
            onAplicar={texto => updateMeta('consideracoesGerais', texto)} />}
          {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
          {contadores.pending > 0 && <button type="button" className="app-secondary" onClick={verPendentes}>Ver próximo item pendente</button>}
          {!identificacaoCompleta && contadores.pending === 0 && <p className="text-sm text-slate-600">Confira a identificação e selecione uma nota para finalizar.</p>}
          {conferirEquipe && unidadeValida && !equipeCompleta && <a className="app-secondary" href="#conferencia-equipe">
            Concluir conferência da equipe
          </a>}
          {!treinamentoCompleto && <a className="app-secondary" href="#treinamento-vistoria">
            Confira os treinamentos que ainda estão sem assinatura
          </a>}
          <button type="button" className="app-primary w-full" onClick={finalizar} disabled={!canFinish || loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} aria-hidden="true" />}
            {loading ? 'Salvando vistoria…' : 'Finalizar vistoria'}
          </button>
        </section>}
      </fieldset>
      {modalId && <CardModal perguntaId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
