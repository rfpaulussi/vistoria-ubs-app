import React, { useEffect, useState } from 'react';
import { Copy, Link2, MessageSquare } from 'lucide-react';
import ResumoRetornoSupervisao from './ResumoRetornoSupervisao';
import { dataHoraBr, operacaoSupervisao, statusRetorno, urlRetorno } from '../lib/retornoSupervisao';

export function LinkSupervisao({ vistoriaId, unidade, link, abertos, onAtualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [gerado, setGerado] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const url = link?.ativo && link.id === gerado?.id ? gerado?.url : null;

  async function executar(operacao) {
    setOcupado(true);
    setErro('');
    setMensagem('');
    try {
      await operacao();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }

  function emitir(evento) {
    evento.preventDefault();
    const supervisor = new FormData(evento.currentTarget).get('supervisor');
    executar(async () => {
      const novo = await operacaoSupervisao('emitir_link_supervisao', {
        p_vistoria_id: vistoriaId, p_supervisor: supervisor, p_link_anterior: link?.id ?? null,
      });
      setGerado({ id: novo.id, url: urlRetorno(novo.token) });
      onAtualizar({ id: novo.id, supervisor: novo.supervisor, expira_em: novo.expira_em, ativo: true });
      setMensagem('Link emitido. Copie ou compartilhe com o supervisor.');
    });
  }

  function revogar() {
    executar(async () => {
      await operacaoSupervisao('revogar_link_supervisao', { p_vistoria_id: vistoriaId, p_link_id: link.id });
      onAtualizar({ ...link, ativo: false });
      setGerado(null);
      setMensagem('Acesso revogado.');
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setMensagem('Link copiado.');
    } catch {
      setMensagem('Selecione e copie o link no campo abaixo.');
    }
  }

  const texto = url && `Olá, ${link.supervisor}. Registre o retorno de cada apontamento da vistoria de ${unidade} por este link ${url}`;

  return (
    <section className="field-card space-y-3">
      <h4 className="flex items-center gap-2 font-bold"><Link2 size={17} aria-hidden="true" /> Link do supervisor</h4>
      {link?.ativo && <p className="text-sm">
        Link ativo para <strong>{link.supervisor}</strong> até {dataHoraBr(link.expira_em)}.
      </p>}
      {abertos > 0 && <form onSubmit={emitir}>
        <fieldset disabled={ocupado} className="flex min-w-0 flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 basis-52 gap-1 text-sm font-semibold">Nome do supervisor
            <input key={link?.id} name="supervisor" className="app-input" required maxLength={120}
              defaultValue={link?.supervisor ?? ''} />
          </label>
          <button className="app-primary" type="submit">
            {ocupado ? 'Aguarde…' : link?.ativo ? 'Substituir link' : 'Gerar link'}
          </button>
          {link?.ativo && <button className="app-secondary" type="button" onClick={revogar}>Revogar acesso</button>}
        </fieldset>
        <p className="mt-2 text-sm text-slate-600">
          {abertos} {abertos === 1 ? 'apontamento em acompanhamento' : 'apontamentos em acompanhamento'}.
          {' '}{link?.ativo ? 'A substituição invalida o link anterior.' : 'O supervisor responde sem login.'}
        </p>
      </form>}
      {!abertos && link?.ativo && <button className="app-secondary" type="button" disabled={ocupado} onClick={revogar}>Revogar acesso</button>}
      {url && <div className="grid gap-2 rounded-xl bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-secondary" onClick={copiar}><Copy size={16} aria-hidden="true" /> Copiar link</button>
          <a className="app-secondary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(texto)}`}>
            <MessageSquare size={16} aria-hidden="true" /> Abrir no WhatsApp
          </a>
        </div>
        <label className="grid gap-1 text-sm font-semibold">Endereço para compartilhar
          <input className="app-input" value={url} readOnly onFocus={evento => evento.currentTarget.select()} />
        </label>
      </div>}
      {mensagem && <p role="status" className="text-sm">{mensagem}</p>}
      {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    </section>
  );
}

export function RevisaoSupervisao({ respostas, situacao, onRevisar }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [devolver, setDevolver] = useState(false);
  const [atual, ...anteriores] = respostas;

  async function revisar(decisao, nota) {
    setOcupado(true);
    setErro('');
    try {
      await onRevisar(atual.id, decisao, nota);
      setDevolver(false);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }

  const aceitar = { corrigida: 'Validar correção e encerrar', planejada: 'Aceitar plano', impedida: 'Registrar ciência do impedimento' };

  return (
    <section className="space-y-3 rounded-xl bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-sm">Retorno da supervisão</h4>
        <span className="status-pill">{statusRetorno(situacao, atual)}</span>
      </div>
      {atual && <ResumoRetornoSupervisao resposta={atual} interno />}
      {atual && !atual.decisao && situacao !== 'resolvido' && (
        devolver ? (
          <form onSubmit={evento => {
            evento.preventDefault();
            revisar('devolvido', new FormData(evento.currentTarget).get('nota'));
          }}>
            <fieldset className="grid min-w-0 gap-2" disabled={ocupado}>
              <label className="grid gap-1 text-sm font-semibold">O que o supervisor precisa complementar
                <textarea className="app-input" name="nota" rows={3} required maxLength={1000} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="app-primary" type="submit">{ocupado ? 'Salvando…' : 'Solicitar complemento'}</button>
                <button className="app-secondary" type="button" onClick={() => setDevolver(false)}>Cancelar</button>
              </div>
            </fieldset>
          </form>
        ) : <div className="flex flex-wrap gap-2">
          <button type="button" className="app-primary" disabled={ocupado} onClick={() => revisar('aceito', '')}>
            {ocupado ? 'Salvando…' : aceitar[atual.situacao]}
          </button>
          <button type="button" className="app-secondary" disabled={ocupado} onClick={() => setDevolver(true)}>Pedir complemento</button>
        </div>
      )}
      {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
      {anteriores.length > 0 && <details className="border-t pt-2">
        <summary className="cursor-pointer text-sm font-semibold">Respostas anteriores ({anteriores.length})</summary>
        <div className="mt-2 space-y-3">
          {anteriores.map(resposta => <div key={resposta.id} className="rounded-xl border bg-white p-3">
            <ResumoRetornoSupervisao resposta={resposta} interno />
          </div>)}
        </div>
      </details>}
    </section>
  );
}

export function useRetornosSupervisao(vistoriaId, carregar, versaoLista) {
  const [dados, setDados] = useState(null);
  const [estado, setEstado] = useState('carregando');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!carregar) return;
    let ativo = true;
    operacaoSupervisao('acompanhar_retorno_supervisao', { p_vistoria_id: vistoriaId }).then(resultado => {
      if (!ativo) return;
      setDados(resultado);
      setEstado('pronto');
    }).catch(() => { if (ativo) setEstado('erro'); });
    return () => { ativo = false; };
  }, [vistoriaId, carregar, versao, versaoLista]);

  async function revisar(id, decisao, nota) {
    const situacao = await operacaoSupervisao('revisar_retorno_supervisao', {
      p_resposta_id: id, p_decisao: decisao, p_nota: nota,
    });
    // Remove as ações da revisão imediatamente enquanto o servidor recarrega o registro.
    setDados(atual => ({
      ...atual,
      respostas: atual.respostas.map(resposta => resposta.id === id ? { ...resposta, decisao } : resposta),
    }));
    setVersao(v => v + 1);
    return situacao;
  }

  return {
    dados, estado, revisar,
    atualizar: () => {
      setEstado('carregando');
      setVersao(v => v + 1);
    },
    atualizarLink: link => setDados(atual => ({ ...atual, link })),
  };
}
