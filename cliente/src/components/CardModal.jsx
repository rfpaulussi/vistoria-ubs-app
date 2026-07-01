import React, { useRef, useEffect } from 'react';
import { X, Camera, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

function compressPhoto(dataUrl, callback) {
  const img = new Image();
  img.onload = () => {
    const MAX = 1200;
    let w = img.width, h = img.height;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.65));
  };
  img.src = dataUrl;
}

export default function CardModal({ perguntaId, onClose }) {
  const { PERGUNTAS, respostas, updateResposta, pauseTimer, resumeTimer } = useApp();
  const pergunta = PERGUNTAS.find(p => p.id === perguntaId);
  const resposta = respostas[perguntaId];
  const fileRef = useRef(null);
  const fileBeforeRef = useRef(null);

  useEffect(() => {
    pauseTimer();
    return () => resumeTimer();
  }, []);

  if (!pergunta || !resposta) return null;

  const handlePhoto = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      compressPhoto(reader.result, compressed => {
        updateResposta(perguntaId, field, compressed);
      });
    };
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

        {/* Antes / Depois */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Antes */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">📷 Antes</p>
            <div
              className="h-32 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-slate-50 active:bg-slate-100"
              onClick={() => fileBeforeRef.current?.click()}
            >
              {resposta.photoBefore
                ? <img src={resposta.photoBefore} className="w-full h-full object-cover" alt="Antes" />
                : <div className="text-center text-slate-300"><Camera size={20} className="mx-auto mb-0.5" /><p className="text-[9px] font-black uppercase">Galeria</p></div>
              }
            </div>
            {resposta.photoBefore && (
              <button className="mt-1 text-[9px] text-red-400 font-bold uppercase" onClick={() => updateResposta(perguntaId, 'photoBefore', null)}>Remover</button>
            )}
            <input ref={fileBeforeRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e, 'photoBefore')} />
          </div>

          {/* Depois */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">📸 Depois</p>
            <div
              className="h-32 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-slate-50 active:bg-slate-100"
              onClick={() => fileRef.current?.click()}
            >
              {resposta.photo
                ? <img src={resposta.photo} className="w-full h-full object-cover" alt="Depois" />
                : <div className="text-center text-slate-300"><Camera size={20} className="mx-auto mb-0.5" /><p className="text-[9px] font-black uppercase">Câmera</p></div>
              }
            </div>
            {resposta.photo && (
              <button className="mt-1 text-[9px] text-red-400 font-bold uppercase" onClick={() => updateResposta(perguntaId, 'photo', null)}>Remover</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhoto(e, 'photo')} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-teal-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Check size={16} /> Salvar e Fechar
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}
