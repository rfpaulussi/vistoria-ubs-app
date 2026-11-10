import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { normalizarUnidade } from '../lib/unidades';

export const CAMPANHAS = [
  { mes: 0,  nome: 'Janeiro Branco',    cor: '#64748b', corText: '#fff', emoji: '🤍', desc: 'Saúde Mental e Bem-Estar' },
  { mes: 1,  nome: 'Fevereiro Laranja', cor: '#ea580c', corText: '#fff', emoji: '🧡', desc: 'Leucemia e Alzheimer' },
  { mes: 2,  nome: 'Março Lilás',       cor: '#9333ea', corText: '#fff', emoji: '💜', desc: 'Prevenção do Câncer de Colo do Útero' },
  { mes: 3,  nome: 'Abril Azul',        cor: '#2563eb', corText: '#fff', emoji: '💙', desc: 'Combate à Hipertensão Arterial' },
  { mes: 4,  nome: 'Maio Amarelo',      cor: '#ca8a04', corText: '#fff', emoji: '💛', desc: 'Segurança no Trânsito' },
  { mes: 5,  nome: 'Junho Vermelho',    cor: '#dc2626', corText: '#fff', emoji: '❤️', desc: 'Doação de Sangue' },
  { mes: 6,  nome: 'Julho Amarelo',     cor: '#d97706', corText: '#fff', emoji: '💛', desc: 'Prevenção das Hepatites Virais' },
  { mes: 7,  nome: 'Agosto Dourado',    cor: '#b45309', corText: '#fff', emoji: '🌟', desc: 'Aleitamento Materno' },
  { mes: 8,  nome: 'Setembro Amarelo',  cor: '#eab308', corText: '#1e293b', emoji: '💛', desc: 'Prevenção ao Suicídio' },
  { mes: 9,  nome: 'Outubro Rosa',      cor: '#db2777', corText: '#fff', emoji: '🩷', desc: 'Prevenção do Câncer de Mama' },
  { mes: 10, nome: 'Novembro Azul',     cor: '#1d4ed8', corText: '#fff', emoji: '💙', desc: 'Saúde do Homem' },
  { mes: 11, nome: 'Dezembro Vermelho', cor: '#b91c1c', corText: '#fff', emoji: '❤️', desc: 'Prevenção do HIV/AIDS' },
];

export const campanhaAtual = () => {
  const mes = new Date().getMonth();
  return CAMPANHAS[mes];
};

export const PERGUNTAS = [
  { id: 'uniformeEquipe',      label: 'Equipe Uniformizada e Identificada',     desc: 'Todos os colaboradores estão usando uniforme completo e crachá visível? Avalie calçado de proteção e demais EPIs no item Uso Correto de EPIs.', trigger: 'nao', critical: false },
  { id: 'usoEpi',              label: 'Uso Correto de EPIs',                     desc: 'Os EPIs exigidos para a atividade, incluindo o calçado de proteção, estão em uso e em condições adequadas? Registre aqui problemas de uso, conservação ou reposição.', trigger: 'nao', critical: true },
  { id: 'ambienteGeral',       label: 'Limpeza do Ambiente Geral',               desc: 'Pisos, paredes, tetos e corredores estão limpos e livres de sujidades visíveis?',                                    trigger: 'nao', critical: false },
  { id: 'sujeiraDerramamento', label: 'Tratamento de Sujeira e Derramamentos',   desc: 'Houve limpeza imediata e adequada de derramamentos recentes ou sujidades pontuais?',                                trigger: 'nao', critical: false },
  { id: 'altoToque',           label: 'Superfícies de Alto Toque',               desc: 'Maçanetas, interruptores, corrimãos e balcões foram higienizados corretamente?',                                     trigger: 'nao', critical: false },
  { id: 'padraoLimpeza',       label: 'Padrão Técnico de Limpeza',               desc: 'A limpeza está seguindo o fluxo correto (do menos para o mais contaminado, de cima para baixo)?',                   trigger: 'nao', critical: true  },
  { id: 'cronogramaLimpeza',   label: 'Cumprimento do Cronograma',               desc: 'As rotinas diárias e os cronogramas de limpeza terminal estão em dia e preenchidos?',                                trigger: 'nao', critical: false },
  { id: 'materiaOrganica',     label: 'Presença de Matéria Orgânica',            desc: 'Há matéria orgânica no ambiente sem o isolamento ou a desinfecção necessários?',                                 trigger: 'sim', critical: true  },
  { id: 'residuosSegregados',  label: 'Segregação de Resíduos',                  desc: 'O lixo infectante, comum e perfurocortante estão separados e acondicionados corretamente?',                          trigger: 'nao', critical: true  },
  { id: 'orientacaoResiduosInfectantes', label: 'Orientação sobre resíduos infectantes', desc: 'A equipe recebeu orientação sobre como remover e transportar resíduos infectantes com segurança?', trigger: 'nao', critical: false },
  { id: 'lixeirasTampadas',    label: 'Lixeiras Fechadas e Higienizadas',        desc: 'As lixeiras estão com tampa, acionamento por pedal funcionando e limpas por fora?',                                  trigger: 'nao', critical: false },
  { id: 'areaResiduos',        label: 'Organização do Abrigo de Resíduos',       desc: 'A área de expurgo e armazenamento de lixo está limpa, organizada e sem odores fortes?',                             trigger: 'nao', critical: false },
  { id: 'abrigoContainers',    label: 'Abrigo de Resíduos ou Containers',        desc: 'A unidade possui abrigo de resíduos ou containers identificados e em local adequado?',                               trigger: 'nao', critical: false },
  { id: 'equipamentosMateriais', label: 'Condição de Equipamentos e Materiais',  desc: 'Carrinhos, baldes, rodos e mops estão limpos, secos e em bom estado de conservação?',                               trigger: 'nao', critical: false },
  { id: 'produtosIdentificados', label: 'Identificação de Produtos Químicos',    desc: 'Os produtos de limpeza estão em suas embalagens originais ou frascos devidamente rotulados?',                       trigger: 'nao', critical: false },
  { id: 'diluicaoCorreta',    label: 'Diluição de Produtos',                    desc: 'A diluição está sendo realizada da maneira correta, cumprindo as orientações operacionais da empresa?',             trigger: 'nao', critical: false },
  { id: 'limpezaVentiladores', label: 'Limpeza de Ventiladores',                 desc: 'Os ventiladores estão limpos, sem acúmulo de pó nas hélices e grades?',                                             trigger: 'nao', critical: false },
  { id: 'papeleiras',          label: 'Papeleiras em Condições e Quantidade',    desc: 'As papeleiras estão em boas condições de uso e em quantidade suficiente em todos os ambientes?',                    trigger: 'nao', critical: false },
  { id: 'saboneteiras',        label: 'Saboneteiras em Condições e Quantidade',  desc: 'As saboneteiras estão funcionando, higienizadas e abastecidas em quantidade suficiente?',                           trigger: 'nao', critical: false },
  { id: 'vidrosBaixaAltura',   label: 'Limpeza de Vidros — Até 2m',              desc: 'Os vidros e superfícies envidraçadas até 2,0 metros estão limpos, sem manchas ou impressões digitais?',            trigger: 'nao', critical: false, requiresVolante: false },
  { id: 'vidrosAltaAltura',   label: 'Limpeza de Vidros — Acima de 2m',         desc: 'Os vidros acima de 2,0 metros estão limpos? Pendência requer agendamento de equipe volante especializada.',           trigger: 'nao', critical: false, requiresVolante: true  },
  { id: 'equipeOrientada',    label: 'Orientação à Equipe na Visita',           desc: 'A equipe recebeu orientação sobre as não conformidades identificadas nesta vistoria?',                            trigger: 'nao', critical: false },
];

