import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

const STATUS_CARD = {
  pending: 'bg-slate-100 border-slate-200',
  sim:     'bg-teal-700 border-teal-700 text-white',
  nao:     'bg-red-700 border-red-700 text-white',
  na:      'border-slate-300',
};

const STATUS_ICON = { sim: '✅', nao: '🚫', na: '⚠️', pending: null };

const BTN_BASE = 'flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95';

function AnswerBtn({ opt, currentStatus, onClick }) {
  const label = opt === 'sim' ? 'S' : opt === 'nao' ? 'N' : 'NA';
  const isActive = currentStatus === opt;
  const isPending = currentStatus === 'pending';

  return (
    <button
      onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(opt); }}
      className={`${BTN_BASE} ${
        isActive
          ? 'bg-white/30 text-white shadow-inner scale-105'
          : isPending
            ? 'bg-white border border-slate-200 text-slate-500'
            : 'bg-white/20 text-white/80'
      }`}
    >
      {label}
    </button>
  );
}

export default function BentoCard({
  pergunta,
  status,
  reason,
  hasPhoto,
  onAnswer,
  onReasonChange,
  onLongPress,
}) {
  const pressTimer = useRef(null);
  const { id, label, desc, critical } = pergunta;

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => onLongPress(id), 500);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

  const isNa = status === 'na';
  const isPending = status === 'pending';

  return (
    <div
      className={`
        col-span-1
        rounded-2xl border-2 p-3 flex flex-col justify-between
        transition-all duration-200 active:scale-[0.97] select-none cursor-pointer
        ${STATUS_CARD[status]}
        ${isNa ? 'bg-[repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1_3px,#e2e8f0_3px,#e2e8f0_10px)]' : ''}
        ${critical && status === 'nao' ? 'ring-2 ring-red-300 ring-offset-1' : ''}
      `}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
    >
      {/* Card header */}
      <div className="mb-2 flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className={`text-xs font-black leading-tight uppercase ${isPending ? 'text-slate-700' : ''}`}>
            {label}
          </p>
          <div className="flex gap-1 shrink-0 items-center">
            {hasPhoto && <span className="text-xs">📷</span>}
            {STATUS_ICON[status] && (
              <span className="text-base leading-none">{STATUS_ICON[status]}</span>
            )}
            {isPending && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
        </div>
        <p className={`text-[11px] leading-tight ${isPending ? 'text-slate-400' : 'text-white/70'}`}>{desc}</p>
      </div>

      {/* Answer buttons */}
      <div className="flex gap-1.5">
        {['sim', 'nao', 'na'].map(opt => (
          <AnswerBtn
            key={opt}
            opt={opt}
            currentStatus={status}
            onClick={v => onAnswer(id, v)}
          />
        ))}
      </div>

      {/* Inline justificativa + câmera when Não */}
      {status === 'nao' && (
        <div className="mt-2 space-y-1.5">
          <textarea
            className="w-full bg-white/20 text-white placeholder-white/50 text-[11px] rounded-lg p-2 resize-none outline-none border border-white/20"
            rows={2}
            placeholder="Justificativa (opcional)..."
            value={reason}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); onReasonChange(id, e.target.value); }}
          />
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onLongPress(id); }}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all active:scale-95 ${
              hasPhoto
                ? 'bg-white/30 border-white/40 text-white'
                : 'bg-white/10 border-white/20 text-white/70'
            }`}
          >
            <Camera size={12} />
            {hasPhoto ? '📷 Foto registrada — alterar' : 'Tirar foto de evidência'}
          </button>
        </div>
      )}
    </div>
  );
}
