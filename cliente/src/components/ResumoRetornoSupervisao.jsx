import React from 'react';
import { dataBr, dataHoraBr, situacoesRetorno } from '../lib/retornoSupervisao';

export default function ResumoRetornoSupervisao({ resposta, interno }) {
  return (
    <div className="grid gap-2 text-sm break-words">
      <p><strong>{situacoesRetorno[resposta.situacao]}</strong></p>
      <p className="whitespace-pre-wrap">{resposta.descricao}</p>
      <dl className="grid gap-1 sm:grid-cols-2">
        <div><dt className="font-semibold">Responsável pela ação</dt><dd>{resposta.responsavel}</dd></div>
        {resposta.data_acao && <div>
          <dt className="font-semibold">{resposta.situacao === 'corrigida' ? 'Data da correção' : 'Prazo informado'}</dt>
          <dd>{dataBr(resposta.data_acao)}</dd>
        </div>}
        <div>
          <dt className="font-semibold">Enviado por</dt>
          <dd>{resposta.respondido_por} · {dataHoraBr(resposta.enviada_em)}</dd>
        </div>
        {interno && <div><dt className="font-semibold">Link destinado a</dt><dd>{resposta.supervisor}</dd></div>}
      </dl>
      {resposta.comprovacao && <div>
        <p className="font-semibold">Evidência ou referência</p>
        <p className="whitespace-pre-wrap">{resposta.comprovacao}</p>
      </div>}
      {resposta.revisada_em && <div className="border-t pt-2">
        <p className="font-semibold">{resposta.decisao === 'devolvido' ? 'Complemento solicitado' : 'Retorno aceito'}
          {' · '}{dataHoraBr(resposta.revisada_em)}{interno && resposta.revisor && ` · ${resposta.revisor}`}</p>
        {resposta.prazo_complemento && <p>Prazo para complementar · {dataBr(resposta.prazo_complemento)}</p>}
        {resposta.nota_revisao && <p className="whitespace-pre-wrap">{resposta.nota_revisao}</p>}
      </div>}
    </div>
  );
}
