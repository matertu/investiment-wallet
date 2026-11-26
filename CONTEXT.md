# Contexto do Projeto — Carteira de Investimentos

Documento de referência rápida sobre arquitetura, infraestrutura de deploy e decisões técnicas do projeto.

---

## 1. Infraestrutura e Deploy (Produção)

- **Repositório:** `git@github.com:matertu/carteira-investimentos.git` (branch `main`)
- **CI/CD:** Deploy automático nativo da **Vercel** a cada `git push`.
- **Front-end (Vercel — Projeto 1):**
  - **Root Directory:** `frontend`
  - **Stack:** HTML5, CSS3 e JavaScript puro (sem framework/build) + Chart.js via CDN.
- **Back-end (Vercel — Projeto 2):**
  - **Root Directory:** `backend`
  - **URL de produção:** `https://carteira-investimentos-api-sigma.vercel.app`
  - **Runtime:** Python / FastAPI nativo da Vercel detectando `app/main.py` (**sem `backend/vercel.json`** — rewrites manuais quebram o roteamento nativo de `/docs` e endpoints).
  - **Variáveis de ambiente (Vercel + `.env` local):** `SUPABASE_URL`, `SUPABASE_KEY`, `BRAPI_TOKEN`.
- **Banco de Dados (Supabase):**
  - PostgreSQL gerenciado na nuvem (acessado via SDK `supabase` no back-end).

---

## 2. Arquitetura do Back-end (`backend/app/`)

Arquitetura em camadas estritas (sem `HTTPException` nos `repositories/` ou `services/`):

- **`core/`**
  - `config.py`: carrega `SUPABASE_URL`, `SUPABASE_KEY`, `BRAPI_TOKEN` (do `.env` na raiz localmente ou das env vars da Vercel em produção).
  - `database.py`: inicializa e expõe o cliente `supabase`.
  - `enums.py`: `ClasseAtivo` (`ACAO`, `FII`, `ETF`, `RENDA_FIXA`), `IndexadorRF` (`CDI`, `SELIC`, `IPCA`, `PREFIXADO`), `TipoOperacao` (`APORTE`, `RESGATE`).
- **`clients/`**
  - `brapi_client.py`: consulta cotações de Renda Variável (`regularMarketPrice`) na `brapi.dev` com timeout de 5s e fallback `0.0`.
  - `bcb_client.py`: consulta séries oficiais do Banco Central (SGS) sem token e com cache em memória de 1h — `CDI` (série 12), `SELIC` (série 11), `IPCA` (série 433) e cálculo composto `PREFIXADO`.
- **`repositories/`**
  - `ativo_repository.py`: queries puras em `ativos` e `detalhes_renda_fixa`.
  - `aporte_repository.py`: queries puras em `aportes`, `vw_renda_variavel` e `vw_renda_fixa`.
- **`schemas/`** (Pydantic v2)
  - `ativo.py`: `NovoAtivoInput`, `AtualizaSaldoRFInput`, `AtivoOutput`.
  - `aporte.py`: `AporteInput`, `AporteOutput`.
  - `carteira.py`: `CarteiraResponse` (`resumo`, `renda_variavel`, `renda_fixa`, `aportes`).
- **`services/`**
  - `ativo_service.py`: normaliza `codigo` (`strip().upper()`), exige `indexador` e `taxa_percentual` para `RENDA_FIXA`, valida duplicidade (`ConflitoError`), atualiza saldo manual de RF.
  - `aporte_service.py`: força `quantidade = 1.0` automaticamente para ativos de `RENDA_FIXA`; CRUD de aportes.
  - `carteira_service.py`: consolida `vw_renda_variavel` (+ brapi), `vw_renda_fixa` (+ cálculo automático BCB com fallback para saldo manual), histórico de aportes e `resumo` (KPIs, alocação por classe, aportes por mês, comparativo CDI).
- **`routers/` & `main.py`**
  - `GET /carteira`
  - `GET /ativos`, `POST /ativos` (`201`), `PATCH /renda-fixa/{ativo_id}`
  - `POST /aportes` (`201`), `PUT /aportes/{aporte_id}`, `DELETE /aportes/{aporte_id}` (`204`)
  - Tradução de exceções: `ConflitoError`/PG `23505` → `409`, `ValueError` → `400`, `LookupError` → `404`.

---

## 3. Banco de Dados (Supabase)

- **ENUMs:** `classe_ativo`, `indexador_rf`, `tipo_operacao`
- **Tabelas:**
  - `ativos` (`id`, `codigo UNIQUE`, `nome`, `classe`, `created_at`)
  - `detalhes_renda_fixa` (`ativo_id PK/FK`, `indexador`, `taxa_percentual`, `valor_atual`, `updated_at`)
  - `aportes` (`id`, `ativo_id FK`, `tipo`, `quantidade`, `valor_unitario`, `data_aporte`, `created_at`)
- **Views:** `vw_renda_variavel`, `vw_renda_fixa`

---

## 4. Front-end (`frontend/`)

- **`index.html` + `js/main.js`:** linha única de 5 KPIs no topo, tabela de Renda Variável (com Valor Aportado), tabela de Renda Fixa (com indicador Automático BCB / Manual e modal de atualização de saldo), cadastro de ativo, cadastro/edição de aportes e histórico.
- **`dashboard.html` + `js/dashboard.js`:** mesmos 5 KPIs + 5 gráficos Chart.js (Alocação por Classe, Peso por Ativo %, Aportado vs Valor Atual, Aportes por Mês, Carteira vs CDI).
- **`js/api.js`:** cliente `fetch()` que aponta automaticamente para `http://127.0.0.1:8000` localmente e para `https://carteira-investimentos-api-sigma.vercel.app` em produção.
- **`js/theme.js` + `css/style.css`:** modo claro/escuro persistido em `localStorage`, layout responsivo para mobile e atualização dinâmica dos temas dos gráficos.

---

## 5. Evoluções Planejadas

- **Snapshot de evolução patrimonial (sem GitHub Actions):**
  - Coleta **intraday** a cada 10 min durante o pregão (`10h–18h` BRT, seg–sex) sem retenção de longo prazo (limpa registros de dias anteriores).
  - Coleta **diária** no fechamento (`19h` BRT) com retenção permanente em `historico_patrimonio`.
  - Agendamento externo gratuito compatível com Vercel (ex: `cron-job.org` ou `pg_cron` no Supabase).
- **Segurança (futuro):** adicionar autenticação simples para proteger a URL pública da Vercel.
- **Estudo Cloud/K8s (futuro):** Dockerfiles (FastAPI + Nginx) e manifestos `k8s/` para laboratório local (`kind`/`k3d`).
