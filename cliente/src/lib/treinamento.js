const procedimentosPorItem = new Map([
  ['padraoLimpeza', 'sequencia-limpeza-1'],
  ['diluicaoCorreta', 'diluicao-orientacao-1'],
  ['orientacaoResiduosInfectantes', 'lixeira-infectante-1'],
]);

export function sugerirTreinamentos(perguntas, respostas, catalogo) {
  const ativos = new Map(catalogo.map(procedimento => [procedimento.id, procedimento]));
  return perguntas.flatMap(pergunta => {
    const procedimento = ativos.get(procedimentosPorItem.get(pergunta.id));
    return procedimento && respostas[pergunta.id]?.status === pergunta.trigger
      ? [{ procedimento, item: pergunta.label }]
      : [];
  });
}
