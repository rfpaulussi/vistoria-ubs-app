import React from 'react';
import { CalendarDays, ClipboardCheck, History, ListChecks, ChartNoAxesCombined, HeartPulse } from 'lucide-react';
import { useApp, campanhaAtual } from '../context/AppContext';

const paginas = {
  historico: ['Histórico de vistorias', 'Consulte visitas, registros e evidências.', History],
  planejamento: ['Agenda', 'Acompanhe o roteiro de visitas.', CalendarDays],
  kpis: ['Indicadores', 'Acompanhe retornos e compare os resultados.', ChartNoAxesCombined],
  paco: ['Paço Municipal de Mogi', 'Roteiro de limpeza e vistorias por setor.', ClipboardCheck],
};

export default function Header() {
  const { meta, contadores, PERGUNTAS, screen, perfil } = useApp();
  const campanha = campanhaAtual();
  const campo = screen === 'vistoria';
  const respondidos = PERGUNTAS.length - contadores.pending;
  const [titulo, subtitulo, Icone] = campo
    ? [meta.ubs || 'Nova vistoria', 'Checklist de limpeza e conservação', ClipboardCheck]
    : screen === 'gestao'
      ? perfil?.papel === 'admin'
        ? ['Painel de gestão', 'Acompanhe o que precisa de ação.', ListChecks]
        : ['Meus retornos', 'Consulte prazos e orientações para as suas visitas.', ListChecks]
      : paginas[screen];

  return (
    <>
      <header className="app-hero">
        <div className="app-hero-icon"><Icone size={22} aria-hidden="true" /></div>
        <div>
          <p className="app-hero-kicker">{screen === 'paco' ? 'Vistoria de limpeza' : 'Vistoria UBS'}</p>
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </div>
        {campo && (
          <div className="app-hero-progress">
            <div className="flex justify-between gap-3 text-sm"><span>Progresso</span><strong>{respondidos} de {PERGUNTAS.length}</strong></div>
            <progress aria-label="Itens respondidos" max={PERGUNTAS.length} value={respondidos} />
          </div>
        )}
      </header>
      {screen !== 'paco' && <div className="campaign-band">
        <HeartPulse size={17} aria-hidden="true" />
        <div><strong>{campanha.nome}</strong><span>{campanha.desc}</span></div>
      </div>}
    </>
  );
}
