import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { sugerirTreinamentos } from '../lib/treinamento';

export const usaTreinamento = import.meta.env.VITE_TREINAMENTO_IA === 'true';
const declaracao = 'Confirmo que participei do treinamento com o conteúdo apresentado acima.';

function iconeProcedimento(id) {
  if (id.startsWith('diluicao-')) return '🧪';
  if (id.includes('residuos') || id.startsWith('lixeira-')) return '🗑️';
  if (id.startsWith('contaminacao-')) return '🧤';
  if (id.startsWith('classificacao-')) return '🏥';
  return '🧹';
}

function Assinatura({ pessoa, onSalvar, onCancelar }) {
  const tela = useRef(null);
  const ponto = useRef(null);
  const [desenhada, setDesenhada] = useState(false);

  function desenhar(e, inicio) {
    if (inicio ? ponto.current : ponto.current?.id !== e.pointerId) return;
    const canvas = e.currentTarget;
    if (inicio) canvas.setPointerCapture(e.pointerId);
    const limites = canvas.getBoundingClientRect();
    const atual = {
      id: e.pointerId,
      x: (e.clientX - limites.left) * canvas.width / limites.width,
      y: (e.clientY - limites.top) * canvas.height / limites.height,
    };
    if (!inicio && Math.hypot(atual.x - ponto.current.x, atual.y - ponto.current.y) >= 1) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#17253d';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ponto.current.x, ponto.current.y);
      ctx.lineTo(atual.x, atual.y);
      ctx.stroke();
      setDesenhada(true);
    }
    ponto.current = atual;
  }

  function terminar(e) {
    if (ponto.current?.id === e.pointerId) ponto.current = null;
  }

  return <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
    <p className="text-sm font-bold">Assinatura de {pessoa.nome}</p>
    <p className="text-sm">{declaracao}</p>
    <canvas ref={tela} width={540} height={160} aria-label="Área para desenhar a assinatura"
      className="w-full touch-none rounded-lg border border-slate-400 bg-white"
      onPointerDown={e => desenhar(e, true)} onPointerMove={e => desenhar(e, false)}
      onPointerUp={terminar} onLostPointerCapture={terminar} onPointerCancel={terminar} />
    <div className="flex flex-wrap gap-2">
      <button type="button" className="app-primary" disabled={!desenhada}
        onClick={() => onSalvar(tela.current.toDataURL('image/png'))}>Confirmar participação</button>
      <button type="button" className="app-secondary" onClick={() => {
        tela.current.getContext('2d').clearRect(0, 0, tela.current.width, tela.current.height);
        setDesenhada(false);
      }}>Limpar</button>
      <button type="button" className="app-secondary" onClick={onCancelar}>Cancelar</button>
    </div>
  </div>;
}

