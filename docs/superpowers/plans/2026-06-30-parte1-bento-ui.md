# Parte 1 — Bento UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the vistoria app with a bento-grid dashboard replacing the scrolling form, decompose the monolithic App.jsx into components/screens, and wire up Google Sheets + Firebase persistence.

**Architecture:** AppContext holds all state (meta, respostas, timer, screen). App.jsx routes between screens by reading `screen` from context. Each screen and component is a focused file. No new dependencies added.

**Tech Stack:** React 18, Vite 7, Tailwind v4 (@tailwindcss/vite), lucide-react, Firebase 10. No test runner — validation steps are `npm run build` checks.

---

## File Map

```
cliente/
  App.jsx                          MODIFY — router shell, wraps AppProvider
  main.jsx                         NO CHANGE
  src/
    context/
      AppContext.jsx                CREATE — global state, PERGUNTAS list, timer
    lib/
      sheets.js                    CREATE — salvarVistoria (POST) + buscarVistorias (GET)
      firebase.js                  CREATE — extracted from App.jsx, optional layer
    components/
      Header.jsx                   CREATE — fixed header: timer + progress bar
      ProgressSummary.jsx          CREATE — Sim/Não/N/A/Pendente counters
      BentoCard.jsx                CREATE — parametric card: size, status, interactions
      CardModal.jsx                CREATE — bottom sheet: photo + extended observation
      BottomNav.jsx                CREATE — bottom tab nav, hidden during active vistoria
    screens/
      VistoriaScreen.jsx           CREATE — bento grid + identification + finish button
      RelatorioScreen.jsx          CREATE — read-only bento summary + WhatsApp + PDF
      HistoricoScreen.jsx          CREATE — stub (Part 2.1)
      PlanejamentoScreen.jsx       CREATE — stub (Part 2.2)
      KPIsScreen.jsx               CREATE — stub (Part 2.3)
```

---

## Task 1: Create directory structure

**Files:**
- Create: `cliente/src/context/` (dir)
- Create: `cliente/src/lib/` (dir)
- Create: `cliente/src/components/` (dir)
- Create: `cliente/src/screens/` (dir)

- [ ] **Step 1: Create directories**

```bash
cd cliente
mkdir -p src/context src/lib src/components src/screens
```

- [ ] **Step 2: Verify**

```bash
ls src/
```

Expected output: `components  context  lib  screens`

---

## Task 2: Create AppContext

**Files:**
- Create: `cliente/src/context/AppContext.jsx`

- [ ] **Step 1: Write AppContext.jsx**

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export const PERGUNTAS = [
  { id: 'uniformeEquipe',     label: 'Equipe Uniformizada',    desc: 'Uniforme completo e crachá visível?',                    trigger: 'nao', critical: false },
  { id: 'usoEpi',             label: 'Uso de EPIs',            desc: 'Luvas, botas, óculos adequados para atividade?',         trigger: 'nao', critical: true  },
  { id: 'ambienteGeral',      label: 'Limpeza Geral',          desc: 'Pisos, paredes e corredores limpos?',                    trigger: 'nao', critical: false },
  { id: 'sujeiraDerramamento',label: 'Sujeira/Derramamentos',  desc: 'Limpeza imediata de derramamentos recentes?',            trigger: 'nao', critical: false },
  { id: 'altoToque',          label: 'Superfícies Alto Toque', desc: 'Maçanetas, corrimãos e balcões higienizados?',           trigger: 'nao', critical: false },
  { id: 'padraoLimpeza',      label: 'Padrão Técnico',         desc: 'Fluxo correto: menos → mais contaminado, cima → baixo?', trigger: 'nao', critical: true  },
  { id: 'cronogramaLimpeza',  label: 'Cronograma',             desc: 'Rotinas diárias e terminal em dia?',                    trigger: 'nao', critical: false },
  { id: 'materiaOrganica',    label: 'Matéria Orgânica',       desc: 'Fluidos sem isolamento/desinfecção encontrados?',        trigger: 'sim', critical: true  },
  { id: 'residuosSegregados', label: 'Segregação de Resíduos', desc: 'Infectante, comum e perfurocortante separados?',         trigger: 'nao', critical: true  },
  { id: 'lixeirasTampadas',   label: 'Lixeiras',               desc: 'Tampa, pedal e limpeza externa ok?',                    trigger: 'nao', critical: false },
  { id: 'areaResiduos',       label: 'Abrigo de Resíduos',     desc: 'Expurgo limpo, organizado, sem odores?',                trigger: 'nao', critical: false },
  { id: 'equipamentosMateriais','label': 'Equipamentos',       desc: 'Carrinhos, baldes, mops limpos e conservados?',         trigger: 'nao', critical: false },
  { id: 'produtosIdentificados','label': 'Produtos Químicos',  desc: 'Embalagens originais ou frascos rotulados?',            trigger: 'nao', critical: false },
  { id: 'responsavelTurno',   label: 'Responsável de Turno',   desc: 'Líder da equipe presente e acompanhando?',              trigger: 'nao', critical: false },
  { id: 'problemasTratados',  label: 'Correção Imediata',      desc: 'Inconformidades corrigidas e equipe orientada?',        trigger: 'nao', critical: false },
];

