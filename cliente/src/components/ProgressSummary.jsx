import React from 'react';
import { useApp } from '../context/AppContext';

export default function ProgressSummary() {
  const { contadores } = useApp();

  const items = [
    { label: '✅ Sim',   value: contadores.sim,     color: 'text-teal-700'  },
    { label: '🚫 Não',   value: contadores.nao,     color: 'text-red-600'   },
    { label: '⚠️ N/A',  value: contadores.na,      color: 'text-slate-500' },
    { label: '⏳ Pend.', value: contadores.pending, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-0 bg-white border-b border-slate-100">
      {items.map(({ label, value, color }) => (
        <div key={label} className="text-center py-2 px-1">
          <p className={`text-xl font-black ${color}`}>{value}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}