export function RegistroTreinamento({ treinamento }) {
  if (!treinamento) return null;
  return <section className="report-section">
    <h2>Treinamento em campo</h2>
    <p className="report-text"><strong>{treinamento.titulo}</strong></p>
    <p className="report-muted">
      {typeof treinamento.fonteUrl === 'string' && treinamento.fonteUrl.startsWith('https://')
        ? <a className="underline" href={treinamento.fonteUrl} target="_blank" rel="noreferrer">{treinamento.fonte}</a>
        : treinamento.fonte} · {treinamento.versao}
    </p>
    <p className="report-text mt-2">{treinamento.roteiro}</p>
    <h3 className="report-signature-heading">Comprovantes de participação</h3>
    <p className="report-muted">{treinamento.declaracao}</p>
    <ul className="report-signatures">
      {treinamento.participantes.map(pessoa => <li key={pessoa.id}>
        <figure>
          <figcaption>
            <strong>{pessoa.nome}</strong>
            <span>Assinatura em {new Date(pessoa.assinadaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
          </figcaption>
          <img src={pessoa.assinatura} alt={`Assinatura de ${pessoa.nome}`} />
        </figure>
      </li>)}
    </ul>
  </section>;
}

export default function TreinamentoVistoria({ equipe, treinamentos, onAlterar, perguntas, respostas, onClassificar, visivel }) {
  const [aberto, setAberto] = useState(false);
  const [procedimentos, setProcedimentos] = useState(null);
  const [procedimentoId, setProcedimentoId] = useState('');
  const [itemEmRefinamento, setItemEmRefinamento] = useState('');
  const [irAoProcedimento, setIrAoProcedimento] = useState(false);
  const seletorProcedimento = useRef(null);
  const [roteiro, setRoteiro] = useState('');
  const [assinando, setAssinando] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!visivel || procedimentos) return;
    let ativo = true;
    async function carregar() {
      try {
        const campos = 'id, titulo, fonte, versao, conteudo';
        const consultar = colunas => supabase.from('procedimentos_treinamento')
          .select(colunas).eq('ativo', true).order('titulo');
        let { data, error } = await consultar(`${campos}, fonte_url`);
        if (error?.code === '42703') ({ data, error } = await consultar(campos));
        if (error) throw error;
        if (ativo) setProcedimentos(data);
      } catch {
        if (ativo) setErro('Não foi possível abrir o catálogo de procedimentos.');
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [visivel, procedimentos, tentativa]);

  useEffect(() => {
    if (!irAoProcedimento || !seletorProcedimento.current) return;
    seletorProcedimento.current.focus({ preventScroll: true });
    seletorProcedimento.current.scrollIntoView({ block: 'center' });
    setIrAoProcedimento(false);
  }, [irAoProcedimento]);

  const procedimento = procedimentos?.find(item => item.id === procedimentoId);
  const recomendacoes = procedimentos && sugerirTreinamentos(perguntas, respostas, procedimentos);
  const porProcedimento = new Map(treinamentos.map(item => [item.procedimentoId, item]));
  const sugestoes = recomendacoes?.sugestoes.filter(item => !porProcedimento.has(item.procedimento.id)) ?? [];
  const sugeridos = new Set(sugestoes.map(item => item.procedimento.id));
  const outros = procedimentos?.filter(item => !sugeridos.has(item.id) && !porProcedimento.has(item.id)) ?? [];
  const motivoSelecionado = recomendacoes?.sugestoes.find(item => item.procedimento.id === procedimentoId);
  const itemParaRefinar = recomendacoes?.classificar.find(item => item.id === itemEmRefinamento);
  const semAssinatura = treinamentos.filter(item => !item.participantes.length);
  const treinamento = porProcedimento.get(procedimentoId);
  const participantes = treinamento?.participantes ?? [];

  function escolherProcedimento(id) {
    if (id === procedimentoId) return;
    setProcedimentoId(id);
    setRoteiro('');
    setErro('');
    setAssinando(null);
  }

  function abrirProcedimento(id) {
    escolherProcedimento(id);
    setAberto(true);
    setIrAoProcedimento(true);
  }

  async function gerarRoteiro() {
    if (!procedimento || ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      const { data, error } = await supabase.functions.invoke('assistencia-vistoria', {
        body: { acao: 'treinamento', procedimentoId: procedimento.id },
      });
      if (error || typeof data?.sugestao !== 'string' || !data.sugestao.trim()) throw new Error('Roteiro indisponível');
      setRoteiro(data.sugestao);
    } catch {
      setErro('Não foi possível gerar o roteiro agora. Você pode usar o texto de referência.');
    } finally {
      setOcupado(false);
    }
  }

  function confirmarRoteiro() {
    if (!procedimento || treinamento || !roteiro.trim() || roteiro.trim().length > 6000) return;
    const novo = {
      procedimentoId: procedimento.id, titulo: procedimento.titulo, fonte: procedimento.fonte,
      fonteUrl: procedimento.fonte_url, versao: procedimento.versao, roteiro: roteiro.trim(), declaracao, participantes: [],
    };
    onAlterar(atuais => [...atuais, novo]);
  }

  function registrar(pessoa, assinatura) {
    const proximo = {
      ...treinamento,
      participantes: [...participantes, { id: pessoa.id, nome: pessoa.nome, assinatura, assinadaEm: new Date().toISOString() }],
    };
    const lista = treinamentos.map(item => item.procedimentoId === procedimentoId ? proximo : item);
    if (assinatura.length > 80000 || new TextEncoder().encode(JSON.stringify(lista)).length > 780000) {
      setErro('O registro ficou grande demais. Limpe a assinatura e tente um traço mais simples.');
      return;
    }
    setErro('');
    onAlterar(lista);
    setAssinando(null);
  }

  function campoMotivo({ id, opcoes }) {
    const motivo = respostas[id].temaTreinamento ?? '';
    const tema = opcoes.find(item => item.id === motivo);
    return <>
      <label className="grid gap-1 text-sm font-semibold">
        Motivo da não conformidade
        <select className="app-input" value={motivo} onChange={e => onClassificar(id, e.target.value)}>
          <option value="">Selecione o motivo</option>
          {opcoes.map(item => <option key={item.id} value={item.id}>Técnica · {item.titulo}</option>)}
          {id === 'sujeiraDerramamento' && <option value="quimico">Derramamento químico · seguir procedimento da unidade</option>}
          <option value="sem_pop">Falha técnica sem tema correspondente</option>
          <option value="operacional">Material, manutenção, agenda ou outro motivo operacional</option>
        </select>
      </label>
      {tema && <div className="space-y-2 rounded-lg bg-sky-50 p-3 text-sky-950">
        <p role="status"><strong>{porProcedimento.has(tema.id) ? 'Já registrado' : 'Tema sugerido'}</strong> · {tema.titulo}</p>
        <button type="button" className="app-secondary" disabled={ocupado || Boolean(assinando) || !equipe.length}
          onClick={() => abrirProcedimento(tema.id)}>
          {porProcedimento.has(tema.id) ? 'Abrir treinamento registrado' : 'Abrir tema sugerido'}
        </button>
      </div>}
      {motivo && !tema && <p role="status" className="text-slate-700">
        {motivo === 'operacional' ? 'Pendência operacional registrada no rascunho. Nenhum tema sugerido.'
          : motivo === 'quimico' ? 'Siga o procedimento de emergência da unidade para esse produto.'
          : opcoes.length ? 'Se um dos temas acima se aplica, selecione a opção Técnica para sugeri-lo.'
          : 'Esse motivo ainda não tem um tema liberado no catálogo.'}
      </p>}
    </>;
  }

  return <section id="treinamento-vistoria" className="field-card space-y-3">
    <h2 className="field-section flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-indigo-950">
      <span aria-hidden="true">📚</span> Treinamento em campo
    </h2>
    {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    {!procedimentos && (erro
      ? <button type="button" className="app-secondary" onClick={() => {
        setErro('');
        setTentativa(valor => valor + 1);
      }}>Tentar novamente</button>
      : <p role="status" className="text-sm">Carregando procedimentos…</p>)}
    {procedimentos && <>
      <p className="text-sm text-slate-700" role="status">
        {sugestoes.length} {sugestoes.length === 1 ? 'tema sugerido' : 'temas sugeridos'}
        {treinamentos.length > 0 && ` · ${treinamentos.length} ${treinamentos.length === 1 ? 'registrado' : 'registrados'}`}
      </p>
      {semAssinatura.length > 0 && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h3 className="text-sm font-bold">Assinaturas pendentes ({semAssinatura.length})</h3>
        <ul className="space-y-2">{semAssinatura.map(item => (
          <li key={item.procedimentoId} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{item.titulo}</span>
            <button type="button" className="app-secondary" disabled={ocupado || Boolean(assinando) || !equipe.length}
              aria-label={`Colher assinatura: ${item.titulo}`}
              onClick={() => abrirProcedimento(item.procedimentoId)}>Colher assinatura</button>
          </li>
        ))}</ul>
      </div>}
      {treinamentos.length > 0 && semAssinatura.length === 0 && <p className="rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-950">
        Todos os treinamentos registrados têm assinatura.
      </p>}
      {!equipe.length && <p className="text-sm text-slate-700">O posto precisa ter colaboradores vinculados para registrar assinaturas.</p>}
      {equipe.length > 0 && (procedimentos.length > 0 || treinamentos.length > 0) && <button type="button" className="app-secondary" aria-expanded={aberto}
        disabled={ocupado || Boolean(assinando)} onClick={() => setAberto(valor => !valor)}>
        {aberto ? 'Recolher treinamentos' : treinamentos.length ? 'Escolher ou revisar treinamento' : 'Escolher treinamento'}
      </button>}
    </>}
    {aberto && procedimentos && equipe.length > 0 && <>
      <label className="grid gap-1 text-sm font-semibold">
        Procedimento
        <select ref={seletorProcedimento} className="app-input" value={procedimentoId}
          disabled={ocupado || Boolean(assinando)} onChange={e => escolherProcedimento(e.target.value)}>
          <option value="">Selecione o procedimento</option>
          {sugestoes.length > 0 && <optgroup label="Sugeridos pela vistoria">
            {sugestoes.map(({ procedimento: item }) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </optgroup>}
          {treinamentos.length > 0 && <optgroup label="Já registrados">
            {treinamentos.map(item => <option key={item.procedimentoId} value={item.procedimentoId}>
              {item.titulo} · {item.participantes.length ? `${item.participantes.length} assinatura(s)` : 'Sem assinatura'}
            </option>)}
          </optgroup>}
          {outros.length > 0 && <optgroup label="Outros temas">
            {outros.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </optgroup>}
        </select>
      </label>
      {motivoSelecionado && <p className="rounded-lg bg-sky-50 p-2 text-sm text-sky-950">
        <span aria-hidden="true">{iconeProcedimento(procedimentoId)} </span>
        Sugerido por: {motivoSelecionado.itens.join(' · ')}
      </p>}
      {procedimento && !treinamento && <>
        <details className="rounded-lg border p-3 text-sm">
          <summary className="font-semibold">Consultar fonte · {procedimento.fonte}</summary>
          <p className="mt-2 whitespace-pre-wrap">{procedimento.conteudo}</p>
          {procedimento.fonte_url && <a className="mt-2 inline-block font-semibold text-sky-800 underline"
            href={procedimento.fonte_url} target="_blank" rel="noreferrer">Abrir referência oficial</a>}
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-secondary" disabled={ocupado} onClick={gerarRoteiro}>
            {ocupado ? 'Preparando roteiro…' : 'Preparar roteiro com IA'}
          </button>
          <button type="button" className="app-secondary" disabled={ocupado || procedimento.conteudo.length > 6000} onClick={() => {
            setRoteiro(procedimento.conteudo);
            setErro('');
          }}>Usar texto de referência</button>
        </div>
        {roteiro && <>
          <label className="grid gap-1 text-sm font-semibold">
            Confira o conteúdo com a fonte antes de apresentar
            <textarea className="app-input" rows={7} value={roteiro} maxLength={6000} disabled={ocupado}
              onChange={e => setRoteiro(e.target.value)} />
          </label>
          <button type="button" className="app-primary" disabled={ocupado || !roteiro.trim() || roteiro.length > 6000} onClick={confirmarRoteiro}>
            Registrar roteiro apresentado
          </button>
        </>}
      </>}
    </>}
    {aberto && treinamento && <>
      <p className={`rounded-lg p-2 text-sm font-bold ${participantes.length ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
        <span aria-hidden="true">✍️ </span>{treinamento.titulo} · {participantes.length ? 'Assinatura registrada' : 'Aguardando assinatura'}
      </p>
      <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{treinamento.roteiro}</p>
      <p className="text-sm">Passe o celular a cada participante. Mantenha a página aberta até finalizar a vistoria para gravar as assinaturas.</p>
      <ul className="space-y-2">{equipe.map(pessoa => {
        const assinou = participantes.some(item => item.id === pessoa.id);
        return <li key={pessoa.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{pessoa.nome}</span>
            {assinou ? <strong className="text-emerald-800">Assinatura registrada</strong>
              : <button type="button" className="app-secondary" disabled={participantes.length >= 60}
                onClick={() => setAssinando(pessoa.id)}>Assinar</button>}
          </div>
          {assinando === pessoa.id && <Assinatura key={pessoa.id} pessoa={pessoa}
            onSalvar={assinatura => registrar(pessoa, assinatura)} onCancelar={() => setAssinando(null)} />}
        </li>;
      })}</ul>
      <button type="button" className="app-secondary" onClick={() => {
        if (participantes.length && !window.confirm('Descartar o roteiro e todas as assinaturas deste treinamento?')) return;
        setAssinando(null);
        setErro('');
        setRoteiro(participantes.length ? '' : treinamento.roteiro);
        onAlterar(atuais => atuais.filter(item => item.procedimentoId !== procedimentoId));
      }}>{participantes.length ? 'Descartar treinamento' : 'Voltar à edição do roteiro'}</button>
    </>}
    {aberto && recomendacoes && (recomendacoes.classificar.length > 0 || recomendacoes.semPop.length > 0) && (
      <details className="rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="font-semibold">Refinar sugestões <span className="font-normal text-slate-600">(opcional)</span></summary>
        <div className="mt-2 space-y-2">
          {recomendacoes.classificar.length > 0 && <label className="grid gap-1 text-sm font-semibold">
            Qual apontamento quer refinar?
            <select className="app-input" value={itemParaRefinar?.id ?? ''} onChange={e => setItemEmRefinamento(e.target.value)}>
              <option value="">Selecione um apontamento</option>
              {recomendacoes.classificar.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>}
          {itemParaRefinar && campoMotivo(itemParaRefinar)}
          {recomendacoes.semPop.length > 0 && <div className="rounded-lg bg-amber-50 p-2 text-amber-950">
            <p className="font-semibold">Pontos técnicos sem POP específico liberado</p>
            <ul className="list-disc pl-5">{recomendacoes.semPop.map(item => <li key={item}>{item}</li>)}</ul>
          </div>}
        </div>
      </details>
    )}
  </section>;
}
