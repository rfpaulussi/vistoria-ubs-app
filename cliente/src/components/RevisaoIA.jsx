import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const usaRevisaoIA = import.meta.env.VITE_REVISAO_IA === 'true';

export default function RevisaoIA({ texto, onAplicar, limite = 3500, rotulo = 'Revisar com IA', desabilitado = false }) {
  const [revisao, setRevisao] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const acimaDoLimite = texto.trim().length > limite;
  const sugestaoAtual = revisao?.original === texto ? revisao.sugestao : '';
  const sugestaoLonga = sugestaoAtual.length > limite;

  async function revisar() {
    if (desabilitado || ocupado || !texto.trim() || acimaDoLimite) return;
    setOcupado(true);
    setErro('');
    setRevisao(null);
    try {
      const { data, error } = await supabase.functions.invoke('assistencia-vistoria', { body: { texto } });
      if (error) {
        const resposta = await error.context?.json?.().catch(() => null);
        if (resposta?.codigo === 'LIMITE_DIARIO') {
          setErro('Limite diário de revisões atingido. Você ainda pode editar e salvar seu texto.');
          return;
        }
        if (error.context?.status === 404 || resposta?.codigo === 'IA_INDISPONIVEL') {
          setErro('A revisão por IA ainda está indisponível neste ambiente. Você pode editar e salvar o texto.');
          return;
        }
        throw error;
      }
      if (typeof data?.sugestao !== 'string' || !data.sugestao.trim()) throw new Error('Sugestão vazia');
      setRevisao({ original: texto, sugestao: data.sugestao });
    } catch {
      setErro('Não foi possível revisar agora. Tente novamente ou continue com seu texto.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="app-secondary" disabled={desabilitado || ocupado || !texto.trim() || acimaDoLimite} onClick={revisar}>
        <Sparkles size={16} aria-hidden="true" /> {ocupado ? 'Revisando…' : rotulo}
      </button>
      <p className="text-xs text-slate-600">
        {acimaDoLimite ? `A revisão aceita até ${limite.toLocaleString('pt-BR')} caracteres.` : 'Antes de pedir a revisão, retire nomes, documentos e informações de saúde.'}
      </p>
      {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
      {revisao && !sugestaoAtual && <p role="status" className="text-sm text-slate-700">
        O texto mudou após o pedido. Solicite uma nova revisão para usar a versão atual.
      </p>}
      {sugestaoAtual && <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
        <p role="status" className="text-sm font-bold">Sugestão de redação</p>
        <p className="whitespace-pre-wrap break-words text-sm text-slate-900">{sugestaoAtual}</p>
        {sugestaoLonga && <p className="text-sm">A sugestão ultrapassa o limite deste campo.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-primary" disabled={desabilitado || sugestaoLonga} onClick={() => {
            onAplicar(sugestaoAtual);
            setRevisao(null);
          }}>Usar sugestão</button>
          <button type="button" className="app-secondary" onClick={() => setRevisao(null)}>Manter meu texto</button>
        </div>
      </div>}
    </div>
  );
}
