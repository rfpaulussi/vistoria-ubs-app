import React, { createContext, useContext, useState, useEffect } from 'react';

export const UBS_LIST = [
  'UBS PONTE GRANDE', 'UBS BRAZ CUBAS', 'UBS VILA SUISSA', 'CECCO',
  'UBS BOTUJURU', 'UBS VILA MORAES', 'UBS VILA JUNDIAÍ', 'ZOONOZES',
  'UBS JARDIM CAMILA', 'UBS JARDIM IVETE', 'UBS SANTA TERESA', 'EMESP',
  'UBS MINERAÇÃO', 'UBS JUNDIAPEBA', 'CURE/CEADIM', 'CAPS INFANTIL/CIAS',
  'CAPS 2', 'UBS SABAUNA', 'UAPS 1', 'UAPS 2',
  'SECRETARIA DE SAÚDE', 'PROMEG', 'PRÓ HIPER', 'ALMOXARIFADO SAÚDE',
  'PRÓ MULHER', 'UBS SANTO ÂNGELO', 'UBS VILA APARECIDA', 'CENTRO POP',
  'UBS VILA DA PRATA', 'UBS VILA NATAL',
];

export const PERGUNTAS = [
  { id: 'uniformeEquipe',      label: 'Equipe Uniformizada e Identificada',  desc: 'Todos os colaboradores estão utilizando uniforme completo e crachá visível?',                                                trigger: 'nao', critical: false },
  { id: 'usoEpi',              label: 'Uso Correto de EPIs',                  desc: 'A equipe está utilizando EPIs (luvas, botas, óculos) adequados para a atividade atual?',                                     trigger: 'nao', critical: true  },
  { id: 'ambienteGeral',       label: 'Limpeza do Ambiente Geral',            desc: 'Pisos, paredes, tetos e corredores estão limpos e livres de sujidades visíveis?',                                           trigger: 'nao', critical: false },
  { id: 'sujeiraDerramamento', label: 'Tratamento de Sujeira e Derramamentos', desc: 'Houve limpeza imediata e adequada de derramamentos recentes ou sujidades pontuais?',                                       trigger: 'nao', critical: false },
  { id: 'altoToque',           label: 'Superfícies de Alto Toque',            desc: 'Maçanetas, interruptores, corrimãos e balcões foram higienizados corretamente?',                                            trigger: 'nao', critical: false },
  { id: 'padraoLimpeza',       label: 'Padrão Técnico de Limpeza',            desc: 'A limpeza está seguindo o fluxo correto (do menos para o mais contaminado, de cima para baixo)?',                          trigger: 'nao', critical: true  },
  { id: 'cronogramaLimpeza',   label: 'Cumprimento do Cronograma',            desc: 'As rotinas diárias e os cronogramas de limpeza terminal estão em dia e preenchidos?',                                       trigger: 'nao', critical: false },
  { id: 'materiaOrganica',     label: 'Presença de Matéria Orgânica',         desc: 'Foi encontrada matéria orgânica (sangue, fluidos) sem o devido isolamento e desinfecção?',                                  trigger: 'sim', critical: true  },
  { id: 'residuosSegregados',  label: 'Segregação de Resíduos',               desc: 'O lixo infectante, comum e perfurocortante estão separados e acondicionados corretamente?',                                 trigger: 'nao', critical: true  },
  { id: 'lixeirasTampadas',    label: 'Lixeiras Fechadas e Higienizadas',     desc: 'As lixeiras estão com tampa, acionamento por pedal funcionando e limpas por fora?',                                         trigger: 'nao', critical: false },
  { id: 'areaResiduos',        label: 'Organização do Abrigo de Resíduos',    desc: 'A área de expurgo e armazenamento de lixo está limpa, organizada e sem odores fortes?',                                    trigger: 'nao', critical: false },
  { id: 'equipamentosMateriais', label: 'Condição de Equipamentos e Materiais', desc: 'Carrinhos, baldes, rodos e mops estão limpos, secos e em bom estado de conservação?',                                    trigger: 'nao', critical: false },
  { id: 'produtosIdentificados', label: 'Identificação de Produtos Químicos', desc: 'Os produtos de limpeza estão em suas embalagens originais ou frascos devidamente rotulados?',                              trigger: 'nao', critical: false },
  { id: 'responsavelTurno',    label: 'Responsável pelo Turno Presente',      desc: 'Há um líder ou responsável pela equipe de limpeza claramente definido e acompanhando?',                                     trigger: 'nao', critical: false },
  { id: 'problemasTratados',   label: 'Feedback e Correção Imediata',         desc: 'As inconformidades apontadas na vistoria foram corrigidas e a equipe orientada na hora?',                                   trigger: 'nao', critical: false },
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
