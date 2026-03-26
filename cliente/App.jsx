import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Camera, Clock, Star, LayoutDashboard, ArrowLeft, MessageSquare, Loader2, Share2, Users, FileText, Download, Send
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- CONFIGURAÇÃO FIREBASE E SHEETS ---
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxDLjQ75Ice_nl7M0y6GuCJCv-_4FEk4Bw392mq3T74Kw5JKIi1zZAMOiZmhFT8JMMoLA/exec";

const firebaseConfig = {
  apiKey: "AIzaSyDnFrxu0a6WMj5z9PpWxGJjNV-i5hiHV2g",
  authDomain: "vistoria-ubs-app.firebaseapp.com",
  projectId: "vistoria-ubs-app",
  storageBucket: "vistoria-ubs-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app, auth, db;
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI";

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) { console.error("Firebase init erro:", e); }
}

const appId = 'vistoria-ubs-final';

// --- COMPONENTE DE PERGUNTA ---
const QuestionBlock = ({ label, id, icon: Icon, desc, responses, updateResponse, handlePhoto }) => {
  const item = responses[id];
  const isTriggered = item.status === item.trigger;

  return (
    <div className={`mb-6 p-5 rounded-2xl border transition-all ${isTriggered ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex items-start mb-3">
        {Icon ? <Icon size={20} className={`mr-3 mt-1 ${isTriggered ? 'text-red-600' : 'text-teal-600'}`} /> : <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${isTriggered ? 'bg-red-500' : 'bg-teal-500'}`} />}
        <div>
          <label className="text-sm font-bold text-slate-800 leading-tight block">{label}</label>
          {desc && <p className="text-[11px] text-slate-400 mt-1 italic">{desc}</p>}
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        {['Sim', 'Não', 'N/A'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => updateResponse(id, 'status', opt)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-black transition-all ${
              item.status === opt 
                ? (opt === item.trigger ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-teal-600 text-white border-teal-600 shadow-md')
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {isTriggered && (
        <div className="space-y-4 pt-4 border-t border-red-100 animate-in fade-in slide-in-from-top-1">
          <div>
             <label className="text-[10px] font-black uppercase text-red-600 flex items-center mb-1 tracking-tighter">
               <MessageSquare size={12} className="mr-1" /> Justificativa / Motivo:
             </label>
             <textarea 
                className="w-full bg-white border border-red-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-400 outline-none"
                placeholder="Explique o problema encontrado..."
                value={item.reason}
                onChange={(e) => updateResponse(id, 'reason', e.target.value)}
              />
          </div>
          <label className="relative flex items-center justify-center w-full h-32 border-2 border-dashed border-red-200 rounded-xl bg-white cursor-pointer overflow-hidden">
            {item.photo ? (
              <img src={item.photo} className="w-full h-full object-cover" alt="Evidência" />
            ) : (
              <div className="text-center text-red-400">
                <Camera size={24} className="mx-auto mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Bater Foto</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(id, e)} />
          </label>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('form'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [historico, setHistorico] = useState([]);
  
  const [meta, setMeta] = useState({
    ubs: '',
    encarregada: '',
    dataVistoria: new Date().toISOString().split('T')[0],
    horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dataRetorno: '',
    consideracoesGerais: '',
    notaVistoria: 10
  });

  const [responses, setResponses] = useState({
    uniformeEquipe: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Equipe Uniformizada' },
    usoEpi: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Uso de EPIs' },
    ambienteGeral: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Ambiente Geral Limpo' },
    sujeiraDerramamento: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Sujeira/Derramamento Tratado' },
    altoToque: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Superfícies de Alto Toque' },
    padraoLimpeza: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Padrão de Limpeza Correto' },
    cronogramaLimpeza: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Cronograma de Limpeza' },
    materiaOrganica: { status: '', reason: '', photo: null, trigger: 'Sim', label: 'Presença de Matéria Orgânica' },
    residuosSegregados: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Segregação de Resíduos' },
    lixeirasTampadas: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Lixeiras com Tampa/Fechadas' },
    areaResiduos: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Área de Resíduos Organizada' },
    equipamentosMateriais: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Materiais em Bom Estado' },
    produtosIdentificados: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Produtos Identificados' },
    responsavelTurno: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Responsável Turno Definido' },
    problemasTratados: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Orientação/Feedback Imediato' }
  });

  useEffect(() => {
    if (!isConfigValid) return;
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (e) { console.error("Erro na autenticação", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && user && db) {
      const fetchDocs = async () => {
        try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'vistorias'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          setHistorico(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { console.error("Erro ao carregar dados", err); }
      };
      fetchDocs();
    }
  }, [view, user]);

  const updateMeta = (field, value) => setMeta(prev => ({ ...prev, [field]: value }));
  const updateResponse = (id, key, value) => setResponses(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const handlePhoto = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateResponse(id, 'photo', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const salvarVistoria = async (e) => {
    e.preventDefault();
    setLoading(true);
    const horaFim = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const falhasTexto = Object.entries(responses)
      .filter(([_, data]) => data.status === data.trigger)
      .map(([_, data]) => `${data.label}: ${data.reason}`)
      .join(' | ');

    const dadosFinais = { ...meta, horaFim, dataFinalizacao: new Date().toLocaleString('pt-BR'), falhas: falhasTexto };
    
    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosFinais)
      });
    } catch (err) { console.error("Sheets Error:", err); }

    if (isConfigValid && db) {
      addDoc(collection(db, 'vistorias'), {
        ...dadosFinais, responses, uid: user?.uid || 'anonimo', createdAt: serverTimestamp()
      }).catch(err => console.error(err));
    }
    
    setLoading(false);
    setView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baixarPDF = async () => {
    setGerandoPdf(true);
    try {
      // 1. Rola para o topo (MUITO IMPORTANTE PARA O PDF NÃO SAIR CORTADO)
      window.scrollTo(0, 0);
      
      // 2. Aguarda um pouquinho para a tela carregar o topo antes de "bater a foto"
      await new Promise(resolve => setTimeout(resolve, 800));

      const elemento = document.getElementById('relatorio-pdf');
      
      // 3. Scale 1 para não sobrecarregar a memória do celular
      const canvas = await html2canvas(elemento, { 
        scale: 1, 
        useCORS: true,
        allowTaint: true
      });
      
      // 4. Salva em JPEG (muito mais leve que PNG)
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Vistoria_${meta.ubs || 'UBS'}.pdf`);
    } catch (erro) {
      console.error("Erro ao gerar PDF:", erro);
      alert("Falha ao gerar PDF: " + (erro.message || erro));
    } finally {
      setGerandoPdf(false);
    }
  };

  const compartilharWhatsApp = () => {
    const falhas = Object.entries(responses)
      .filter(([_, data]) => data.status === data.trigger)
      .map(([_, data]) => `• ${data.label}: ${data.reason}`)
      .join('\n');

    const texto = `🚨 *RELATÓRIO DE VISTORIA: ${meta.ubs.toUpperCase()}*\n` +
      `👤 Encarregada: ${meta.encarregada}\n` +
      `⭐ Nota: *${meta.notaVistoria}/10*\n` +
      `📅 Retorno: ${meta.dataRetorno ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}\n\n` +
      `⚠️ *PRINCIPAIS FALHAS:*\n${falhas || 'Nenhuma falha crítica registrada.'}\n\n` +
      `📝 *OBS:* ${meta.consideracoesGerais || 'Consultar relatório detalhado.'}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header className="bg-teal-700 text-white p-5 rounded-b-[2.5rem] shadow-xl sticky top-0 z-50 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight leading-none">Vistoria Campo</h1>
            <p className="text-[10px] font-bold opacity-80 mt-1 flex items-center">
              <Clock size={12} className="mr-1" /> Início: {meta.horaInicio}
            </p>
          </div>
          <button onClick={() => setView('dashboard')} className="bg-teal-800 p-2 rounded-full shadow-inner">
            <LayoutDashboard size={20} />
          </button>
        </header>

        <main className="max-w-md mx-auto px-4 mt-6">
          <form onSubmit={salvarVistoria} className="space-y-6">
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Identificação</h3>
              <input type="text" placeholder="Unidade UBS" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" value={meta.ubs} onChange={(e) => updateMeta('ubs', e.target.value)} required />
              <input type="text" placeholder="Nome da Encarregada" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" value={meta.encarregada} onChange={(e) => updateMeta('encarregada', e.target.value)} required />
            </section>

            {Object.entries(responses).map(([id, data]) => (
              <QuestionBlock key={id} id={id} label={data.label} responses={responses} updateResponse={updateResponse} handlePhoto={handlePhoto} />
            ))}

            <section className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-6 mb-10 border-t-4 border-teal-500 text-white">
              <h2 className="text-teal-400 font-black text-xs uppercase flex items-center"><Star size={16} className="mr-2" /> Avaliação Final</h2>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 text-center">Nota da Unidade (0 a 10)</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} type="button" onClick={() => updateMeta('notaVistoria', n)} className={`w-11 h-11 rounded-lg font-black text-xs transition-all ${meta.notaVistoria === n ? 'bg-teal-500 text-slate-900 scale-110 shadow-lg shadow-teal-500/50' : 'bg-slate-800 text-slate-500'}`}>{n}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Previsão de Retorno (Opcional)</label>
                <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500" value={meta.dataRetorno} onChange={(e) => updateMeta('dataRetorno', e.target.value)} />
              </div>

              <textarea rows="4" className="w-full bg-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-1 focus:ring-teal-500" placeholder="Considerações gerais..." value={meta.consideracoesGerais} onChange={(e) => updateMeta('consideracoesGerais', e.target.value)} />

              <button type="submit" disabled={loading} className="w-full bg-teal-500 text-slate-900 font-black py-5 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 flex justify-center items-center transition-all">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send size={20} className="mr-2" />} FINALIZAR E SALVAR
              </button>
            </section>
          </form>
        </main>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 flex items-center justify-between">
          <button onClick={() => setView('form')} className="text-teal-400 flex items-center text-xs font-bold uppercase tracking-widest"><ArrowLeft size={16} className="mr-1" /> Voltar</button>
          <h1 className="text-xs font-black uppercase">Histórico</h1>
          <div className="w-10"></div>
        </header>
        <main className="max-w-2xl mx-auto p-4 space-y-4">
          {!isConfigValid ? (
            <div className="text-center p-10 text-slate-400 font-bold uppercase text-xs">Configure o Firebase para ver o histórico</div>
          ) : historico.length === 0 ? (
            <div className="text-center p-10 text-slate-400 font-bold uppercase text-xs">Nenhuma vistoria encontrada</div>
          ) : (
            historico.map(vis => (
              <div key={vis.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group active:scale-95 transition-all">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm">{vis.ubs}</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{vis.dataVistoria} • {vis.encarregada}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg ${vis.notaVistoria < 6 ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'}`}>
                  {vis.notaVistoria}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    );
  }

  const irregularidades = Object.entries(responses).filter(([_, data]) => data.status === data.trigger);

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans text-slate-900">
      
      {/* --- ÁREA QUE SAI NO PDF --- */}
      <div id="relatorio-pdf" className="bg-white max-w-2xl mx-auto p-8 min-h-screen">
        <div className="text-center mb-8 border-b-2 border-slate-100 pb-8">
          <h1 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Relatório de Vistoria</h1>
          <h2 className="text-4xl font-black uppercase text-slate-900 leading-none">{meta.ubs || 'Unidade não informada'}</h2>
          <div className="mt-4 flex flex-col items-center gap-1 text-sm font-bold text-slate-500 uppercase">
            <span className="flex items-center"><Users size={14} className="mr-2" /> Encarregada: {meta.encarregada || 'Não informada'}</span>
            <span className="flex items-center"><Clock size={14} className="mr-2" /> {meta.dataVistoria.split('-').reverse().join('/')}</span>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] text-center min-w-[150px] shadow-2xl">
            <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Nota Final</p>
            <span className="text-6xl font-black">{meta.notaVistoria}</span>
          </div>
        </div>

        <section className="mb-12">
          <h3 className="font-black text-xl border-l-8 border-red-500 pl-4 uppercase text-red-700 mb-6">Falhas Registradas</h3>
          {irregularidades.length === 0 ? <div className="p-10 bg-slate-50 rounded-3xl text-center text-slate-400 font-bold uppercase text-xs">Unidade Conforme (Sem falhas)</div> : 
            <div className="space-y-8">
              {irregularidades.map(([key, data]) => (
                <div key={key} className="p-6 rounded-[2rem] border-2 border-red-50 bg-red-50/20 shadow-sm">
                  <span className="font-black text-slate-700 text-xs uppercase block mb-3">{data.label}</span>
                  <div className="bg-white p-4 rounded-2xl border border-red-100 mb-4 text-sm text-slate-600 font-medium italic">"{data.reason || 'Sem justificativa.'}"</div>
                  {data.photo && <img src={data.photo} className="rounded-3xl w-full h-64 object-cover shadow-md" alt="Evidência" />}
                </div>
              ))}
            </div>
          }
        </section>

        {meta.consideracoesGerais && (
          <section className="mb-12 p-6 bg-slate-50 rounded-[2rem]">
            <h3 className="font-black text-sm uppercase text-slate-700 mb-3 flex items-center"><FileText size={16} className="mr-2"/> Considerações Gerais</h3>
            <p className="text-sm text-slate-600 italic">{meta.consideracoesGerais}</p>
          </section>
        )}

        <div className="mt-10 border-t-2 border-slate-100 pt-10 text-center">
           <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2">Previsão de Retorno</p>
           <p className="text-2xl font-black uppercase text-slate-800">
             {meta.dataRetorno ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR') : 'A DEFINIR'}
           </p>
        </div>
      </div>

      {/* --- BOTÕES NO RODAPÉ --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-200 p-4 z-50 flex justify-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <button onClick={baixarPDF} disabled={gerandoPdf} className="flex-1 max-w-[160px] bg-slate-900 text-white py-4 px-2 rounded-2xl font-bold uppercase text-[10px] sm:text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
          {gerandoPdf ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
          {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
        </button>
        <button onClick={compartilharWhatsApp} className="flex-1 max-w-[160px] bg-green-600 text-white py-4 px-2 rounded-2xl font-bold uppercase text-[10px] sm:text-xs flex items-center justify-center gap-2 active:scale-95">
          <MessageSquare size={16} /> WhatsApp
        </button>
        <button onClick={() => window.location.reload()} className="flex-1 max-w-[120px] bg-white text-slate-700 py-4 px-2 rounded-2xl font-bold uppercase text-[10px] sm:text-xs flex items-center justify-center gap-2 border border-slate-200 active:scale-95">
          <ArrowLeft size={16} /> Nova
        </button>
      </div>
    </div>
  );
}
