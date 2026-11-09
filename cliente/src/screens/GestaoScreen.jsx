import React, { useEffect, useState } from 'react';
import { CircleAlert, Clock3, ListChecks, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizarUnidade } from '../lib/unidades';

const situacoes = { aberto: 'Em aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido' };
const hoje = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dataBr = data => data?.split('-').reverse().join('/') || 'Sem prazo';

function Apontamento({ item, perfis, administrador, onSalvo }) {
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const { respostas: resposta } = item;
  const vencido = item.situacao !== 'resolvido' && item.prazo && item.prazo < hoje();
  const unidade = normalizarUnidade(resposta.vistorias.unidade);

  async function salvar(evento) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const campos = {
      responsavel_id: form.get('responsavel') || null,
      prazo: form.get('prazo') || null,
      situacao: form.get('situacao'),
      orientacao: String(form.get('orientacao')).trim(),
    };
    setOcupado(true);
    setMensagem('');
    try {
      const { data, error } = await supabase.from('apontamentos').update(campos)
        .eq('vistoria_id', item.vistoria_id).eq('item_id', item.item_id)
        .select('responsavel_id, prazo, situacao, orientacao').single();
      if (error) throw error;
      onSalvo({ ...item, ...data });
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
          <p className="text-sm text-slate-600">{unidade} · {dataBr(resposta.vistorias.data_vistoria)}</p>
        </div>
        <span className={`status-pill ${vencido || resposta.critico && item.situacao !== 'resolvido' ? 'status-danger' : ''}`}>
          {vencido ? 'Vencido' : situacoes[item.situacao]}
        </span>
      </summary>
      <div className="action-detail space-y-3">
        {resposta.critico && <span className="status-pill status-danger">Apontamento crítico</span>}
        {resposta.observacao && <p className="text-sm text-slate-700">{resposta.observacao}</p>}
        {administrador ? (
          <form onSubmit={salvar}>
            <fieldset disabled={ocupado} className="min-w-0 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Responsável
                <select name="responsavel" className="app-input" defaultValue={item.responsavel_id ?? ''}>
                  <option value="">A definir</option>
                  {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Prazo
                <input name="prazo" type="date" className="app-input" defaultValue={item.prazo ?? ''} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">Situação
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
            <p><strong>Prazo:</strong> {dataBr(item.prazo)}</p>
            <p><strong>Orientação:</strong> {item.orientacao || 'Aguardando orientação da gestão.'}</p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function GestaoScreen({ administrador }) {
  const [itens, setItens] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [estado, setEstado] = useState('carregando');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const lista = [];
        const pagina = 100;
        for (let inicio = 0; ; inicio += pagina) {
          const { data, error } = await supabase.from('apontamentos')
            .select('vistoria_id, item_id, responsavel_id, prazo, situacao, orientacao, respostas!inner(item_titulo, critico, observacao, vistorias!inner(unidade, data_vistoria))')
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

  const abertas = itens.filter(item => item.situacao !== 'resolvido');
  const vencidas = abertas.filter(item => item.prazo && item.prazo < hoje());
  const resolvidas = itens.length - abertas.length;
  const metricas = [
    ['Em aberto', abertas.length, ListChecks],
    ['Vencidas', vencidas.length, CircleAlert],
    ['Resolvidas', resolvidas, Clock3],
  ];
  const ordenados = [...itens].sort((a, b) => Number(a.situacao === 'resolvido') - Number(b.situacao === 'resolvido'));

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
      {estado === 'pronto' && ordenados.map(item => <Apontamento key={`${item.vistoria_id}:${item.item_id}`} item={item}
        perfis={perfis} administrador={administrador} onSalvo={salvo => setItens(lista => lista.map(atual =>
          atual.vistoria_id === salvo.vistoria_id && atual.item_id === salvo.item_id ? salvo : atual))} />)}
    </main>
  );
}
