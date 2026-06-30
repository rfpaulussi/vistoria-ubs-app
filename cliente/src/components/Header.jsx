import React from 'react';
import { useApp } from '../context/AppContext';

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Header() {
  const { meta, timer, contadores, PERGUNTAS } = useApp();
  const total = PERGUNTAS.length;
  const respondidos = total - contadores.pending;
  const pct = Math.round((respondidos / total) * 100);

  return (
    <header className="bg-teal-700 text-white sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Vistoria Campo</p>
          <p className="text-sm font-black leading-tight truncate max-w-[200px]">
            {meta.ubs || 'Sem unidade'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-mono font-black tabular-nums">{formatTimer(timer)}</p>
          <p className="text-[9px] opacity-60">{respondidos}/{total} itens</p>
        </div>
      </div>
      <div className="h-1 bg-teal-900">
        <div
          className="h-full bg-teal-300 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  );
}
