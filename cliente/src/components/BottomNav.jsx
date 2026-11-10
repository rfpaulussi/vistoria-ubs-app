import React from 'react';
import { Building2, ClipboardList, History, CalendarDays, BarChart2, ListChecks } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { screen: 'vistoria',     icon: ClipboardList, label: 'Vistoria'  },
  { screen: 'historico',    icon: History,       label: 'Histórico' },
  { screen: 'planejamento', icon: CalendarDays,  label: 'Agenda'    },
  { screen: 'kpis',         icon: BarChart2,     label: 'KPIs'      },
];

export default function BottomNav() {
  const { screen, setScreen, perfil } = useApp();
  if (screen === 'relatorio') return null;
  const gestao = { screen: 'gestao', icon: ListChecks, label: perfil?.papel === 'admin' ? 'Gestão' : 'Retornos' };
  const itensBase = perfil?.papel === 'admin' ? [gestao, ...NAV_ITEMS]
    : perfil ? [...NAV_ITEMS.filter(item => item.screen !== 'kpis'), gestao] : NAV_ITEMS;
  const paco = { screen: 'paco', icon: Building2, label: 'Paço' };
  if (['supervisor', 'campo_paco'].includes(perfil?.papel)) return null;
  const itens = perfil?.paco ? [...itensBase, paco] : itensBase;

  return (
    <nav className="app-nav print:hidden" aria-label="Navegação principal">
      {itens.map(({ screen: s, icon: Icon, label }) => (
        <button
          key={s}
          onClick={() => setScreen(s)}
          aria-current={screen === s ? 'page' : undefined}
        >
          <span className="app-nav-icon"><Icon size={20} aria-hidden="true" /></span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
