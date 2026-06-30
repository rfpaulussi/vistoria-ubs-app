import React, { useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CardModal({ perguntaId, onClose }) {
  const { PERGUNTAS, respostas, updateResposta } = useApp();
  const pergunta = PERGUNTAS.find(p => p.id === perguntaId);
  const resposta = respostas[perguntaId];
  const fileRef = useRef(null);

  if (!pergunta || !resposta) return null;

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateResposta(perguntaId, 'photo', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-1">
          <h3 className="font-black text-sm uppercase text-slate-800 flex-1 pr-3 leading-tight">
            {pergunta.label}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{pergunta.desc}</p>

        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block tracking-wider">
          Observação
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm mb-4 resize-none outline-none focus:ring-2 focus:ring-teal-400"
          rows={3}
          placeholder="Observações adicionais..."
          value={resposta.reason}
          onChange={e => updateResposta(perguntaId, 'reason', e.target.value)}
        />

        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block tracking-wider">
          Foto de Evidência
        </label>
        <div
          className="w-full h-44 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer bg-slate-50 active:bg-slate-100"
          onClick={() => fileRef.current?.click()}
        >
          {resposta.photo
            ? <img src={resposta.photo} className="w-full h-full object-cover" alt="Evidência" />
            : (
              <div className="text-center text-slate-400">
                <Camera size={28} className="mx-auto mb-1" />
                <p className="text-[10px] font-black uppercase">Tirar Foto</p>
              </div>
            )
          }
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />

        {resposta.photo && (
          <button
            className="mt-2 text-[10px] text-red-400 font-bold uppercase"
            onClick={() => updateResposta(perguntaId, 'photo', null)}
          >
            Remover foto
          </button>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
