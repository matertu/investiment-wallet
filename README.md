# Carteira MVP

Aplicação minimalista para acompanhamento de carteira de investimentos (Renda Variável + Renda Fixa) e gestão de aportes, utilizando PostgreSQL (Supabase), Back-end em Python (FastAPI em camadas) e Front-end estático (HTML/CSS/JS).

## Estrutura
- `database/`: Scripts SQL normalizados (ENUMs, tabelas, views e seed inicial).
- `backend/`: API REST em Python estruturada em camadas (`core`, `schemas`, `routers`, `services`, `repositories`, `clients`).
- `frontend/`: Interface estática consumindo a API local.

## Como rodar

### 1. Banco de Dados (Supabase)
Execute os scripts no SQL Editor do Supabase nesta ordem:
1. `database/schema.sql`
2. `database/seed.sql` (opcional, para dados de teste)

### 2. Back-end
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
