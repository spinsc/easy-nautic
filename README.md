# Easy Nautic

Marketplace de serviços náuticos — conecta proprietários de embarcações a marinheiros, técnicos, estaleiros e demais prestadores, com a plataforma mediando cotação, pagamento e liberação.

Produto novo e separado do `nautic-crm` (CRM interno). Ver especificação completa (atores, módulo de garantia, modelo de dados, fases de entrega) no documento de referência do projeto.

## Stack

React + Vite + TypeScript + Tailwind CSS + Supabase.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencher VITE_SUPABASE_ANON_KEY
npm run dev
```

## Deploy

Push para `master` dispara o deploy automático pro GitHub Pages via GitHub Actions.
