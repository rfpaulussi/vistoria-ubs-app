import React, { useState } from 'react';
import { dataHoraBr, operacaoSupervisao } from '../lib/retornoSupervisao';

export default function VerificacaoExecucao({ plano, situacao, verificacoes, onSalvo }) {
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const podeVerificar = situacao !== 'resolvido' && plano?.decisao === 'aceito' && plano.situacao === 'planejada';

  async function registrar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const campos = new FormData(formulario);
    setOcupado(true);
    setErro('');
    setMensagem('');
    try {
      const apontamento = await operacaoSupervisao('verificar_execucao_supervisao', {
        p_resposta_id: plano.id,
        p_executada: campos.get('resultado') === 'executada',
        p_fonte: campos.get('fonte'),
        p_nota: campos.get('nota'),
      });
      formulario.reset();
      onSalvo(apontamento);
      setMensagem('Verificação registrada.');
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!podeVerificar && !verificacoes.length) return null;

  return <section className="space-y-3 rounded-xl border bg-white p-3">
    <h4 className="font-bold text-sm">Verificação da execução</h4>
    {podeVerificar && <form onSubmit={registrar}>
      <p className="mb-3 text-sm text-slate-700">Registre o que verificou no retorno à unidade ou pelas informações que recebeu.</p>
      <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2" disabled={ocupado}>
        <label className="grid gap-1 text-sm font-semibold">Resultado
          <select name="resultado" className="app-input" defaultValue="" required>
            <option value="">Selecione</option>
            <option value="executada">Ação executada · encerrar apontamento</option>
            <option value="pendente">Ação ainda pendente</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Como verificou
          <select name="fonte" className="app-input" defaultValue="" required>
            <option value="">Selecione</option>
            <option value="visita">Retorno à unidade</option>
            <option value="informacao">Informação recebida</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Observação da verificação
          <textarea name="nota" className="app-input" rows={2} maxLength={1000} required />
        </label>
        <button type="submit" className="app-primary sm:justify-self-start">{ocupado ? 'Salvando…' : 'Registrar verificação'}</button>
      </fieldset>
    </form>}
    {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    {mensagem && <p role="status" className="text-sm">{mensagem}</p>}
    {verificacoes.slice().reverse().map(verificacao => (
      <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm break-words" key={verificacao.verificada_em}>
        <p className="font-semibold">{verificacao.executada ? 'Execução confirmada' : 'Ação ainda pendente'}</p>
        <p>{verificacao.fonte === 'visita' ? 'Retorno à unidade' : 'Informação recebida'} · {dataHoraBr(verificacao.verificada_em)} · {verificacao.nome}</p>
        <p className="whitespace-pre-wrap">{verificacao.nota}</p>
      </div>
    ))}
  </section>;
}
