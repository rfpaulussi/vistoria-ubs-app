import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Camera, Send, Clock, Star, ArrowLeft, MessageSquare, Loader2, Users, Download, FileText
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- CONFIGURAÇÕES ---
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
const isFirebaseReady = firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI";
if (isFirebaseReady) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) { console.error("Erro Firebase Init:", e); }
}

const QuestionBlock = ({ label, id, responses, updateResponse, handlePhoto }) => {
  const item = responses[id];
  const isTriggered = item.status === item.trigger;
  return (
    <div className={`mb-6 p-5 rounded-2xl border transition-all ${isTriggered ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex items-start mb-3">
        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${isTriggered ? 'bg-red-500' : 'bg-teal-500'}`} />
        <label className="text-sm font-bold text-slate-800 leading-tight">{label}</label>
      </div>
      <div className="flex gap-2 mb-4">
        {['Sim', 'Não', 'N/A'].map(opt => (
          <button key={opt} type="button" onClick={() => updateResponse(id, 'status', opt)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-black transition-all ${item.status === opt ? (opt === item.trigger ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-teal-600 text-white border-teal-600 shadow-md') : 'bg-white text-slate-400 border-slate-200'}`}>
            {opt}
          </button>
        ))}
      </div>
      {isTriggered && (
        <div className="space-y-4 pt-4 border-t border-red-100 animate-in fade-in">
          <textarea className="w-full bg-white border border-red-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="Justificativa / Motivo..." value={item.reason} onChange={(e) => updateResponse(id, 'reason', e.target.value)} />
          <label className="relative flex items-center justify-center w-full h-32 border-2 border-dashed border-red-200 rounded-xl bg-white cursor-pointer overflow-hidden">
            {item.photo ? <img src={item.photo} className="w-full h-full object-cover" /> : <div className="text-center text-red-400"><Camera size={24} className="mx-auto" /><span className="text-[10px] font-bold uppercase">FOTO</span></div>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(id, e)} />
          </label>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('form');
  const [loading, setLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [meta, setMeta] = useState({ ubs: '', encarregada: '', dataVistoria: new Date().toISOString().split('T')[0], horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), notaVistoria: 10, consideracoesGerais: '', dataRetorno: '' });
  
  const [responses, setResponses] = useState({
    uniforme: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Equipe Uniformizada' },
    epi: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Uso de EPIs' },
    ambiente: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Ambiente Geral Limpo' },
    sujeira: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Sujeira/Derramamento Tratado' },
    toque: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Superfícies de Alto Toque' },
    padrao: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Padrão de Limpeza Correto' },
    cronograma: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Cronograma de Limpeza' },
    organica: { status: '', reason: '', photo: null, trigger: 'Sim', label: 'Presença de Matéria Orgânica' },
    residuos: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Segregação de Resíduos' },
    lixeiras: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Lixeiras com Tampa/Fechadas' },
    areaResiduos: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Área de Resíduos Organizada' },
    equipamentos: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Materiais em Bom Estado' },
    produtos: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Produtos Identificados' },
    turno: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Responsável Turno Definido' },
    feedback: { status: '', reason: '', photo: null, trigger: 'Não', label: 'Orientação/Feedback Imediato' }
  });

  const updateMeta = (f, v) => setMeta(p => ({ ...p, [f]: v }));
  const updateResponse = (id, k, v) => setResponses(p => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const handlePhoto = (id, e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => updateResponse(id, 'photo', r.result); r.readAsDataURL(f); } };

  const finalizar = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const falhas = Object.values(responses).filter(r => r.status === r.trigger).map(r => `${r.label}: ${r.reason}`).join(' | ');
    const dadosParaSalvar = { ...meta, dataFinalizacao: new Date().toLocaleString('pt-BR'), falhas };

    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaSalvar)
      });
    } catch (err) { console.error("Sheets Error:", err); }

    if (isFirebaseReady) {
      addDoc(collection(db, 'vistorias'), { ...dadosParaSalvar, createdAt: serverTimestamp() })
        .catch(err => console.error(err));
    }

    setLoading(false);
    setView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baixarPDF = async () => {
    setGerandoPdf(true);
    try {
      const elemento = document.getElementById('relatorio-pdf');
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Vistoria_${meta.ubs || 'UBS'}.pdf`);
    } catch (erro) {
      console.error("Erro ao gerar PDF:", erro);
      alert("Erro ao gerar o PDF. Tente novamente.");
    }
    setGerandoPdf(false);
  };

  const compartilharWhatsApp = () => {
    const falhasTxt = Object.values(responses).filter(r => r.status === r.trigger).map(r => `• ${r.label}: ${r.reason}`).join('\n');
    const texto = `🚨 *VISTORIA: ${meta.ubs.toUpperCase()}*\n👤 Encarregada: ${meta.encarregada}\n⭐ Nota: *${meta.notaVistoria}/10*\n📅 Retorno: ${meta.dataRetorno ? new Date(meta.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}\n\n⚠️ *FALHAS:*\n${falhasTxt || 'Nenhuma falha registrada.'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header className="bg-teal-700 text-white p-5 rounded-b-[2rem] shadow-lg sticky top-0 z-50 flex justify-between items-center">
          <div><h1 className="text-lg font-black uppercase leading-none">Vistoria UBS</h1><p className="text-[10px] font-bold opacity-80 mt-1 flex items-center"><Clock size={12} className="mr-1" /> {meta.horaInicio}</p></div>
        </header>

        <main className="max-w-md mx-auto px-4 mt-6">
          <form onSubmit={finalizar} className="space-y-6">
            <section className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
              <input type="text" placeholder="Unidade UBS" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" value={meta.ubs} onChange={(e) => updateMeta('ubs', e.target.value)} required />
              <input type="text" placeholder="Encarregada" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" value={meta.encarregada} onChange={(e) => updateMeta('encarregada', e.target.value)} required />
            </section>

            {Object.entries(responses).map(([id, d]) => (
              <QuestionBlock key={id} id={id} label={d.label} responses={responses} updateResponse={updateResponse} handlePhoto={handlePhoto} />
            ))}

            <section className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl mb-10 border-t-4 border-teal-500">
              <h2 className="text-teal-400 font-black text-xs uppercase flex items-center"><Star size={16} className="mr-2" /> Avaliação Final</h2>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 text-center">Nota da Unidade (0 a 10)</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => updateMeta('notaVistoria', n)} 
                      className={`w-11 h-11 rounded-xl font-black text-sm transition-all ${meta.notaVistoria === n ? 'bg-teal-500 text-slate-900 scale-110 shadow-lg shadow-teal-500/50' : 'bg-slate-800 text-slate-500'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-700 pt-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Previsão de Retorno (Opcional)</label>
                <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500" value={meta.dataRetorno} onChange={(e) => updateMeta('dataRetorno', e.target.value)} />
              </div>

              <textarea rows="4" className="w-full bg-slate-800 rounded-2xl p-4 text-sm outline-none mt-4" placeholder="Considerações gerais..." value={meta.consideracoesGerais} onChange={(e) => updateMeta('consideracoesGerais', e.target.value)} />
              
              <button type="submit" disabled={loading} className="w-full bg-teal-500 text-slate-900 font-black py-5 rounded-2xl active:scale-95 disabled:opacity-50 flex justify-center items-center transition-all mt-6">
                {loading ? <Loader2 className="animate-spin" /> : <Send size={20} className="mr-2" />} FINALIZAR E SALVAR
              </button>
            </section>
          </form>
        </main>
      </div>
    );
  }

  // --- TELA DO RELATÓRIO VISUAL (USADA PARA O PDF) ---
  const irregularidades = Object.entries(responses).filter(([_, data]) => data.status === data.trigger);

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans text-slate-900">
      
      {/* Elemento que será transformado em PDF */}
      <div id="relatorio-pdf" className="bg-white max-w-2xl mx-auto p-8 min-h-screen">
        <div className="text-center mb-8 border-b-2 border-slate-100 pb-8">
          <h1 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Relatório de Vistoria</h1>
          <h2 className="text-4xl font-black uppercase text-slate-900 leading-none">{meta.ubs || 'Unidade não informada'}</h2>
          <div className="mt-4 flex flex-col items-center gap-1 text-sm font-bold text-slate-500 uppercase">
            <span className="flex items-center"><Users size={14} className="mr-2" /> Encarregada: {meta.encarregada || 'Não informada'}</span>
            <span className="flex items-center"><Clock size={14} className="mr-2" /> {new Date().toLocaleDateString('pt-BR')}</span>
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
          {irregularidades.length === 0 ? <div className="p-10 bg-slate-50 rounded-3xl text-center text-slate-400 font-bold uppercase text-xs">Unidade 100% Conforme</div> : 
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

      {/* Botões de Ação (Estes não aparecem no PDF) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-50 flex flex-col sm:flex-row justify-center gap-3">
        <button onClick={baixarPDF} disabled={gerandoPdf} className="flex-1 max-w-xs mx-auto bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50">
          {gerandoPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} 
          {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
        </button>
        <button onClick={compartilharWhatsApp} className="flex-1 max-w-xs mx-auto bg-green-600 text-white py-4 px-6 rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95">
          <MessageSquare size={18} /> WhatsApp
        </button>
        <button onClick={() => window.location.reload()} className="flex-1 max-w-xs mx-auto bg-slate-200 text-slate-700 py-4 px-6 rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95">
          <ArrowLeft size={18} /> Nova
        </button>
      </div>
    </div>
  );
}
