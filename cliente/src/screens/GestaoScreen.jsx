import React, { useCallback, useEffect, useState } from 'react';
import { CircleAlert, Clock3, ListChecks, RefreshCw } from 'lucide-react';
import { LinkSupervisao, RevisaoSupervisao, useRetornosSupervisao } from '../components/GestaoRetornoSupervisao';
import { dataBr, hoje } from '../lib/retornoSupervisao';
import { supabase } from '../lib/supabase';
import { normalizarUnidade } from '../lib/unidades';

const situacoes = { aberto: 'Em aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido' };

function Apontamento({ item, perfis, administrador, onSalvo, acompanhamento, onRevisar }) {
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const { respostas: resposta } = item;
  const prazo = item.prazo ?? item.prazo_supervisao;
  const vencido = item.situacao !== 'resolvido' && prazo && prazo < hoje();
  const unidade = normalizarUnidade(resposta.vistorias.unidade);

  async function salvar(evento) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const campos = {
      responsavel_id: form.get('responsavel') || null,
      prazo: form.get('prazo') || null,
      orientacao: String(form.get('orientacao')).trim(),
    };
    // Alterações de prazo ou orientação não reabrem um item já encerrado por outra pessoa.
    if (form.get('situacao') !== item.situacao) campos.situacao = form.get('situacao');
    setOcupado(true);
    setMensagem('');
    try {
      const { data, error } = await supabase.from('apontamentos').update(campos)
        .eq('vistoria_id', item.vistoria_id).eq('item_id', item.item_id)
        .eq('situacao', item.situacao)
        .select('responsavel_id, prazo, prazo_supervisao, situacao, orientacao').maybeSingle();
      if (error) throw error;
      if (!data) {
        setMensagem('O apontamento mudou. Atualize a lista antes de salvar.');
        return;
      }
      onSalvo(item.vistoria_id, item.item_id, data);
      setMensagem('Apontamento atualizado.');
    } catch {
      setMensagem('Não foi possível salvar. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <details className="field-card action-card">
      <summary>
        <div className="min-w-0">
          <h3 className="font-bold">{resposta.item_titulo}</h3>
          {!administrador && <p className="text-sm text-slate-600">{unidade} · {dataBr(resposta.vistorias.data_vistoria)}</p>}
          {acompanhamento?.[0]?.decisao == null && acompanhamento?.length > 0 && item.situacao !== 'resolvido' && (
            <p className="text-sm font-semibold text-teal-800">Retorno aguardando validação</p>
          )}
          {acompanhamento?.[0]?.decisao === 'devolvido' && item.situacao !== 'resolvido' && (
            <p className="text-sm text-slate-600">Complemento solicitado</p>
          )}
        </div>
        <span className={`status-pill ${vencido || resposta.critico && item.situacao !== 'resolvido' ? 'status-danger' : ''}`}>
          {vencido ? 'Vencido' : situacoes[item.situacao]}
        </span>
      </summary>
      <div className="action-detail space-y-3">
        {resposta.critico && <span className="status-pill status-danger">Apontamento crítico</span>}
        {resposta.observacao && <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{resposta.observacao}</p>}
        {acompanhamento && <RevisaoSupervisao respostas={acompanhamento} situacao={item.situacao} onRevisar={onRevisar} />}
        {administrador ? (
          <form key={item.situacao} onSubmit={salvar}>
            <fieldset disabled={ocupado} className="min-w-0 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Responsável interno
                <select name="responsavel" className="app-input" defaultValue={item.responsavel_id ?? ''}>
                  <option value="">A definir</option>
                  {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Prazo da gestão
                <input name="prazo" type="date" className="app-input" defaultValue={item.prazo ?? ''} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">Situação do apontamento
                <select name="situacao" className="app-input" defaultValue={item.situacao}>
                  {Object.entries(situacoes).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Orientação para o retorno
                <textarea name="orientacao" className="app-input" rows={3} defaultValue={item.orientacao} />
              </label>
              <button className="app-primary sm:justify-self-start" type="submit">{ocupado ? 'Salvando…' : 'Salvar apontamento'}</button>
            </fieldset>
            {mensagem && <p role="status" className="mt-2 text-sm">{mensagem}</p>}
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <p><strong>Prazo:</strong> {dataBr(prazo)}</p>
            <p><strong>Orientação:</strong> {item.orientacao || 'Aguardando orientação da gestão.'}</p>
          </div>
        )}
      </div>
    </details>
  );
}

function AcompanhamentoVistoria({ itens, perfis, onSalvo, onAtualizarItens, versaoLista }) {
  const [{ vistoria_id: id, respostas: { vistorias: visita } }] = itens;
  const unidade = normalizarUnidade(visita.unidade);
  const [aberto, setAberto] = useState(false);
  const { dados, estado, atualizar, atualizarLink, revisar } = useRetornosSupervisao(id, aberto, versaoLista);
  useEffect(() => {
    if (dados?.apontamentos) onAtualizarItens(id, dados.apontamentos);
  }, [dados?.apontamentos, id, onAtualizarItens]);
  const pendentes = itens.filter(item => item.situacao !== 'resolvido').length;
  const respostasPorItem = new Map();
  for (const resposta of dados?.respostas ?? []) {
    if (!respostasPorItem.has(resposta.item_id)) respostasPorItem.set(resposta.item_id, []);
    respostasPorItem.get(resposta.item_id).push(resposta);
  }
  const aValidar = itens.filter(item => {
    const ultima = respostasPorItem.get(item.item_id)?.[0];
    return item.situacao !== 'resolvido' && ultima && !ultima.decisao;
  }).length;

  return (
    <details className="field-card action-card supervisao-vistoria" onToggle={evento => {
      if (evento.currentTarget.open) setAberto(true);
    }}>
      <summary>
        <div className="min-w-0">
          <h3 className="font-bold">{unidade}</h3>
          <p className="text-sm text-slate-600">Vistoria de {dataBr(visita.data_vistoria)}</p>
        </div>
        {aValidar > 0 && <span className="status-pill">{aValidar} para validar</span>}
        <span className="status-pill">{pendentes ? `${pendentes} em acompanhamento` : 'Encerrada'}</span>
      </summary>
      {aberto && <div className="action-detail space-y-3">
        {dados && <LinkSupervisao vistoriaId={id} unidade={unidade} link={dados.link}
          abertos={pendentes} onAtualizar={atualizarLink} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-bold">Apontamentos</h4>
          <button type="button" className="app-secondary" onClick={atualizar} disabled={estado === 'carregando'}>
            <RefreshCw size={16} aria-hidden="true" /> Atualizar retornos
          </button>
        </div>
        {estado === 'carregando' && <p role="status" className="text-sm">Carregando retornos…</p>}
        {estado === 'erro' && <p role="alert" className="text-sm text-red-800">Não foi possível consultar os retornos desta vistoria.</p>}
        {itens.map(item => <Apontamento key={item.item_id} item={item} perfis={perfis} administrador
          onSalvo={onSalvo} acompanhamento={dados ? respostasPorItem.get(item.item_id) ?? [] : null}
          onRevisar={async (respostaId, decisao, nota) => {
            const situacao = await revisar(respostaId, decisao, nota);
            onSalvo(id, item.item_id, { situacao });
          }} />)}
      </div>}
    </details>
  );
}

function chaveBusca(valor) {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export default function GestaoScreen({ administrador }) {
  const [itens, setItens] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [estado, setEstado] = useState('carregando');
  const [versao, setVersao] = useState(0);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const lista = [];
        const pagina = 100;
        for (let inicio = 0; ; inicio += pagina) {
          const { data, error } = await supabase.from('apontamentos')
            .select('vistoria_id, item_id, responsavel_id, prazo, prazo_supervisao, situacao, orientacao, respostas!inner(item_titulo, critico, observacao, vistorias!inner(unidade, data_vistoria))')
            .order('prazo', { nullsFirst: false }).order('vistoria_id').order('item_id')
            .range(inicio, inicio + pagina - 1);
          if (error) throw error;
          lista.push(...data);
          if (!ativo || data.length < pagina) break;
        }
        if (!ativo) return;
        if (administrador) {
          const { data, error } = await supabase.from('perfis').select('id, nome').order('nome');
          if (error) throw error;
          if (!ativo) return;
          setPerfis(data);
        }
        setItens(lista);
        setEstado('pronto');
      } catch {
        if (ativo) setEstado('erro');
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [administrador, versao]);

  function atualizar() {
    setEstado('carregando');
    setVersao(v => v + 1);
  }

  function atualizarItem(vistoriaId, itemId, campos) {
    setItens(lista => lista.map(item => item.vistoria_id === vistoriaId && item.item_id === itemId
      ? { ...item, ...campos } : item));
  }

  const atualizarItensDaVistoria = useCallback((vistoriaId, atuais) => {
    const porId = new Map(atuais.map(item => [item.item_id, item]));
    setItens(lista => lista.map(item => item.vistoria_id === vistoriaId && porId.has(item.item_id)
      ? { ...item, ...porId.get(item.item_id) } : item));
  }, []);

  const abertas = itens.filter(item => item.situacao !== 'resolvido');
  const vencidas = abertas.filter(item => (item.prazo ?? item.prazo_supervisao) < hoje());
  const resolvidas = itens.length - abertas.length;
  const metricas = [
    ['Em aberto', abertas.length, ListChecks],
    ['Vencidas', vencidas.length, CircleAlert],
    ['Resolvidas', resolvidas, Clock3],
  ];
  const ordenados = [...itens].sort((a, b) => Number(a.situacao === 'resolvido') - Number(b.situacao === 'resolvido'));
  const grupos = new Map();
  const termo = chaveBusca(busca);
  if (administrador) {
    for (const item of ordenados) {
      if (!chaveBusca(normalizarUnidade(item.respostas.vistorias.unidade)).includes(termo)) continue;
      if (!grupos.has(item.vistoria_id)) grupos.set(item.vistoria_id, []);
      grupos.get(item.vistoria_id).push(item);
    }
  }

  return (
    <main className="app-content space-y-4">
      {estado === 'pronto' && <div className="management-metrics">
        {metricas.map(([rotulo, valor, Icone], i) => <div key={rotulo} className={`management-metric metric-${i}`}>
          <Icone size={17} aria-hidden="true" /><strong>{valor}</strong><span>{rotulo}</span>
        </div>)}
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="field-section">Apontamentos das visitas</h2>
        <button type="button" className="app-secondary" onClick={atualizar} disabled={estado === 'carregando'}>
          <RefreshCw size={16} aria-hidden="true" /> Atualizar
        </button>
      </div>
      {estado === 'carregando' && <p role="status">Carregando apontamentos…</p>}
      {estado === 'erro' && <p role="alert" className="text-red-800">Não foi possível carregar os apontamentos. Tente atualizar.</p>}
      {estado === 'pronto' && !itens.length && <div className="field-card">
        <h3 className="font-bold">Nenhum apontamento para acompanhar</h3>
        <p className="mt-1 text-sm text-slate-600">As falhas que precisarem de acompanhamento aparecerão aqui quando uma nova vistoria for finalizada.</p>
      </div>}
      {(estado === 'pronto' || estado === 'carregando' && itens.length > 0) && (administrador ? <>
        {itens.length > 0 && <label className="grid max-w-sm gap-1 text-sm font-semibold">Buscar unidade
          <input type="search" className="app-input" value={busca} onChange={evento => setBusca(evento.target.value)} />
        </label>}
        {itens.length > 0 && !grupos.size && <p className="text-sm">Nenhuma vistoria encontrada para esta unidade.</p>}
        {[...grupos].map(([id, itensDaVistoria]) => <AcompanhamentoVistoria key={id} itens={itensDaVistoria}
          perfis={perfis} onSalvo={atualizarItem} onAtualizarItens={atualizarItensDaVistoria} versaoLista={versao} />)}
      </> : ordenados.map(item => <Apontamento key={`${item.vistoria_id}:${item.item_id}`}
        item={item} perfis={perfis} administrador={false} onSalvo={atualizarItem} />))}
    </main>
  );
}