// Fix object property shorthand issue
PERGUNTAS[11].label = 'Equipamentos';
PERGUNTAS[12].label = 'Produtos Químicos';

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
```

- [ ] **Step 2: Build check**

```bash
cd cliente && npm run build
```

Expected: build succeeds (AppContext not imported yet, just needs to parse cleanly).

---

## Task 3: Create lib/sheets.js

**Files:**
- Create: `cliente/src/lib/sheets.js`

- [ ] **Step 1: Write sheets.js**

```js
const SHEETS_URL =
  import.meta.env.VITE_SHEETS_URL ||
  'https://script.google.com/macros/s/AKfycbxDLjQ75Ice_nl7M0y6GuCJCv-_4FEk4Bw392mq3T74Kw5JKIi1zZAMOiZmhFT8JMMoLA/exec';

export async function salvarVistoria(dados) {
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  } catch (err) {
    console.error('Sheets POST error:', err);
  }
}

export async function buscarVistorias() {
  try {
    const res = await fetch(SHEETS_URL);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Sheets GET error:', err);
    return [];
  }
}
```

---

## Task 4: Create lib/firebase.js

**Files:**
- Create: `cliente/src/lib/firebase.js`

- [ ] **Step 1: Write firebase.js** (extracted from App.jsx, same credentials)

```js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDnFrxu0a6WMj5z9PpWxGJjNV-i5hiHV2g',
  authDomain: 'vistoria-ubs-app.firebaseapp.com',
  projectId: 'vistoria-ubs-app',
  storageBucket: 'vistoria-ubs-app.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

let app, auth, db;
const isValid =
  !!firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('COLE_') &&
  !firebaseConfig.messagingSenderId.includes('COLE_');

