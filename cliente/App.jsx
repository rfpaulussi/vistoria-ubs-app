import React, { useEffect } from 'react';
import { AppProvider, useApp, campanhaAtual } from './src/context/AppContext';
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import VistoriaScreen from './src/screens/VistoriaScreen';
import RelatorioScreen from './src/screens/RelatorioScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import PlanejamentoScreen from './src/screens/PlanejamentoScreen';
import KPIsScreen from './src/screens/KPIsScreen';
import AcessoSupabase from './src/components/AcessoSupabase';
import GestaoScreen from './src/screens/GestaoScreen';

function AppInner() {
  const { screen, perfil } = useApp();
  const showHeader = screen !== 'relatorio';
  const campanha = campanhaAtual();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  return (
    <div className="app-frame" style={{ '--campaign-color': campanha.cor }}>
      <div className="app-shell">
      {showHeader && <Header />}

      {screen === 'vistoria'     && <VistoriaScreen />}
      {screen === 'relatorio'    && <RelatorioScreen />}
      {screen === 'historico'    && <HistoricoScreen />}
      {screen === 'planejamento' && <PlanejamentoScreen />}
      {screen === 'kpis'         && <KPIsScreen />}
      {screen === 'gestao' && perfil && <GestaoScreen administrador={perfil.papel === 'admin'} />}

      <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AcessoSupabase>
      {perfil => <AppProvider key={perfil?.id ?? 'legado'} perfil={perfil}><AppInner /></AppProvider>}
    </AcessoSupabase>
  );
}
