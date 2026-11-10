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
import PacoScreen from './src/screens/PacoScreen';

function AppInner() {
  const { screen, perfil } = useApp();
  const showHeader = screen !== 'relatorio';
  const campanha = campanhaAtual();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  return (
    <div className={screen === 'paco' ? 'app-frame paco-theme' : 'app-frame'}
      style={{ '--campaign-color': screen === 'paco' ? '#176b63' : campanha.cor }}>
      <div className="app-shell">
      {showHeader && <Header />}

      {screen === 'vistoria'     && <VistoriaScreen />}
      {screen === 'relatorio'    && <RelatorioScreen />}
      {screen === 'historico'    && <HistoricoScreen />}
      {screen === 'planejamento' && <PlanejamentoScreen />}
      {screen === 'kpis'         && <KPIsScreen />}
      {screen === 'gestao' && perfil && <GestaoScreen administrador={perfil.papel === 'admin'} />}
      {screen === 'paco' && <PacoScreen perfil={perfil} />}

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
