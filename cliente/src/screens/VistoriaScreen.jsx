import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useApp, UBS_LIST, campanhaAtual } from '../context/AppContext';

const campanha = campanhaAtual();
import BentoCard from '../components/BentoCard';
import CardModal from '../components/CardModal';
import { salvarVistoria } from '../lib/sheets';
import { salvarFirestore } from '../lib/firebase';

export default function VistoriaScreen() {
  const { meta, updateMeta, respostas, updateResposta, contadores, PERGUNTAS, setScreen } = useApp();
  const [modalId, setModalId] = useState(null);
  const [loading, setLoading] = useState(false);

  const canFinish = contadores.pending === 0 && meta.ubs.trim() && meta.encarregada.trim();

  const handleAnswer = (id, status) => updateResposta(id, 'status', status);

  const handleFinish = async () => {
    if (!canFinish || loading) return;
    setLoading(true);

    const horaFim = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const falhasTexto = PERGUNTAS
      .filter(p => respostas[p.id].status === p.trigger)
      .map(p => `${p.label}: ${respostas[p.id].reason || 'Sem justificativa'}`)
      .join(' | ');

    const dados = {
      ...meta,
      horaFim,
      dataFinalizacao: new Date().toLocaleString('pt-BR'),
      falhas: falhasTexto,
    };

    await salvarVistoria(dados);
    await salvarFirestore({ ...dados, respostas });

    setLoading(false);
    setScreen('relatorio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Campaign banner */}
      <div className="px-4 py-2 flex items-center gap-2 text-xs font-black" style={{ backgroundColor: campanha.cor + '18', color: campanha.cor, borderBottom: `2px solid ${campanha.cor}30` }}>
        <span>{campanha.emoji}</span>
        <span className="uppercase tracking-wide">{campanha.nome}</span>
        <span className="font-normal opacity-70">— {campanha.desc}</span>
      </div>

      {/* Identification inputs */}
      <div className="px-3 pt-3 pb-2 bg-white border-b border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <select
            className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
            value={meta.ubs}
            onChange={e => updateMeta('ubs', e.target.value)}
          >
            <option value="">Unidade UBS *</option>
            {UBS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input
            type="text"
            placeholder="Encarregada *"
            className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            value={meta.encarregada}
            onChange={e => updateMeta('encarregada', e.target.value)}
          />
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 auto-rows-[minmax(140px,auto)] gap-3 p-3">
        {PERGUNTAS.map(pergunta => (
          <BentoCard
            key={pergunta.id}
            pergunta={pergunta}
            status={respostas[pergunta.id].status}
            reason={respostas[pergunta.id].reason}
            hasPhoto={!!respostas[pergunta.id].photo}
            onAnswer={handleAnswer}
            onReasonChange={(id, val) => updateResposta(id, 'reason', val)}
            onLongPress={setModalId}
          />
        ))}
      </div>

      {/* Final evaluation block */}
      <div className="mx-3 mb-3 bg-slate-900 text-white rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black uppercase text-teal-400 tracking-widest">Avaliação Final</p>

        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 text-center">Nota da Unidade (0–10)</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => updateMeta('notaVistoria', n)}
                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${
                  meta.notaVistoria === n
                    ? 'bg-teal-500 text-slate-900 scale-110 shadow-lg'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Previsão de Retorno</p>
          <input
            type="date"
            className="w-full bg-slate-800 text-white text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
            value={meta.dataRetorno}
            onChange={e => updateMeta('dataRetorno', e.target.value)}
          />
        </div>

        <textarea
          rows={3}
          className="w-full bg-slate-800 text-white text-sm rounded-xl p-3 resize-none outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Considerações gerais..."
          value={meta.consideracoesGerais}
          onChange={e => updateMeta('consideracoesGerais', e.target.value)}
        />

        <button
          onClick={handleFinish}
          disabled={!canFinish || loading}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            canFinish && !loading
              ? 'bg-teal-500 text-slate-900 active:scale-95 shadow-lg shadow-teal-900/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <Send size={18} />
          }
          {contadores.pending > 0
            ? `Aguardando ${contadores.pending} item(s)`
            : 'FINALIZAR VISTORIA'
          }
        </button>
      </div>

      {modalId && <CardModal perguntaId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
