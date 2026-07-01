import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { buscarVistorias } from '../lib/sheets';

function notaCor(n) {
  if (n >= 8) return { bg: 'bg-teal-700', text: 'text-teal-700', bar: '#0f766e' };
  if (n >= 6) return { bg: 'bg-amber-500', text: 'text-amber-600', bar: '#d97706' };
  return { bg: 'bg-red-600', text: 'text-red-600', bar: '#dc2626' };
}

function parseFalhas(raw) {
  if (!raw) return [];
  return raw.split('|').map(f => f.trim()).filter(Boolean);
}

function formatMes(isoOrBr) {
  if (!isoOrBr) return '—';
  const str = String(isoOrBr);
  // "DD/MM/YYYY HH:mm:ss" or ISO
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length >= 2) return `${parts[1].padStart(2,'0')}/${parts[2]?.slice(0,4) ?? '??'}`;
  }
  const d = new Date(isoOrBr);
  if (!isNaN(d)) return d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return str.slice(0, 7);
}

function computeStats(vistorias) {
  if (!vistorias.length) return null;

  // Per-UBS stats
  const ubsMap = {};
  vistorias.forEach(v => {
    const ubs = v.ubs || 'Desconhecida';
    if (!ubsMap[ubs]) ubsMap[ubs] = { notas: [], falhaLabels: [] };
    const n = Number(v.notaVistoria);
    if (!isNaN(n)) ubsMap[ubs].notas.push(n);
    parseFalhas(v.falhas).forEach(f => {
      // Extract label (before the colon)
      const label = f.split(':')[0].trim();
      if (label) ubsMap[ubs].falhaLabels.push(label);
    });
  });

  const ubsStats = Object.entries(ubsMap).map(([ubs, d]) => {
    const media = d.notas.length ? d.notas.reduce((a, b) => a + b, 0) / d.notas.length : null;
    return { ubs, media, qtd: d.notas.length, falhaLabels: d.falhaLabels };
  }).filter(u => u.media !== null).sort((a, b) => b.media - a.media);

  // Overall trend by month
  const mesMap = {};
  vistorias.forEach(v => {
    const mes = formatMes(v.data || v.dataFinalizacao);
    if (!mesMap[mes]) mesMap[mes] = { notas: [], falhas: 0 };
    const n = Number(v.notaVistoria);
    if (!isNaN(n)) mesMap[mes].notas.push(n);
    mesMap[mes].falhas += parseFalhas(v.falhas).length;
  });
  const tendencia = Object.entries(mesMap)
    .map(([mes, d]) => ({
      mes,
      media: d.notas.length ? d.notas.reduce((a, b) => a + b, 0) / d.notas.length : null,
      falhas: d.falhas,
      qtd: d.notas.length,
    }))
    .filter(m => m.media !== null)
    .slice(-6); // last 6 months

  // Falha frequency ranking
  const falhaCount = {};
  vistorias.forEach(v => {
    parseFalhas(v.falhas).forEach(f => {
      const label = f.split(':')[0].trim();
      if (label) falhaCount[label] = (falhaCount[label] || 0) + 1;
    });
  });
  const falhasRanking = Object.entries(falhaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  // Summary numbers
  const todasNotas = vistorias.map(v => Number(v.notaVistoria)).filter(n => !isNaN(n));
  const mediaGeral = todasNotas.length ? todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length : null;
  const conformes = vistorias.filter(v => parseFalhas(v.falhas).length === 0).length;

  return { ubsStats, tendencia, falhasRanking, mediaGeral, conformes, total: vistorias.length };
}

export default function KPIsScreen() {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState('ranking'); // 'ranking' | 'tendencia' | 'falhas'

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const dados = await buscarVistorias();
      setVistorias(dados);
    } catch {
      setErro('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const stats = computeStats(vistorias);
  const maxMedia = stats ? Math.max(...stats.ubsStats.map(u => u.media)) : 10;
  const maxFalha = stats ? (stats.falhasRanking[0]?.count || 1) : 1;
  const maxMesMedia = stats ? Math.max(...stats.tendencia.map(t => t.media)) : 10;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-teal-700 text-white px-4 pt-4 pb-3 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Métricas</p>
            <p className="text-sm font-black">
              {loading ? 'Carregando...' : stats ? `${stats.total} vistoria(s) analisada(s)` : 'Sem dados'}
            </p>
          </div>
          <button onClick={carregar} disabled={loading} className="p-2 opacity-80 active:opacity-100">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-teal-800/50 rounded-xl p-1">
          {[
            { key: 'ranking', label: 'Ranking' },
            { key: 'tendencia', label: 'Tendência' },
            { key: 'falhas', label: 'Falhas' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                aba === t.key ? 'bg-white text-teal-700' : 'text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pt-3">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={24} className="animate-spin mr-2" />
            <span className="text-sm font-bold">Carregando...</span>
          </div>
        )}

        {erro && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <AlertCircle size={20} />
            <div className="flex-1">
              <p className="text-xs font-black uppercase">Erro de conexão</p>
              <p className="text-xs">{erro}</p>
            </div>
            <button onClick={carregar} className="text-xs font-bold underline">Tentar</button>
          </div>
        )}

        {!loading && !erro && !stats && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-black text-sm text-slate-500 uppercase">Sem dados ainda</p>
            <p className="text-xs mt-1">Realize vistorias para ver as métricas</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Média Geral</p>
                <p className={`text-2xl font-black ${notaCor(stats.mediaGeral).text}`}>
                  {stats.mediaGeral?.toFixed(1) ?? '—'}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Conformes</p>
                <p className="text-2xl font-black text-teal-700">
                  {stats.total ? Math.round((stats.conformes / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Unidades</p>
                <p className="text-2xl font-black text-slate-700">{stats.ubsStats.length}</p>
              </div>
            </div>

            {/* TAB: RANKING */}
            {aba === 'ranking' && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 px-1 mb-2">Nota média por unidade</p>
                {stats.ubsStats.map((u, i) => {
                  const cor = notaCor(u.media);
                  const pct = Math.round((u.media / 10) * 100);
                  return (
                    <div key={u.ubs} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 ${cor.bg}`}>
                          {i + 1}
                        </span>
                        <p className="text-xs font-black text-slate-800 flex-1 leading-tight uppercase truncate">{u.ubs}</p>
                        <span className={`text-base font-black ${cor.text}`}>{u.media.toFixed(1)}</span>
                      </div>
                      {/* CSS bar */}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cor.bar }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">{u.qtd} vistoria(s)</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: TENDENCIA */}
            {aba === 'tendencia' && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 px-1 mb-2">Média mensal (últimos 6 meses)</p>
                {stats.tendencia.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Dados insuficientes</div>
                ) : (
                  <>
                    {/* Bar chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-3">
                      <div className="flex items-end gap-2 h-32">
                        {stats.tendencia.map((t, i) => {
                          const cor = notaCor(t.media);
                          const heightPct = maxMesMedia > 0 ? (t.media / 10) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className={`text-[9px] font-black ${cor.text}`}>{t.media.toFixed(1)}</span>
                              <div className="w-full flex items-end" style={{ height: '80px' }}>
                                <div
                                  className="w-full rounded-t-lg transition-all duration-500"
                                  style={{ height: `${heightPct}%`, backgroundColor: cor.bar }}
                                />
                              </div>
                              <span className="text-[8px] text-slate-400 text-center leading-tight">{t.mes}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monthly detail list */}
                    <div className="space-y-2">
                      {[...stats.tendencia].reverse().map((t, i) => {
                        const cor = notaCor(t.media);
                        const prev = stats.tendencia[stats.tendencia.length - 2 - i];
                        const delta = prev ? t.media - prev.media : null;
                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${cor.bg}`}>
                              {t.media.toFixed(1)}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black text-slate-700">{t.mes}</p>
                              <p className="text-[9px] text-slate-400">{t.qtd} vistoria(s) · {t.falhas} falha(s)</p>
                            </div>
                            {delta !== null && (
                              <div className={`flex items-center gap-0.5 text-[10px] font-black ${delta > 0 ? 'text-teal-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '='}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: FALHAS */}
            {aba === 'falhas' && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 px-1 mb-2">Não conformidades mais frequentes</p>
                {stats.falhasRanking.length === 0 ? (
                  <div className="bg-teal-50 border border-teal-100 rounded-2xl p-8 text-center">
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-xs font-black text-teal-700 uppercase">Nenhuma falha registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.falhasRanking.map((f, i) => {
                      const pct = Math.round((f.count / maxFalha) * 100);
                      const intensity = pct > 66 ? 'bg-red-600' : pct > 33 ? 'bg-amber-500' : 'bg-slate-400';
                      return (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-black text-slate-400 w-4 shrink-0">#{i + 1}</span>
                            <p className="text-xs font-black text-slate-800 flex-1 leading-tight">{f.label}</p>
                            <span className="text-xs font-black text-slate-600 shrink-0">{f.count}×</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${intensity}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