if (isValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

export function initFirebaseAuth(callback) {
  if (!isValid || !auth) return () => {};
  signInAnonymously(auth).catch(e => console.error('Firebase auth error:', e));
  return onAuthStateChanged(auth, callback);
}

export async function salvarFirestore(dados) {
  if (!isValid || !db) return;
  try {
    await addDoc(collection(db, 'vistorias'), {
      ...dados,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Firestore write error:', e);
  }
}
```

---

## Task 5: Create Header component

**Files:**
- Create: `cliente/src/components/Header.jsx`

- [ ] **Step 1: Write Header.jsx**

```jsx
import React from 'react';
import { useApp } from '../context/AppContext';

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Header() {
  const { meta, timer, contadores, PERGUNTAS } = useApp();
  const total = PERGUNTAS.length;
  const respondidos = total - contadores.pending;
  const pct = Math.round((respondidos / total) * 100);

  return (
    <header className="bg-teal-700 text-white sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Vistoria Campo</p>
          <p className="text-sm font-black leading-tight truncate max-w-[200px]">
            {meta.ubs || 'Sem unidade'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-mono font-black tabular-nums">{formatTimer(timer)}</p>
          <p className="text-[9px] opacity-60">{respondidos}/{total} itens</p>
        </div>
      </div>
      <div className="h-1 bg-teal-900">
        <div
          className="h-full bg-teal-300 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  );
}
```

---

## Task 6: Create ProgressSummary component

**Files:**
- Create: `cliente/src/components/ProgressSummary.jsx`

- [ ] **Step 1: Write ProgressSummary.jsx**

```jsx
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
```

---

## Task 7: Create BentoCard component

**Files:**
- Create: `cliente/src/components/BentoCard.jsx`

- [ ] **Step 1: Write BentoCard.jsx**

```jsx
import React, { useRef } from 'react';

const STATUS_CARD = {
  pending: 'bg-slate-100 border-slate-200',
  sim:     'bg-teal-700 border-teal-700 text-white',
  nao:     'bg-red-700 border-red-700 text-white',
  na:      'border-slate-300',
};

const STATUS_ICON = { sim: '✅', nao: '🚫', na: '⚠️', pending: null };

const BTN_BASE = 'flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95';

function AnswerBtn({ opt, currentStatus, onClick }) {
  const label = opt === 'sim' ? 'S' : opt === 'nao' ? 'N' : 'NA';
  const isActive = currentStatus === opt;
  const isPending = currentStatus === 'pending';

  return (
    <button
      onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(opt); }}
      className={`${BTN_BASE} ${
        isActive
          ? 'bg-white/30 text-white shadow-inner scale-105'
          : isPending
            ? 'bg-white border border-slate-200 text-slate-500'
            : 'bg-white/20 text-white/80'
      }`}
    >
      {label}
    </button>
  );
}

export default function BentoCard({
  pergunta,
  status,
  reason,
  hasPhoto,
  onAnswer,
  onReasonChange,
  onLongPress,
}) {
  const pressTimer = useRef(null);
  const { id, label, desc, critical } = pergunta;

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => onLongPress(id), 500);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

  const isNa = status === 'na';
  const isPending = status === 'pending';

  return (
    <div
      className={`
        ${critical ? 'col-span-2' : 'col-span-1'}
        rounded-2xl border-2 p-3 flex flex-col justify-between
        transition-all duration-200 active:scale-[0.97] select-none cursor-pointer
        ${STATUS_CARD[status]}
        ${isNa ? 'bg-[repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1_3px,#e2e8f0_3px,#e2e8f0_10px)]' : ''}
        ${critical && status === 'nao' ? 'ring-2 ring-red-300 ring-offset-1' : ''}
      `}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
    >
      {/* Card header */}
      <div className="mb-2 flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className={`text-[11px] font-black leading-tight uppercase ${isPending ? 'text-slate-700' : ''}`}>
            {label}
          </p>
          <div className="flex gap-1 shrink-0 items-center">
            {hasPhoto && <span className="text-[10px]">📷</span>}
            {STATUS_ICON[status] && (
              <span className="text-base leading-none">{STATUS_ICON[status]}</span>
            )}
            {isPending && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
        </div>
        {isPending && (
          <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
        )}
      </div>

      {/* Answer buttons */}
      <div className="flex gap-1.5">
        {['sim', 'nao', 'na'].map(opt => (
          <AnswerBtn
            key={opt}
            opt={opt}
            currentStatus={status}
            onClick={v => onAnswer(id, v)}
          />
        ))}
      </div>

      {/* Inline justificativa when Não */}
      {status === 'nao' && (
        <textarea
          className="mt-2 w-full bg-white/20 text-white placeholder-white/50 text-[11px] rounded-lg p-2 resize-none outline-none border border-white/20"
          rows={2}
          placeholder="Justificativa (opcional)..."
          value={reason}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onReasonChange(id, e.target.value); }}
        />
      )}
    </div>
  );
}
```

---

## Task 8: Create CardModal component

**Files:**
- Create: `cliente/src/components/CardModal.jsx`

- [ ] **Step 1: Write CardModal.jsx**

```jsx
import React, { useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CardModal({ perguntaId, onClose }) {
  const { PERGUNTAS, respostas, updateResposta } = useApp();
  const pergunta = PERGUNTAS.find(p => p.id === perguntaId);
  const resposta = respostas[perguntaId];
  const fileRef = useRef(null);

  if (!pergunta || !resposta) return null;

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateResposta(perguntaId, 'photo', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-1">
          <h3 className="font-black text-sm uppercase text-slate-800 flex-1 pr-3 leading-tight">
            {pergunta.label}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{pergunta.desc}</p>

        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block tracking-wider">
          Observação
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm mb-4 resize-none outline-none focus:ring-2 focus:ring-teal-400"
          rows={3}
          placeholder="Observações adicionais..."
          value={resposta.reason}
          onChange={e => updateResposta(perguntaId, 'reason', e.target.value)}
        />

        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block tracking-wider">
          Foto de Evidência
        </label>
        <div
          className="w-full h-44 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer bg-slate-50 active:bg-slate-100"
          onClick={() => fileRef.current?.click()}
        >
          {resposta.photo
            ? <img src={resposta.photo} className="w-full h-full object-cover" alt="Evidência" />
            : (
              <div className="text-center text-slate-400">
                <Camera size={28} className="mx-auto mb-1" />
                <p className="text-[10px] font-black uppercase">Tirar Foto</p>
              </div>
            )
          }
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />

        {resposta.photo && (
          <button
            className="mt-2 text-[10px] text-red-400 font-bold uppercase"
            onClick={() => updateResposta(perguntaId, 'photo', null)}
          >
            Remover foto
          </button>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
```

---

## Task 9: Create BottomNav component

**Files:**
- Create: `cliente/src/components/BottomNav.jsx`

- [ ] **Step 1: Write BottomNav.jsx**

```jsx
import React from 'react';
import { ClipboardList, History, CalendarDays, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { screen: 'vistoria',      icon: ClipboardList, label: 'Vistoria'  },
  { screen: 'historico',     icon: History,       label: 'Histórico' },
  { screen: 'planejamento',  icon: CalendarDays,  label: 'Agenda'    },
  { screen: 'kpis',          icon: BarChart2,     label: 'KPIs'      },
];

export default function BottomNav() {
  const { screen, setScreen, contadores } = useApp();

  // Hide during active vistoria to avoid distraction
  if (screen === 'vistoria' && contadores.pending > 0) return null;

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
```

---

## Task 10: Create VistoriaScreen

**Files:**
- Create: `cliente/src/screens/VistoriaScreen.jsx`

- [ ] **Step 1: Write VistoriaScreen.jsx**

```jsx
import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BentoCard from '../components/BentoCard';
import CardModal from '../components/CardModal';
import { salvarVistoria } from '../lib/sheets';
import { salvarFirestore } from '../lib/firebase';

export default function VistoriaScreen() {
  const { meta, updateMeta, respostas, updateResposta, contadores, PERGUNTAS, setScreen } = useApp();
  const [modalId, setModalId] = useState(null);
  const [loading, setLoading] = useState(false);

  const canFinish = contadores.pending === 0 && meta.ubs.trim() && meta.encarregada.trim();

  const handleAnswer = (id, status) => updateResposta(id, 'status', status);

  const handleFinish = async () => {
    if (!canFinish || loading) return;
    setLoading(true);

    const horaFim = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const falhasTexto = PERGUNTAS
      .filter(p => respostas[p.id].status === p.trigger)
      .map(p => `${p.label}: ${respostas[p.id].reason || 'Sem justificativa'}`)
      .join(' | ');

    const dados = {
      ...meta,
      horaFim,
      dataFinalizacao: new Date().toLocaleString('pt-BR'),
      falhas: falhasTexto,
    };

    await salvarVistoria(dados);
    await salvarFirestore({ ...dados, respostas });

    setLoading(false);
    setScreen('relatorio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Identification inputs */}
      <div className="px-3 pt-3 pb-2 bg-white border-b border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Unidade UBS *"
            className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400"
            value={meta.ubs}
            onChange={e => updateMeta('ubs', e.target.value)}
          />
          <input
            type="text"
            placeholder="Encarregada *"
            className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            value={meta.encarregada}
            onChange={e => updateMeta('encarregada', e.target.value)}
          />
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 auto-rows-[minmax(140px,auto)] gap-3 p-3">
        {PERGUNTAS.map(pergunta => (
          <BentoCard
            key={pergunta.id}
            pergunta={pergunta}
            status={respostas[pergunta.id].status}
            reason={respostas[pergunta.id].reason}
            hasPhoto={!!respostas[pergunta.id].photo}
            onAnswer={handleAnswer}
            onReasonChange={(id, val) => updateResposta(id, 'reason', val)}
            onLongPress={setModalId}
          />
        ))}
      </div>

      {/* Final evaluation block */}
      <div className="mx-3 mb-3 bg-slate-900 text-white rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black uppercase text-teal-400 tracking-widest">Avaliação Final</p>

        {/* Nota selector */}
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 text-center">Nota da Unidade (0–10)</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => updateMeta('notaVistoria', n)}
                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${
                  meta.notaVistoria === n
                    ? 'bg-teal-500 text-slate-900 scale-110 shadow-lg'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Previsão de Retorno</p>
          <input
            type="date"
            className="w-full bg-slate-800 text-white text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
            value={meta.dataRetorno}
            onChange={e => updateMeta('dataRetorno', e.target.value)}
          />
        </div>

        <textarea
          rows={3}
          className="w-full bg-slate-800 text-white text-sm rounded-xl p-3 resize-none outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Considerações gerais..."
          value={meta.consideracoesGerais}
          onChange={e => updateMeta('consideracoesGerais', e.target.value)}
        />

        <button
          onClick={handleFinish}
          disabled={!canFinish || loading}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            canFinish && !loading
              ? 'bg-teal-500 text-slate-900 active:scale-95 shadow-lg shadow-teal-900/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <Send size={18} />
          }
          {contadores.pending > 0
            ? `Aguardando ${contadores.pending} item(s)`
            : 'FINALIZAR VISTORIA'
          }
        </button>
      </div>

      {modalId && <CardModal perguntaId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
```

---

## Task 11: Create RelatorioScreen

**Files:**
- Create: `cliente/src/screens/RelatorioScreen.jsx`

- [ ] **Step 1: Write RelatorioScreen.jsx**

```jsx
import React from 'react';
import { Printer, MessageSquare, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function RelatorioScreen() {
  const { meta, respostas, PERGUNTAS, resetVistoria } = useApp();

  const irregularidades = PERGUNTAS
    .filter(p => respostas[p.id].status === p.trigger)
    .map(p => ({ ...p, ...respostas[p.id] }));

  const compartilharWhatsApp = () => {
    const falhas = irregularidades
      .map(p => `• ${p.label}: ${p.reason || 'Sem justificativa'}`)
      .join('\n');
    const texto = [
      `🚨 *RELATÓRIO DE VISTORIA: ${meta.ubs.toUpperCase()}*`,
      `👤 Encarregada: ${meta.encarregada}`,
      `⭐ Nota: *${meta.notaVistoria}/10*`,
      `📅 Retorno: ${meta.dataRetorno ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}`,
      '',
      `⚠️ *PRINCIPAIS FALHAS:*`,
      falhas || 'Nenhuma falha crítica registrada.',
      '',
      `📝 *OBS:* ${meta.consideracoesGerais || 'Consultar relatório.'}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
      <div id="relatorio-pdf" className="bg-white max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6 pb-6 border-b-2 border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Relatório de Vistoria
          </p>
          <h2 className="text-3xl font-black uppercase text-slate-900 leading-tight">
            {meta.ubs || 'Unidade não informada'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {meta.encarregada} · {meta.dataVistoria.split('-').reverse().join('/')}
          </p>
        </div>

        {/* Nota */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900 text-white p-5 rounded-3xl text-center min-w-[120px]">
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1">Nota Final</p>
            <span className="text-5xl font-black">{meta.notaVistoria}</span>
          </div>
        </div>

        {/* Bento read-only grid */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {PERGUNTAS.map(p => {
            const r = respostas[p.id];
            return (
              <div
                key={p.id}
                className={`${p.critical ? 'col-span-2' : 'col-span-1'} rounded-2xl p-3 ${
                  r.status === 'sim' ? 'bg-teal-700 text-white' :
                  r.status === 'nao' ? 'bg-red-700 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}
              >
                <p className="text-[10px] font-black uppercase leading-tight">{p.label}</p>
                <p className="mt-1 text-lg">
                  {r.status === 'sim' ? '✅' : r.status === 'nao' ? '🚫' : '⚠️'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Falhas */}
        <section className="mb-8">
          <h3 className="font-black text-lg border-l-8 border-red-500 pl-3 uppercase text-red-700 mb-4">
            Falhas Registradas
          </h3>
          {irregularidades.length === 0
            ? (
              <div className="p-8 bg-slate-50 rounded-3xl text-center text-slate-400 font-bold uppercase text-xs border border-slate-200">
                Unidade Conforme ✅
              </div>
            )
            : (
              <div className="space-y-4">
                {irregularidades.map(p => (
                  <div key={p.id} className="p-4 rounded-2xl border-2 border-red-100 bg-red-50">
                    <p className="font-black text-xs uppercase text-slate-700 mb-2">{p.label}</p>
                    <p className="text-sm text-slate-500 italic">
                      "{p.reason || 'Sem justificativa.'}"
                    </p>
                    {p.photo && (
                      <img
                        src={p.photo}
                        className="rounded-xl mt-3 w-full max-h-48 object-cover border border-red-200"
                        alt="Evidência"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </section>

        {/* Considerações */}
        {meta.consideracoesGerais && (
          <section className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-black uppercase text-slate-500 mb-2">Considerações Gerais</p>
            <p className="text-sm text-slate-600 italic">{meta.consideracoesGerais}</p>
          </section>
        )}

        {/* Retorno */}
        <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">
            Previsão de Retorno
          </p>
          <p className="text-xl font-black uppercase text-slate-800">
            {meta.dataRetorno
              ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR')
              : 'A DEFINIR'
            }
          </p>
        </div>
      </div>

      {/* Fixed action buttons */}
      <div className="print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex gap-3 shadow-lg z-50">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
        >
          <Printer size={16} /> PDF
        </button>
        <button
          onClick={compartilharWhatsApp}
          className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
        >
          <MessageSquare size={16} /> WhatsApp
        </button>
        <button
          onClick={resetVistoria}
          className="flex-1 bg-white text-slate-700 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-slate-200 active:scale-95"
        >
          <ArrowLeft size={16} /> Nova
        </button>
      </div>
    </div>
  );
}
```

---

## Task 12: Create stub screens for Parts 2.1–2.3

**Files:**
- Create: `cliente/src/screens/HistoricoScreen.jsx`
- Create: `cliente/src/screens/PlanejamentoScreen.jsx`
- Create: `cliente/src/screens/KPIsScreen.jsx`

- [ ] **Step 1: Write HistoricoScreen.jsx**

```jsx
import React from 'react';
export default function HistoricoScreen() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <p className="text-5xl mb-3">📋</p>
        <p className="font-black uppercase text-sm text-slate-600">Histórico de Vistorias</p>
        <p className="text-xs mt-1 text-slate-400">Em breve — Parte 2.1</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write PlanejamentoScreen.jsx**

```jsx
import React from 'react';
export default function PlanejamentoScreen() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <p className="text-5xl mb-3">📅</p>
        <p className="font-black uppercase text-sm text-slate-600">Planejamento Semanal</p>
        <p className="text-xs mt-1 text-slate-400">Em breve — Parte 2.2</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write KPIsScreen.jsx**

```jsx
import React from 'react';
export default function KPIsScreen() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <p className="text-5xl mb-3">📊</p>
        <p className="font-black uppercase text-sm text-slate-600">KPIs e Métricas</p>
        <p className="text-xs mt-1 text-slate-400">Em breve — Parte 2.3</p>
      </div>
    </div>
  );
}
```

---

## Task 13: Rewrite App.jsx as router shell

**Files:**
- Modify: `cliente/App.jsx`

- [ ] **Step 1: Replace entire App.jsx content**

```jsx
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
```

---

## Task 14: Final build validation

- [ ] **Step 1: Run build**

```bash
cd cliente && npm run build
```

Expected: `✓ built in X.XXs` with no errors. Warnings about bundle size are acceptable.

- [ ] **Step 2: Smoke test in browser**

```bash
npm run preview
```

Open `http://localhost:4173` on mobile viewport (DevTools → Toggle device). Verify:
- Header shows timer ticking
- ProgressSummary shows 0/0/0/15
- Bento grid renders with 4 critical (col-span-2) and 11 normal cards
- Tap S/N/NA on a card → color changes + counters update
- Long-press card → CardModal opens with photo option
- Marking Não → textarea appears inline
- All 15 answered → "FINALIZAR VISTORIA" button becomes active (teal)
- Finalize → RelatorioScreen renders bento read-only grid
- WhatsApp button → opens wa.me link
- BottomNav hidden during active vistoria, visible on relatorio/historico/etc.

- [ ] **Step 3: Commit**

```bash
cd cliente && git add -A
git commit -m "feat: bento dashboard redesign + component architecture (Parte 1)"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Grid bento 2-col mobile, critical=col-span-2
- ✅ Card states: pending/sim/nao/na with correct colors
- ✅ Toque longo → CardModal with photo
- ✅ Inline justificativa when Não
- ✅ Header with timer + progress bar
- ✅ ProgressSummary counters
- ✅ Botão Finalizar disabled while pending > 0
- ✅ RelatorioScreen bento read-only + WhatsApp + PDF
- ✅ BottomNav hidden during active vistoria
- ✅ Google Sheets + Firebase wired
- ✅ Stub screens for Parts 2.1–2.3
- ✅ PERGUNTAS array defines all 15 items with trigger + critical flags
- ✅ Paleta: teal-700 (sim), red-700 (nao), slate-300 diagonal (na)

**Type consistency verified:**
- `PERGUNTAS[n].trigger` = `'sim'|'nao'` (string, lowercase) — matches `respostas[id].status` comparison in VistoriaScreen and RelatorioScreen
- `updateResposta(id, key, value)` signature consistent across all callers
- `onAnswer(id, status)` in BentoCard → `handleAnswer(id, status)` in VistoriaScreen ✅
- `onReasonChange(id, val)` in BentoCard → `updateResposta(id, 'reason', val)` ✅
