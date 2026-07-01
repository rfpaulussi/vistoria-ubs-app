import React from 'react';
import { Printer, MessageSquare, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function RelatorioScreen() {
  const { meta, respostas, PERGUNTAS, resetVistoria } = useApp();

  const irregularidades = PERGUNTAS
    .filter(p => respostas[p.id].status === p.trigger)
    .map(p => ({ ...p, ...respostas[p.id] }));

  const compartilharWhatsApp = () => {
    const falhas = irregularidades
      .map(p => `• ${p.label}: ${p.reason || 'Sem justificativa'}`)
      .join('\n');
    const texto = [
      `🚨 *RELATÓRIO DE VISTORIA: ${meta.ubs.toUpperCase()}*`,
      `👤 Encarregada: ${meta.encarregada}`,
      `⭐ Nota: *${meta.notaVistoria}/10*`,
      `📅 Retorno: ${meta.dataRetorno ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}`,
      '',
      `⚠️ *PRINCIPAIS FALHAS:*`,
      falhas || 'Nenhuma falha crítica registrada.',
      '',
      `📝 *OBS:* ${meta.consideracoesGerais || 'Consultar relatório.'}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
      <div id="relatorio-pdf" className="bg-white max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6 pb-6 border-b-2 border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Relatório de Vistoria
          </p>
          <h2 className="text-3xl font-black uppercase text-slate-900 leading-tight">
            {meta.ubs || 'Unidade não informada'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {meta.encarregada} · {meta.dataVistoria.split('-').reverse().join('/')}
          </p>
        </div>

        {/* Nota */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900 text-white p-5 rounded-3xl text-center min-w-[120px]">
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1">Nota Final</p>
            <span className="text-5xl font-black">{meta.notaVistoria}</span>
          </div>
        </div>

        {/* Bento read-only grid */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {PERGUNTAS.map(p => {
            const r = respostas[p.id];
            return (
              <div
                key={p.id}
                className={`col-span-1 rounded-2xl p-3 ${
                  r.status === 'sim' ? 'bg-teal-700 text-white' :
                  r.status === 'nao' ? 'bg-red-700 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}
              >
                <p className="text-[10px] font-black uppercase leading-tight">{p.label}</p>
                <p className="mt-1 text-lg">
                  {r.status === 'sim' ? '✅' : r.status === 'nao' ? '🚫' : '⚠️'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Falhas */}
        <section className="mb-8">
          <h3 className="font-black text-lg border-l-8 border-red-500 pl-3 uppercase text-red-700 mb-4">
            Falhas Registradas
          </h3>
          {irregularidades.length === 0
            ? (
              <div className="p-8 bg-slate-50 rounded-3xl text-center text-slate-400 font-bold uppercase text-xs border border-slate-200">
                Unidade Conforme ✅
              </div>
            )
            : (
              <div className="space-y-4">
                {irregularidades.map(p => (
                  <div key={p.id} className={`p-4 rounded-2xl border-2 ${p.requiresVolante ? 'border-amber-300 bg-amber-50' : 'border-red-100 bg-red-50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-black text-xs uppercase text-slate-700">{p.label}</p>
                      {p.requiresVolante && (
                        <span className="shrink-0 bg-amber-400 text-amber-900 text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap">
                          🚐 Equipe Volante
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 italic">
                      "{p.reason || 'Sem justificativa.'}"
                    </p>
                    {p.photo && (
                      <img
                        src={p.photo}
                        className="rounded-xl mt-3 w-full max-h-48 object-cover border border-red-200"
                        alt="Evidência"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </section>

        {/* Considerações */}
        {meta.consideracoesGerais && (
          <section className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-black uppercase text-slate-500 mb-2">Considerações Gerais</p>
            <p className="text-sm text-slate-600 italic">{meta.consideracoesGerais}</p>
          </section>
        )}

        {/* Retorno */}
        <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">
            Previsão de Retorno
          </p>
          <p className="text-xl font-black uppercase text-slate-800">
            {meta.dataRetorno
              ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR')
              : 'A DEFINIR'
            }
          </p>
        </div>
      </div>

      {/* Fixed action buttons */}
      <div className="print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex gap-3 shadow-lg z-50">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
        >
          <Printer size={16} /> PDF
        </button>
        <button
          onClick={compartilharWhatsApp}
          className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
        >
          <MessageSquare size={16} /> WhatsApp
        </button>
        <button
          onClick={resetVistoria}
          className="flex-1 bg-white text-slate-700 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-slate-200 active:scale-95"
        >
          <ArrowLeft size={16} /> Nova
        </button>
      </div>
    </div>
  );
}
