# Design Spec — Vistoria UBS: Redesign Bento + Novas Funcionalidades

**Data:** 2026-06-30  
**Status:** Aprovado

---

## Contexto

App mobile-first para vistoria de UBS, usado exclusivamente no celular pela encarregada de campo. Stack: React 18 + Vite + Tailwind v4 + lucide-react. Persistência primária via Google Apps Script webhook (planilha privada). Firebase mantido como camada secundária/futura.

---

## Escopo

- **Parte 1:** Redesign completo da UI (bento dashboard)
- **Parte 2.1:** Histórico de visitas
- **Parte 2.2:** Planejamento semanal (schema a validar antes de implementar)
- **Parte 2.3:** KPIs e métricas

Implementação incremental: cada parte passa por build validation antes da próxima.

---

## Arquitetura

### Estrutura de arquivos

```
cliente/src/
├── context/
│   └── AppContext.jsx        # estado global da aplicação
├── lib/
│   ├── sheets.js             # POST/GET para Apps Script
│   └── firebase.js           # wrapper Firebase (mantido, opcional)
├── screens/
│   ├── VistoriaScreen.jsx    # bento dashboard principal
│   ├── RelatorioScreen.jsx   # resumo pós-finalização (read-only)
│   ├── HistoricoScreen.jsx   # Parte 2.1
│   ├── PlanejamentoScreen.jsx # Parte 2.2
│   └── KPIsScreen.jsx        # Parte 2.3
├── components/
│   ├── BentoCard.jsx         # card único parametrizado por size/status/question
│   ├── CardModal.jsx         # toque longo → foto/observação/anexo
│   ├── Header.jsx            # header fixo: cronômetro + barra de progresso
│   ├── ProgressSummary.jsx   # card resumo Sim/Não/N/A/Pendente
│   └── BottomNav.jsx         # navegação inferior entre telas
└── App.jsx                   # roteador por useState('screen'), sem React Router
```

Navegação via `useState` em App.jsx — zero dependências novas.

---

## Parte 1: Bento Dashboard

### Layout mobile

Grid: `grid-cols-2 auto-rows-[minmax(120px,auto)] gap-3`

- Itens críticos: `col-span-2` (largura total)
- Itens normais: `col-span-1`

### Classificação dos 15 itens

**Críticos (col-span-2, borda vermelha quando Não):**
- Matéria Orgânica (`materiaOrganica`)
- Uso de EPIs (`usoEpi`)
- Segregação de Resíduos (`residuosSegregados`)
- Padrão Técnico de Limpeza (`padraoLimpeza`)

**Normais (col-span-1):** os 11 restantes.

### Estados dos cards

| Estado | Visual |
|---|---|
| Pendente | fundo slate-100, borda slate-200, ponto pulsante |
| ✅ Sim | fundo teal-700, texto branco, check grande |
| 🚫 Não | fundo red-700, texto branco, mini-textarea inline |
| ⚠️ N/A | fundo slate-300, faixa diagonal CSS, texto muted |

Ao marcar Não: mini-textarea de justificativa aparece inline no card.  
📷 badge aparece quando há foto anexada.

### Interações

- **Toque simples:** 3 botões (S/N/NA) inline no card
- **Toque longo (500ms):** abre `CardModal` com foto, observação expandida, flag
- **Animação:** `transition-all duration-200`, `scale-95` no press

### Paleta

- Verde petróleo: `teal-700` (#0f766e) — Sim / conforme
- Âmbar: `amber-500` — atenção (futuro)
- Vermelho tijolo: `red-700` — crítico / Não
- Cinza diagonal: `slate-300` + pattern CSS — N/A

### Header fixo

- Cronômetro da vistoria (incrementa a cada segundo)
- Barra de progresso `(respondidos / total * 100)%`
- Nome da UBS + nome da encarregada (após preenchimento)

### Campos de identificação

Bloco bento no topo (`col-span-2`): inputs de Unidade UBS e Encarregada. Obrigatórios antes de responder qualquer card.

### Card de resumo de progresso

Fixo acima do grid: contadores Sim / Não / N/A / Pendente com cores correspondentes.

### Finalização

- Botão "Finalizar" ativo somente quando Pendente = 0
- Ao finalizar: salva via Apps Script + Firebase → navega para RelatorioScreen
- RelatorioScreen: grid bento read-only + botões PDF / WhatsApp / Nova Vistoria

---

## Estado global (AppContext)

```js
{
  screen: 'vistoria' | 'relatorio' | 'historico' | 'planejamento' | 'kpis',
  meta: {
    ubs, encarregada, dataVistoria, horaInicio, horaFim,
    notaVistoria, dataRetorno, consideracoesGerais
  },
  respostas: {
    [id]: { status: 'pending'|'sim'|'nao'|'na', reason, photo, obsExtra }
  },
  timer: Number,        // segundos desde início da vistoria
  historico: []         // carregado sob demanda do Sheets
}
```

BottomNav oculta durante vistoria ativa (tela VistoriaScreen com Pendente > 0).

---

## lib/sheets.js

```js
// POST — salvar vistoria (endpoint doPost já existe no Apps Script)
export async function salvarVistoria(dados) { ... }

// GET — buscar vistorias (requer doGet no Apps Script — código fornecido na Parte 2)
export async function buscarVistorias() { ... }
```

Firebase chamado em paralelo ao POST; falhas silenciosas (não bloqueiam UX).

---

## Parte 2.1: Histórico de visitas

- Lista de vistorias anteriores puxada via GET do Apps Script
- Filtro por UBS e por data
- Cada item: mini-resumo visual (badges Sim/Não/N/A + nota) + link para relatório completo
- Relatório completo: mesma RelatorioScreen populada com dados históricos

---

## Parte 2.2: Planejamento semanal

**Schema a validar antes de implementar.**

Proposta de estrutura para aba `Planejamento` na planilha:

| Coluna | Tipo | Descrição |
|---|---|---|
| `semana` | Date (ISO) | Data da segunda-feira da semana |
| `dia_semana` | Text | 'segunda'…'sexta' |
| `ubs` | Text | Nome da unidade |
| `encarregada` | Text | Nome da encarregada prevista |
| `status` | Text | 'planejado'|'realizado'|'cancelado' |
| `obs` | Text | Observação opcional |

Uma linha por visita planejada. Aba separada das vistorias.

**Parar aqui para validação do schema antes de implementar.**

---

## Parte 2.3: KPIs e métricas

Dados calculados do histórico:

- **Taxa de conformidade por UBS:** `(Sim / total_respostas) * 100` — bar chart simples
- **Evolução de não-conformidades:** linha do tempo por data — sparkline ou lista
- **Ranking de unidades com mais pendências recorrentes:** lista ordenada com badges

Visualizações: texto + barras CSS simples. Sem bibliotecas de gráficos — legível em tela pequena.

---

## Restrições

- Mobile-first estrito: toda decisão de UX considera tela de smartphone
- Não quebrar compartilhamento WhatsApp nem geração de PDF
- Antes de qualquer mudança de schema na planilha: parar e validar com o usuário
- Build validation após cada parte antes de prosseguir
- Firebase permanece mas não é dependência crítica
