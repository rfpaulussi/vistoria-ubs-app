import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { buscarVistorias } from '../lib/sheets';

function notaCor(nota) {
  const n = Number(nota);
  if (n >= 8) return 'bg-teal-700 text-white';
  if (n >= 6) return 'bg-amber-500 text-white';
  return 'bg-red-600 text-white';
}

function formatData(raw) {
  if (!raw) return '—';
  if (typeof raw === 'string' && raw.includes('/')) return raw.split(' ')[0];
  const d = new Date(raw);
  if (isNaN(d)) return String(raw);
  return d.toLocaleDateString('pt-BR');
}

function DetalheModal({ vistoria, onClose }) {
  const falhasLista = vistoria.falhas
    ? vistoria.falhas.split('|').map(f => f.trim()).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-3" />

        <div className="px-5 pb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Relatório Histórico</p>
              <h2 className="text-xl font-black uppercase text-slate-900 leading-tight">{vistoria.ubs}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{vistoria.encarregada} · {formatData(vistoria.data)}</p>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 mt-1">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-3 mb-5">
            <div className={`rounded-2xl px-4 py-3 text-center ${notaCor(vistoria.notaVistoria)}`}>
              <p className="text-[9px] font-black uppercase opacity-80 mb-0.5">Nota</p>
              <p className="text-3xl font-black leading-none">{vistoria.notaVistoria ?? '—'}</p>
            </div>
            {vistoria.dataRetorno && (
              <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Retorno</p>
                <p className="text-sm font-black text-slate-700">{formatData(vistoria.dataRetorno)}</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-[10px] font-black uppercase text-red-600 mb-2">🚫 Falhas Registradas</p>
            {falhasLista.length === 0
              ? <div className="bg-teal-50 text-teal-700 rounded-2xl p-4 text-xs font-bold text-center">✅ Unidade Conforme</div>
              : <div className="space-y-2">
                  {falhasLista.map((f, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-slate-700">{f}</div>
                  ))}
                </div>
            }
          </div>

          {vistoria.consideracoesGerais && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Observações</p>
              <p className="text-sm text-slate-600 italic">{vistoria.consideracoesGerais}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoricoScreen() {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroUbs, setFiltroUbs] = useState('');
  const [filtroData, setFiltroData] = useState('');
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

  const listagem = vistorias.filter(v => {
    const ubsOk = !filtroUbs || (v.ubs ?? '').toLowerCase().includes(filtroUbs.toLowerCase());
    const dataOk = !filtroData || String(v.data ?? '').includes(filtroData);
    return ubsOk && dataOk;
  });

  const ubsUnicas = [...new Set(vistorias.map(v => v.ubs).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-teal-700 text-white px-4 pt-4 pb-3 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Histórico</p>
            <p className="text-sm font-black">
              {loading ? 'Carregando...' : `${listagem.length} vistoria(s)`}
            </p>
          </div>
          <button onClick={carregar} disabled={loading} className="p-2 opacity-80 active:opacity-100">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Filtrar por UBS..."
              value={filtroUbs}
              onChange={e => setFiltroUbs(e.target.value)}
              className="w-full bg-white/20 text-white placeholder-white/50 text-xs rounded-xl pl-7 pr-3 py-2 outline-none"
              list="ubs-list"
            />
            <datalist id="ubs-list">
              {ubsUnicas.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          <input
            type="date"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="bg-white/20 text-white text-xs rounded-xl px-3 py-2 outline-none w-[130px]"
          />
        </div>
      </div>

      <div className="px-3 pt-3 space-y-2">
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

        {!loading && !erro && listagem.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-black text-sm text-slate-500 uppercase">Nenhuma vistoria</p>
            <p className="text-xs mt-1">{filtroUbs || filtroData ? 'Ajuste os filtros' : 'Ainda não há registros'}</p>
          </div>
        )}

        {!loading && listagem.map((v, i) => {
          const falhasQtd = v.falhas ? v.falhas.split('|').filter(Boolean).length : 0;
          return (
            <button
              key={i}
              onClick={() => setSelecionada(v)}
              className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
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
      </div>

      {selecionada && (
        <DetalheModal vistoria={selecionada} onClose={() => setSelecionada(null)} />
      )}
    </div>
  );
}