const STORAGE_KEY = 'vistoria_state_v2';

const makeInitialRespostas = () =>
  Object.fromEntries(
    PERGUNTAS.map(p => [p.id, { status: 'pending', reason: '', photo: null, photoBefore: null }])
  );

const makeInitialMeta = () => ({
  ubs: '',
  encarregada: '',
  dataVistoria: new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
  horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  horaFim: '',
  notaVistoria: null,
  dataRetorno: '',
  consideracoesGerais: '',
});

function loadSaved(storageKey, key, fallback) {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[key]) return parsed[key];
    }
  } catch {}
  return fallback();
}

const AppContext = createContext(null);

export function AppProvider({ children, perfil }) {
  const storageKey = perfil ? `${STORAGE_KEY}:${perfil.id}` : STORAGE_KEY;
  const novaMeta = () => ({ ...makeInitialMeta(), encarregada: perfil?.nome ?? '' });
  const novoId = () => perfil ? crypto.randomUUID() : null;
  const [screen, setScreen] = useState(() => {
    if (perfil?.papel === 'admin') return perfil.paco ? 'paco' : 'gestao';
    return ['supervisor', 'campo_paco'].includes(perfil?.papel) ? 'paco' : 'vistoria';
  });
  const [vistoriaId, setVistoriaId] = useState(() => loadSaved(storageKey, 'vistoriaId', novoId));
  const [conferencia, setConferencia] = useState(() => loadSaved(storageKey, 'conferencia', () => null));
  const [treinamentos, setTreinamentos] = useState([]);
  const [meta, setMeta] = useState(() => {
    const salva = loadSaved(storageKey, 'meta', novaMeta);
    return { ...salva, ubs: normalizarUnidade(salva.ubs) ?? '' };
  });
  const [respostas, setRespostas] = useState(() => {
    const saved = loadSaved(storageKey, 'respostas', makeInitialRespostas);
    // Ensure all current PERGUNTAS have entries (handles new questions after update)
    const base = makeInitialRespostas();
    return Object.fromEntries(PERGUNTAS.map(({ id }) => [id, saved[id] ?? base[id]]));
  });
  const [timer, setTimer] = useState(0);
  const timerActiveRef = useRef(true);

  // Persist state to sessionStorage (survives iOS camera redirect)
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ meta, respostas, vistoriaId, conferencia }));
    } catch {}
  }, [storageKey, meta, respostas, vistoriaId, conferencia]);

  // Timer — pauses when timerActiveRef.current is false
  useEffect(() => {
    const id = setInterval(() => {
      if (timerActiveRef.current) setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pauseTimer = () => { timerActiveRef.current = false; };
  const resumeTimer = () => { timerActiveRef.current = true; };

  const updateMeta = (field, value) =>
    setMeta(prev => ({ ...prev, [field]: value }));

  const updateResposta = (id, key, value) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const resetVistoria = (destino = 'vistoria') => {
    try { sessionStorage.removeItem(storageKey); } catch {}
    setRespostas(makeInitialRespostas());
    setMeta(novaMeta());
    setVistoriaId(novoId());
    setConferencia(null);
    setTreinamentos([]);
    setTimer(0);
    timerActiveRef.current = true;
    setScreen(typeof destino === 'string' ? destino : 'vistoria');
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
      perfil, vistoriaId,
      meta, updateMeta,
      conferencia, setConferencia,
      treinamentos, setTreinamentos,
      respostas, updateResposta,
      timer, pauseTimer, resumeTimer,
      resetVistoria,
      contadores,
      PERGUNTAS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
