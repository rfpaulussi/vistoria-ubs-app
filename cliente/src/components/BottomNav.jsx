import React from 'react';
import { ClipboardList, History, CalendarDays, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { screen: 'vistoria',     icon: ClipboardList, label: 'Vistoria'  },
  { screen: 'historico',    icon: History,       label: 'Histórico' },
  { screen: 'planejamento', icon: CalendarDays,  label: 'Agenda'    },
  { screen: 'kpis',         icon: BarChart2,     label: 'KPIs'      },
];

export default function BottomNav() {
  const { screen, setScreen, contadores } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 flex shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden">
      {NAV_ITEMS.map(({ screen: s, icon: Icon, label }) => (
        <button
          key={s}
          onClick={() => setScreen(s)}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
            screen === s ? 'text-teal-700' : 'text-slate-400'
          }`}
        >
          <Icon size={20} />
          <span className="text-[9px] font-black uppercase">{label}</span>
        </button>
      ))}
    </nav>
  );
}
