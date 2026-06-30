import React, { createContext, useContext, useState, useEffect } from 'react';

export const PERGUNTAS = [
  { id: 'uniformeEquipe',      label: 'Equipe Uniformizada',    desc: 'Uniforme completo e crachá visível?',                     trigger: 'nao', critical: false },
  { id: 'usoEpi',              label: 'Uso de EPIs',            desc: 'Luvas, botas, óculos adequados para atividade?',          trigger: 'nao', critical: true  },
  { id: 'ambienteGeral',       label: 'Limpeza Geral',          desc: 'Pisos, paredes e corredores limpos?',                     trigger: 'nao', critical: false },
  { id: 'sujeiraDerramamento', label: 'Sujeira/Derramamentos',  desc: 'Limpeza imediata de derramamentos recentes?',             trigger: 'nao', critical: false },
  { id: 'altoToque',           label: 'Superfícies Alto Toque', desc: 'Maçanetas, corrimãos e balcões higienizados?',            trigger: 'nao', critical: false },
  { id: 'padraoLimpeza',       label: 'Padrão Técnico',         desc: 'Fluxo correto: menos → mais contaminado, cima → baixo?',  trigger: 'nao', critical: true  },
  { id: 'cronogramaLimpeza',   label: 'Cronograma',             desc: 'Rotinas diárias e terminal em dia?',                     trigger: 'nao', critical: false },
  { id: 'materiaOrganica',     label: 'Matéria Orgânica',       desc: 'Fluidos sem isolamento/desinfecção encontrados?',         trigger: 'sim', critical: true  },
  { id: 'residuosSegregados',  label: 'Segregação de Resíduos', desc: 'Infectante, comum e perfurocortante separados?',          trigger: 'nao', critical: true  },
  { id: 'lixeirasTampadas',    label: 'Lixeiras',               desc: 'Tampa, pedal e limpeza externa ok?',                     trigger: 'nao', critical: false },
  { id: 'areaResiduos',        label: 'Abrigo de Resíduos',     desc: 'Expurgo limpo, organizado, sem odores?',                 trigger: 'nao', critical: false },
  { id: 'equipamentosMateriais', label: 'Equipamentos',         desc: 'Carrinhos, baldes, mops limpos e conservados?',          trigger: 'nao', critical: false },
  { id: 'produtosIdentificados', label: 'Produtos Químicos',    desc: 'Embalagens originais ou frascos rotulados?',             trigger: 'nao', critical: false },
  { id: 'responsavelTurno',    label: 'Responsável de Turno',   desc: 'Líder da equipe presente e acompanhando?',               trigger: 'nao', critical: false },
  { id: 'problemasTratados',   label: 'Correção Imediata',      desc: 'Inconformidades corrigidas e equipe orientada?',         trigger: 'nao', critical: false },
];

const makeInitialRespostas = () =>
  Object.fromEntries(
    PERGUNTAS.map(p => [p.id, { status: 'pending', reason: '', photo: null }])
  );

const makeInitialMeta = () => ({
  ubs: '',
  encarregada: '',
  dataVistoria: new Date().toISOString().split('T')[0],
  horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  horaFim: '',
  notaVistoria: 10,
  dataRetorno: '',
  consideracoesGerais: '',
});

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('vistoria');
  const [meta, setMeta] = useState(makeInitialMeta);
  const [respostas, setRespostas] = useState(makeInitialRespostas);
  const [timer, setTimer] = useState(0);
  const [historico, setHistorico] = useState([]);
  const [relatorioAtivo, setRelatorioAtivo] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const updateMeta = (field, value) =>
    setMeta(prev => ({ ...prev, [field]: value }));

  const updateResposta = (id, key, value) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const resetVistoria = () => {
    setRespostas(makeInitialRespostas());
    setMeta(makeInitialMeta());
    setTimer(0);
    setScreen('vistoria');
  };

  const contadores = {
    sim:     Object.values(respostas).filter(r => r.status === 'sim').length,
    nao:     Object.values(respostas).filter(r => r.status === 'nao').length,
    na:      Object.values(respostas).filter(r => r.status === 'na').length,
    pending: Object.values(respostas).filter(r => r.status === 'pending').length,
  };

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      meta, updateMeta,
      respostas, updateResposta,
      timer,
      historico, setHistorico,
      relatorioAtivo, setRelatorioAtivo,
      resetVistoria,
      contadores,
      PERGUNTAS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
