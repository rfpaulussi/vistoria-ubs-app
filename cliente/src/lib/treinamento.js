const procedimentosPorItem = new Map([
  ['padraoLimpeza', 'sequencia-limpeza-1'],
  ['diluicaoCorreta', 'diluicao-orientacao-1'],
  ['altoToque', 'superficies-alto-toque-1'],
  ['materiaOrganica', 'contaminacao-biologica-1'],
  ['residuosSegregados', 'segregacao-residuos-1'],
  ['orientacaoResiduosInfectantes', 'transporte-residuos-infectantes-1'],
]);

const temasPorItem = new Map([
  ['ambienteGeral', ['paredes-tetos-1', 'pisos-salas-1', 'pisos-circulacao-1']],
  ['cronogramaLimpeza', ['limpeza-concorrente-1', 'limpeza-terminal-1']],
  ['sujeiraDerramamento', ['contaminacao-biologica-1']],
  ['usoEpi', []],
  ['lixeirasTampadas', ['lixeira-infectante-1']],
  ['areaResiduos', []],
  ['equipamentosMateriais', []],
  ['produtosIdentificados', []],
  ['limpezaVentiladores', []],
  ['papeleiras', []],
  ['saboneteiras', []],
  ['vidrosBaixaAltura', []],
]);

export function sugerirTreinamentos(perguntas, respostas, catalogo) {
  const ativos = new Map(catalogo.map(procedimento => [procedimento.id, procedimento]));
  const sugestoes = new Map();
  const classificar = [];
  const semPop = [];

  for (const { id, label, trigger } of perguntas) {
    const resposta = respostas[id];
    if (resposta?.status !== trigger) continue;
    const direto = procedimentosPorItem.get(id);
    const temas = temasPorItem.get(id);
    const opcoes = temas?.map(tema => ativos.get(tema)).filter(Boolean);
    if (opcoes) classificar.push({ id, label, opcoes });

    const escolhido = opcoes?.find(procedimento => procedimento.id === resposta.temaTreinamento);
    const procedimento = direto ? ativos.get(direto) : escolhido;
    if (procedimento) {
      const existente = sugestoes.get(procedimento.id);
      if (existente) existente.itens.push(label);
      else sugestoes.set(procedimento.id, { procedimento, itens: [label] });
    } else if (id === 'sujeiraDerramamento' && resposta.temaTreinamento === 'quimico') {
      semPop.push(`${label} · Derramamento químico`);
    } else if (direto || (opcoes && resposta.temaTreinamento === 'sem_pop')) {
      semPop.push(label);
    }
  }
  return { sugestoes: [...sugestoes.values()], classificar, semPop };
}
