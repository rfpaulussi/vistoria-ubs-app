import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { buscarVistorias } from '../lib/vistorias';
import { UNIDADES } from '../lib/unidades';
import { chaveUnidade, filtrarHistorico, limitePeriodo } from '../lib/filtrosHistorico';
import RelatorioScreen from './RelatorioScreen';

const porPagina = 8;
const nomesUnidades = new Map(UNIDADES.map(nome => [chaveUnidade(nome), nome]));

function notaCor(nota) {
  const n = Number(nota);
  if (n >= 8) return 'bg-teal-700 text-white';
  if (n >= 6) return 'bg-amber-500 text-white';
  return 'bg-red-600 text-white';
}

function formatData(raw) {
  if (!raw) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.split('-').reverse().join('/');
  if (typeof raw === 'string' && raw.includes('/')) return raw.split(' ')[0];
  const d = new Date(raw);
  if (isNaN(d)) return String(raw);
  return d.toLocaleDateString('pt-BR');
}

export default function HistoricoScreen() {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroUbs, setFiltroUbs] = useState('');
  const [periodo, setPeriodo] = useState('30');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [frequencia, setFrequencia] = useState(1);
  const [modo, setModo] = useState('visitas');
  const [pagina, setPagina] = useState(1);
  const [unidade, setUnidade] = useState('');
  const [selecionada, setSelecionada] = useState(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const dados = await buscarVistorias();
      setVistorias([...dados].reverse());
    } catch (e) {
      setErro('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (selecionada) return <RelatorioScreen arquivada={selecionada} historico={vistorias} onVoltar={() => setSelecionada(null)} />;

  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const intervaloInvalido = periodo === 'personalizado' && inicio && fim && inicio > fim;
  const { visitas, unidades } = filtrarHistorico(intervaloInvalido ? [] : vistorias, {
    busca: filtroUbs, unidade, frequencia, nomes: nomesUnidades,
    inicio: periodo === 'personalizado' ? inicio : limitePeriodo(periodo, hoje),
    fim: periodo === 'personalizado' ? fim : periodo === 'todos' ? '' : hoje,
  });
  const registros = modo === 'visitas' ? visitas : unidades;
  const paginas = Math.max(1, Math.ceil(registros.length / porPagina));
  const paginaAtual = Math.min(pagina, paginas);
  const deslocamento = (paginaAtual - 1) * porPagina;
  const listagem = registros.slice(deslocamento, deslocamento + porPagina);

  function mudar(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  function abrirUnidade(grupo) {
    setUnidade(grupo.chave);
    setFiltroUbs(grupo.nome);
    mudar(setModo, 'visitas');
  }

  function mudarPagina(proxima) {
    setPagina(proxima);
    document.getElementById('historico-resultados')?.focus({ preventScroll: true });
    document.getElementById('historico-resultados')?.scrollIntoView({ block: 'start' });
  }

  return (
    <div className="app-content space-y-4">
      <section className="field-card space-y-3" aria-label="Filtros do histórico">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="field-section">Filtrar histórico</h2>
          <button type="button" onClick={carregar} disabled={loading} className="app-secondary">
            <RefreshCw size={16} aria-hidden="true" /> Atualizar
          </button>
        </div>
        <div className="history-filters">
          <label className="grid gap-1 text-sm font-semibold">Período
            <select className="app-input" value={periodo} onChange={e => mudar(setPeriodo, e.target.value)}>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="todos">Todo o histórico</option>
              <option value="personalizado">Intervalo personalizado</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Frequência por unidade
            <select className="app-input" value={frequencia} onChange={e => mudar(setFrequencia, Number(e.target.value))}>
              <option value={1}>Qualquer frequência</option>
              <option value={2}>2 ou mais visitas no período</option>
              <option value={3}>3 ou mais visitas no período</option>
              <option value={5}>5 ou mais visitas no período</option>
            </select>
          </label>
          {periodo === 'personalizado' && <>
            <label className="grid gap-1 text-sm font-semibold">Data inicial
              <input type="date" className="app-input" value={inicio} onChange={e => mudar(setInicio, e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Data final
              <input type="date" className="app-input" value={fim} onChange={e => mudar(setFim, e.target.value)} />
            </label>
          </>}
          <label className="grid gap-1 text-sm font-semibold history-search">Unidade
            <span className="relative">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="search" className="app-input pl-9" placeholder="Buscar por nome" value={filtroUbs}
                onChange={e => { setUnidade(''); mudar(setFiltroUbs, e.target.value); }} />
            </span>
          </label>
        </div>
        {intervaloInvalido && <p role="alert" className="text-sm text-red-800">A data final deve ser igual ou posterior à inicial.</p>}
      </section>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="field-section scroll-mt-4" id="historico-resultados" tabIndex={-1}>
            {modo === 'visitas' ? 'Visitas' : 'Frequência por unidade'}
          </h2>
          <div className="history-switch" role="group" aria-label="Visualização do histórico">
            <button type="button" aria-pressed={modo === 'visitas'} onClick={() => mudar(setModo, 'visitas')}>Por visita</button>
            <button type="button" aria-pressed={modo === 'unidades'} onClick={() => mudar(setModo, 'unidades')}>Por unidade</button>
          </div>
        </div>
        {!loading && !erro && <p className="text-sm text-slate-600" aria-live="polite">
          {visitas.length} {visitas.length === 1 ? 'visita' : 'visitas'} no período
          {registros.length > 0 && ` · Exibindo ${deslocamento + 1}–${deslocamento + listagem.length} de ${registros.length}`}
        </p>}
        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw size={24} className="animate-spin mr-2" />
            <span className="text-sm font-bold">Carregando...</span>
          </div>
        )}

        {erro && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <AlertCircle size={20} />
            <div>
              <p className="text-xs font-black uppercase">Erro de conexão</p>
              <p className="text-xs">{erro}</p>
            </div>
            <button onClick={carregar} className="ml-auto text-xs font-bold underline">Tentar</button>
          </div>
        )}

        {!loading && !erro && !intervaloInvalido && listagem.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-black text-sm text-slate-500 uppercase">Nenhuma vistoria</p>
            <p className="text-sm mt-1">Experimente ampliar o período ou ajustar os filtros.</p>
          </div>
        )}

        {!loading && !erro && modo === 'unidades' && listagem.map(grupo => (
          <button key={grupo.chave} type="button" className="history-unit field-card" onClick={() => abrirUnidade(grupo)}>
            <span><strong>{grupo.nome}</strong><span className="block text-sm text-slate-600">Última visita no período · {formatData(grupo.ultima)}</span></span>
            <span className="status-pill">{grupo.total} {grupo.total === 1 ? 'visita' : 'visitas'}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
        {!loading && !erro && modo === 'visitas' && listagem.map((v, i) => {
          const falhasQtd = v.falhas ? v.falhas.split('|').filter(Boolean).length : 0;
          return (
            <button
              key={v.id ?? deslocamento + i}
              onClick={() => setSelecionada(v)}
              className="history-visit field-card"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${notaCor(v.notaVistoria)}`}>
                {v.notaVistoria ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800 truncate uppercase">{v.ubs || '—'}</p>
                <p className="text-xs text-slate-500 truncate">{v.encarregada} · {formatData(v.data)}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {falhasQtd > 0
                    ? <span className="text-[9px] font-black uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg">🚫 {falhasQtd} falha(s)</span>
                    : <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-lg">✅ Conforme</span>
                  }
                  {v.dataRetorno && (
                    <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-lg">📅 {formatData(v.dataRetorno)}</span>
                  )}
                </div>
              </div>

              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
          );
        })}
        {!loading && !erro && paginas > 1 && <nav className="history-pagination" aria-label="Páginas do histórico">
          <button type="button" className="app-secondary" disabled={paginaAtual === 1} onClick={() => mudarPagina(paginaAtual - 1)}>Anterior</button>
          <span className="text-sm text-slate-600">Página {paginaAtual} de {paginas}</span>
          <button type="button" className="app-secondary" disabled={paginaAtual === paginas} onClick={() => mudarPagina(paginaAtual + 1)}>Próxima</button>
        </nav>}
      </div>

    </div>
  );
}
