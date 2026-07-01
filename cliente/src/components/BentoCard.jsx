import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

// trigger:'sim' questions (finding = non-conformity): sim→red, nao→teal
// trigger:'nao' questions (normal): sim→teal, nao→red
function cardClass(status, trigger) {
  if (status === 'pending') return 'bg-slate-100 border-slate-200';
  if (status === 'na')      return 'border-slate-300';
  if (trigger === 'sim') {
    return status === 'sim'
      ? 'bg-red-700 border-red-700 text-white'
      : 'bg-teal-700 border-teal-700 text-white';
  }
  return status === 'sim'
    ? 'bg-teal-700 border-teal-700 text-white'
    : 'bg-red-700 border-red-700 text-white';
}

function statusIcon(status, trigger) {
  if (status === 'na')      return '⚠️';
  if (status === 'pending') return null;
  if (trigger === 'sim')    return status === 'sim' ? '🚫' : '✅';
  return status === 'sim' ? '✅' : '🚫';
}

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
  const { id, label, desc, trigger, critical, requiresVolante } = pergunta;

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => onLongPress(id), 500);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

  const isNa = status === 'na';
  const isPending = status === 'pending';
  const isNonConform = trigger === 'sim' ? status === 'sim' : status === 'nao';

  return (
    <div
      className={`
        col-span-1
        rounded-2xl border-2 p-3 flex flex-col justify-between
        transition-all duration-200 active:scale-[0.97] select-none cursor-pointer
        ${cardClass(status, trigger)}
        ${isNa ? 'bg-[repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1_3px,#e2e8f0_3px,#e2e8f0_10px)]' : ''}
        ${critical && isNonConform ? 'ring-2 ring-red-300 ring-offset-1' : ''}
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
            {statusIcon(status, trigger) && (
              <span className="text-base leading-none">{statusIcon(status, trigger)}</span>
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

      {/* Equipe volante alert */}
      {requiresVolante && isNonConform && (
        <div className="mt-2 bg-amber-400 text-amber-900 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
          <span className="text-sm">🚐</span>
          <p className="text-[10px] font-black uppercase leading-tight">Agendar Equipe Volante</p>
        </div>
      )}

      {/* Inline justificativa + câmera when non-conformity */}
      {isNonConform && (
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
