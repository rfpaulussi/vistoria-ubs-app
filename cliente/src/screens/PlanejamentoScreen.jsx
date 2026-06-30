import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Share2, Settings, X, AlertTriangle, RotateCcw } from 'lucide-react';

const UNIDADES = [
  'UBS PONTE GRANDE', 'UBS BRAZ CUBAS', 'UBS VILA SUISSA', 'CECCO',
  'UBS BOTUJURU', 'UBS VILA MORAES', 'UBS VILA JUNDIAÍ', 'ZOONOZES',
  'UBS JARDIM CAMILA', 'UBS JARDIM IVETE', 'UBS SANTA TERESA', 'EMESP',
  'UBS MINERAÇÃO', 'UBS JUNDIAPEBA', 'CURE/CEADIM', 'CAPS INFANTIL/CIAS',
  'CAPS 2', 'UBS SABAUNA', 'UAPS 1', 'UAPS 2',
  'SECRETARIA DE SAÚDE', 'PROMEG', 'PRÓ HIPER', 'ALMOXARIFADO SAÚDE',
  'PRÓ MULHER', 'UBS SANTO ÂNGELO', 'UBS VILA APARECIDA', 'CENTRO POP',
  'UBS VILA DA PRATA', 'UBS VILA NATAL',
];

const FERIADOS = new Set([
  '2026-01-01','2026-02-16','2026-02-17','2026-04-03','2026-04-21',
  '2026-05-01','2026-06-04','2026-07-09','2026-07-26','2026-09-01',
  '2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25',
]);

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isUtil(d, extraExcecoes) {
  const dia = d.getDay();
  const iso = isoDate(d);
  return dia >= 1 && dia <= 5 && !FERIADOS.has(iso) && !extraExcecoes.has(iso);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function inicioSemana(date) {
  const d = new Date(date);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function loadState() {
  try {
    const raw = localStorage.getItem('planejamento_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  const today = new Date();
  today.setHours(0,0,0,0);
  return { startIso: isoDate(today), startIndex: 0, excecoes: [] };
}

function saveState(cfg) {
  localStorage.setItem('planejamento_config', JSON.stringify(cfg));
}

function gerarRoteiro(startIso, startIndex, excecoes, numDias = 90) {
  const excSet = new Set(excecoes.map(e => e.iso));
  const parts = startIso.split('-');
  let cur = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]), 12);
  const resultado = [];
  let contador = startIndex;
  while (resultado.length < numDias) {
    if (isUtil(cur, excSet)) {
      resultado.push({ iso: isoDate(cur), date: new Date(cur), ubs: UNIDADES[contador % UNIDADES.length] });
      contador++;
    }
    cur = addDays(cur, 1);
  }
  return resultado;
}

// ─── Painel de configuração ────────────────────────────────────────────────
function ConfigModal({ config, onSave, onClose }) {
  const [startIso, setStartIso] = useState(config.startIso);
  const [startIndex, setStartIndex] = useState(config.startIndex);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-4" />
        <div className="px-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ajuste de Roteiro</p>
              <h2 className="font-black text-lg text-slate-800">Sincronizar Operação</h2>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
          </div>

          <p className="text-xs text-slate-500 mb-4">A partir de qual data e unidade o roteiro deve recomeçar?</p>

          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data de início</label>
          <input
            type="date"
            value={startIso}
            onChange={e => setStartIso(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none mb-4"
          />

          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Bloco inicial (unidade)</label>
          <select
            value={startIndex}
            onChange={e => setStartIndex(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none mb-6 bg-white"
          >
            {UNIDADES.map((u, i) => (
              <option key={i} value={i}>#{i+1} — {u}</option>
            ))}
          </select>

          <button
            onClick={() => onSave({ startIso, startIndex: Number(startIndex) })}
            className="w-full bg-teal-700 text-white font-black rounded-2xl py-4 text-sm"
          >
            Sincronizar Roteiro
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Painel de exceção ────────────────────────────────────────────────────
function ExcecaoModal({ roteiro, config, onSave, onClose }) {
  const [dataIso, setDataIso] = useState('');

  const diaSelecionado = roteiro.find(d => d.iso === dataIso);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-4" />
        <div className="px-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Imprevisto</p>
              <h2 className="font-black text-lg text-slate-800">Lançar Exceção</h2>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
          </div>

          <p className="text-xs text-slate-500 mb-4">Qual data a vistoria foi suspensa? A unidade será empurrada para o próximo dia útil disponível.</p>

          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data da suspensão</label>
          <input
            type="date"
            value={dataIso}
            onChange={e => setDataIso(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none mb-4"
          />

          {diaSelecionado && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-red-700">Vistoria suspensa:</p>
                <p className="text-sm font-black text-slate-800">{diaSelecionado.ubs}</p>
              </div>
            </div>
          )}

          <button
            disabled={!dataIso}
            onClick={() => onSave(dataIso)}
            className="w-full bg-red-600 text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40"
          >
            Empurrar Fila
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────
export default function PlanejamentoScreen() {
  const [config, setConfig] = useState(loadState);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [showExcecao, setShowExcecao] = useState(false);
  const [copied, setCopied] = useState(false);

  const roteiro = useMemo(
    () => gerarRoteiro(config.startIso, config.startIndex, config.excecoes),
    [config]
  );

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayIso = isoDate(today);

  const semanaBase = useMemo(() => {
    const base = inicioSemana(today);
    base.setDate(base.getDate() + semanaOffset * 7);
    return base;
  }, [today, semanaOffset]);

  const diasSemana = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(semanaBase, i));
  }, [semanaBase]);

  const semanaLabel = useMemo(() => {
    const fim = addDays(semanaBase, 4);
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    return `${fmt(semanaBase)} — ${fmt(fim)}`;
  }, [semanaBase]);

  const roteiroMap = useMemo(() => {
    const m = {};
    roteiro.forEach(r => { m[r.iso] = r.ubs; });
    return m;
  }, [roteiro]);

  const excSet = useMemo(() => new Set(config.excecoes.map(e => e.iso)), [config.excecoes]);

  const handleSaveConfig = useCallback(({ startIso, startIndex }) => {
    const next = { ...config, startIso, startIndex };
    setConfig(next);
    saveState(next);
    setShowConfig(false);
  }, [config]);

  const handleExcecao = useCallback((dataIso) => {
    const novas = [...config.excecoes, { iso: dataIso }];
    const next = { ...config, excecoes: novas };
    setConfig(next);
    saveState(next);
    setShowExcecao(false);
  }, [config]);

  const handleReset = () => {
    const base = { startIso: todayIso, startIndex: 0, excecoes: [] };
    setConfig(base);
    saveState(base);
  };

  const handleShare = () => {
    const proximos = roteiro.slice(0, 7);
    let txt = '📋 *Informativo Operacional | Roteiro de Vistorias*\n\nSegue a programação dos próximos dias:\n\n';
    proximos.forEach(({ date, ubs }) => {
      const d = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
      txt += `📍 *${DIAS_FULL[date.getDay()]} (${d}):* ${ubs}\n`;
    });
    txt += '\n⚠️ _Em caso de intercorrências, o roteiro avança sequencialmente._';
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-teal-700 text-white px-4 pt-4 pb-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Roteiro Operacional</p>
            <p className="text-sm font-black">{semanaLabel}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setShowExcecao(true); setShowConfig(false); }} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
              <AlertTriangle size={16} />
            </button>
            <button onClick={() => { setShowConfig(true); setShowExcecao(false); }} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
              <Settings size={16} />
            </button>
            <button onClick={handleShare} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
              <Share2 size={16} />
            </button>
          </div>
        </div>
        {copied && <p className="text-[10px] font-black bg-white/20 rounded-lg px-2 py-1 text-center">✅ Copiado! Cole no WhatsApp.</p>}

        {/* Navegação de semana */}
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setSemanaOffset(o => o-1)} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setSemanaOffset(0)} className="text-xs font-black bg-white/20 px-4 py-1.5 rounded-xl active:bg-white/30">
            Hoje
          </button>
          <button onClick={() => setSemanaOffset(o => o+1)} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Cards da semana */}
      <div className="px-3 pt-3 space-y-2">
        {diasSemana.map((d) => {
          const iso = isoDate(d);
          const isToday = iso === todayIso;
          const isPast = d < today;
          const isFer = FERIADOS.has(iso);
          const isExc = excSet.has(iso);
          const ubs = roteiroMap[iso];

          let estado = 'normal';
          if (isFer) estado = 'feriado';
          else if (isExc) estado = 'excecao';
          else if (isPast && ubs) estado = 'passado';

          return (
            <div
              key={iso}
              className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                isToday
                  ? 'bg-teal-700 border-teal-600 shadow-lg shadow-teal-900/20'
                  : estado === 'excecao'
                  ? 'bg-red-50 border-red-200'
                  : estado === 'feriado'
                  ? 'bg-amber-50 border-amber-200'
                  : estado === 'passado'
                  ? 'bg-white border-slate-100 opacity-50'
                  : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              {/* Data */}
              <div className={`text-center w-12 shrink-0 ${isToday ? 'text-white' : 'text-slate-500'}`}>
                <p className={`text-[9px] font-black uppercase ${isToday ? 'opacity-70' : 'text-slate-400'}`}>
                  {DIAS_SEMANA[d.getDay()]}
                </p>
                <p className="text-2xl font-black leading-none">{d.getDate()}</p>
                <p className={`text-[9px] ${isToday ? 'opacity-70' : 'text-slate-400'}`}>
                  {String(d.getMonth()+1).padStart(2,'0')}/{d.getFullYear().toString().slice(-2)}
                </p>
              </div>

              {/* Divisor */}
              <div className={`w-px h-10 shrink-0 ${isToday ? 'bg-white/30' : 'bg-slate-200'}`} />

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                {estado === 'feriado' ? (
                  <>
                    <p className="text-[9px] font-black uppercase text-amber-600 mb-0.5">Feriado</p>
                    <p className="text-xs text-amber-700 font-bold">Sem vistoria</p>
                  </>
                ) : estado === 'excecao' ? (
                  <>
                    <p className="text-[9px] font-black uppercase text-red-500 mb-0.5">Exceção registrada</p>
                    <p className="text-xs text-red-600 font-bold">Fila empurrada</p>
                  </>
                ) : ubs ? (
                  <>
                    <p className={`text-[9px] font-black uppercase mb-0.5 ${isToday ? 'text-white/60' : 'text-slate-400'}`}>
                      {isToday ? '▶ Hoje' : estado === 'passado' ? 'Realizado' : 'Previsto'}
                    </p>
                    <p className={`font-black text-sm leading-tight ${isToday ? 'text-white' : 'text-slate-800'}`}>
                      {ubs}
                    </p>
                  </>
                ) : (
                  <p className={`text-xs font-bold ${isToday ? 'text-white/60' : 'text-slate-400'}`}>—</p>
                )}
              </div>

              {/* Indicador hoje */}
              {isToday && (
                <div className="w-2 h-2 rounded-full bg-white shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Próximas semanas — resumo */}
      <div className="px-3 mt-4">
        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 px-1">Próximas unidades</p>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {roteiro.filter(r => r.date > today).slice(0, 10).map((r, i) => (
            <div key={r.iso} className={`flex items-center gap-3 px-4 py-3 ${i < 9 ? 'border-b border-slate-50' : ''}`}>
              <div className="text-center w-10 shrink-0">
                <p className="text-[9px] text-slate-400 uppercase">{DIAS_SEMANA[r.date.getDay()]}</p>
                <p className="text-sm font-black text-slate-600">{r.date.getDate()}</p>
              </div>
              <p className="text-xs font-bold text-slate-700 truncate">{r.ubs}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleReset}
          className="mt-3 w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 py-3"
        >
          <RotateCcw size={12} />
          Redefinir roteiro para hoje
        </button>
      </div>

      {showConfig && (
        <ConfigModal config={config} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
      {showExcecao && (
        <ExcecaoModal roteiro={roteiro} config={config} onSave={handleExcecao} onClose={() => setShowExcecao(false)} />
      )}
    </div>
  );
}
