import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { sugerirTreinamentos } from '../lib/treinamento';

export const usaTreinamento = import.meta.env.VITE_TREINAMENTO_IA === 'true';
const declaracao = 'Confirmo que participei do treinamento com o conteúdo apresentado acima.';

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
    <p className="report-muted">{treinamento.fonte} · {treinamento.versao}</p>
    <p className="report-text mt-2">{treinamento.roteiro}</p>
    <p className="report-muted mt-2">{treinamento.participantes.length} assinatura(s) de participação registradas.</p>
    <ul className="report-list">{treinamento.participantes.map(pessoa => <li key={pessoa.id}>{pessoa.nome}</li>)}</ul>
    <details className="mt-2 print:hidden">
      <summary className="cursor-pointer text-sm font-bold">Ver comprovantes de participação</summary>
      <p className="text-sm">{treinamento.declaracao}</p>
      {treinamento.participantes.map(pessoa => <figure key={pessoa.id} className="my-2 rounded-lg border p-2">
        <figcaption className="text-sm font-semibold">{pessoa.nome} · {new Date(pessoa.assinadaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</figcaption>
        <img src={pessoa.assinatura} className="w-full max-w-xs" alt={`Assinatura de ${pessoa.nome}`} />
      </figure>)}
    </details>
  </section>;
}

export default function TreinamentoVistoria({ equipe, treinamentos, onAlterar, perguntas, respostas, visivel }) {
  const [aberto, setAberto] = useState(false);
  const [procedimentos, setProcedimentos] = useState(null);
  const [procedimentoId, setProcedimentoId] = useState('');
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
        const { data, error } = await supabase.from('procedimentos_treinamento')
          .select('id, titulo, fonte, versao, conteudo').eq('ativo', true).order('titulo');
        if (error) throw error;
        if (ativo) setProcedimentos(data);
      } catch {
        if (ativo) setErro('Não foi possível abrir o catálogo de procedimentos.');
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [visivel, procedimentos, tentativa]);

  const procedimento = procedimentos?.find(item => item.id === procedimentoId);
  const sugestoes = procedimentos ? sugerirTreinamentos(perguntas, respostas, procedimentos) : [];
  const porProcedimento = new Map(treinamentos.map(item => [item.procedimentoId, item]));
  const treinamento = porProcedimento.get(procedimentoId);
  const participantes = treinamento?.participantes ?? [];

  function escolherProcedimento(id) {
    if (id === procedimentoId) return;
    setProcedimentoId(id);
    setRoteiro('');
    setErro('');
    setAssinando(null);
    setAberto(true);
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
      versao: procedimento.versao, roteiro: roteiro.trim(), declaracao, participantes: [],
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

  return <section id="treinamento-vistoria" className="field-card space-y-3">
    <h2 className="field-section">Treinamento em campo</h2>
    {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    {!procedimentos && (erro
      ? <button type="button" className="app-secondary" onClick={() => {
        setErro('');
        setTentativa(valor => valor + 1);
      }}>Tentar novamente</button>
      : <p role="status" className="text-sm">Carregando procedimentos…</p>)}
    {procedimentos && <>
      {sugestoes.length > 0 ? <div className="space-y-2">
        <h3 className="text-sm font-bold">Sugestões pelo resultado da vistoria</h3>
        {sugestoes.map(({ procedimento: sugerido, item }) => <div key={sugerido.id} className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm font-semibold">{sugerido.titulo}</p>
          <p className="text-xs text-slate-700">Item não conforme · {item}</p>
          <button type="button" className="app-secondary" disabled={ocupado || !equipe.length}
            onClick={() => escolherProcedimento(sugerido.id)}>
            {porProcedimento.has(sugerido.id) ? 'Abrir treinamento registrado' : 'Selecionar treinamento'}
          </button>
        </div>)}
      </div> : <p className="text-sm text-slate-700">Nenhuma não conformidade técnica do checklist corresponde a um procedimento liberado.</p>}
      {!equipe.length && <p className="text-sm text-slate-700">O posto precisa ter colaboradores vinculados para registrar assinaturas.</p>}
      {!aberto && equipe.length > 0 && procedimentos.length > 0 && <button type="button" className="app-secondary"
        onClick={() => setAberto(true)}>Escolher procedimento</button>}
    </>}
    {treinamentos.length > 0 && <div className="space-y-2">
      <h3 className="text-sm font-bold">Treinamentos registrados nesta vistoria</h3>
      <ul className="space-y-2">{treinamentos.map(item => (
        <li key={item.procedimentoId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
          <div className="text-sm">
            <p className="font-semibold">{item.titulo}</p>
            <p className={item.participantes.length ? 'text-emerald-800' : 'text-amber-900'}>
              {item.participantes.length ? `${item.participantes.length} assinatura(s)` : 'Aguardando assinatura'}
            </p>
          </div>
          <button type="button" className="app-secondary" disabled={ocupado}
            aria-pressed={procedimentoId === item.procedimentoId}
            onClick={() => escolherProcedimento(item.procedimentoId)}>Abrir assinaturas</button>
        </li>
      ))}</ul>
    </div>}
    {aberto && procedimentos && equipe.length > 0 && <>
      {procedimentos.length === 0 ? <p className="text-sm">Nenhum procedimento liberado.</p> : <label className="grid gap-1 text-sm font-semibold">
        Procedimento
        <select className="app-input" value={procedimentoId} disabled={ocupado} onChange={e => escolherProcedimento(e.target.value)}>
          <option value="">Selecione o procedimento</option>
          {procedimentos.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
        </select>
      </label>}
      {procedimento && !treinamento && <>
        <details className="rounded-lg border p-3 text-sm">
          <summary className="font-semibold">Consultar fonte · {procedimento.fonte}</summary>
          <p className="mt-2 whitespace-pre-wrap">{procedimento.conteudo}</p>
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
    {treinamento && <>
      <p className="text-sm font-bold">{treinamento.titulo}</p>
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
  </section>;
}
