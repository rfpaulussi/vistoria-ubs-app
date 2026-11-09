# Vistoria UBS - App de Campo

Aplicativo móvel para vistoria de Unidades Básicas de Saúde (UBS) com captura de fotos, registro de conformidades e geração de relatórios técnicos compartilháveis via WhatsApp.

## Funcionalidades

- Formulário de vistoria com critérios de conformidade
- Captura de fotos para evidências
- Justificativas para não-conformidades
- Relatório técnico visual
- Compartilhamento via WhatsApp
- Dashboard com histórico
- Persistência via Google Sheets API

## Configuração

Crie `cliente/.env` com as variáveis:

```
VITE_GOOGLE_SHEETS_API_KEY=sua_chave_aqui
VITE_SHEET_ID=seu_sheet_id_aqui
```

## Uso

```bash
cd cliente
npm install
npm run dev
```

## Deploy

Deployado no Vercel. Configure as variáveis de ambiente no painel do Vercel antes do deploy.
