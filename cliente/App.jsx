import React from 'react';
import { AppProvider, useApp } from './src/context/AppContext';
import Header from './src/components/Header';
import ProgressSummary from './src/components/ProgressSummary';
import BottomNav from './src/components/BottomNav';
import VistoriaScreen from './src/screens/VistoriaScreen';
import RelatorioScreen from './src/screens/RelatorioScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import PlanejamentoScreen from './src/screens/PlanejamentoScreen';
import KPIsScreen from './src/screens/KPIsScreen';

function AppInner() {
  const { screen } = useApp();
  const showHeader = screen !== 'relatorio';
  const showProgress = screen === 'vistoria';

  return (
    <div className="min-h-screen bg-slate-50">
      {showHeader && <Header />}
      {showProgress && <ProgressSummary />}

      {screen === 'vistoria'     && <VistoriaScreen />}
      {screen === 'relatorio'    && <RelatorioScreen />}
      {screen === 'historico'    && <HistoricoScreen />}
      {screen === 'planejamento' && <PlanejamentoScreen />}
      {screen === 'kpis'         && <KPIsScreen />}

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
