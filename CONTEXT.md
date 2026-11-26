# Contexto do Projeto — Acinonyx (Carteira de Investimentos)

Documento de referência rápida sobre arquitetura, infraestrutura de deploy, design system e decisões técnicas do projeto **Acinonyx**.

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

### Estrutura e Páginas (3 telas + PWA)
- **`index.html` + `js/main.js`:** tela de acompanhamento rápido com Hero Card de Patrimônio (com barra visual RV/RF) + 3 KPIs nítidos, tabela de Renda Variável (com linha de totais com acento Navy, badge navy no ticker, Valor Aportado, `Rentab. R$` e pílulas `▲`/`▼` em `Rentab. %`), tabela de Renda Fixa (com linha de totais com acento Oliva, indicador Automático BCB / Manual e modal de atualização de saldo).
- **`aportes.html` + `js/aportes.js`:** tela de operações com formulário **Registrar / Editar Aporte** no topo (ocultando `quantidade` e renomeando para "Valor do Aporte" quando o ativo for `RENDA_FIXA`), bloco recolhível **+ Cadastrar Novo Ativo** e **Histórico de Aportes** com filtros por ativo/operação e ações Editar/Excluir.
- **`dashboard.html` + `js/dashboard.js`:** mesmos KPIs + 5 gráficos Chart.js (Alocação por Classe, Peso por Ativo %, Aportado vs Valor Atual, Aportes por Mês, Carteira vs CDI) usando a paleta Acinonyx.
- **`js/api.js`:** cliente `fetch()` que aponta automaticamente para `http://127.0.0.1:8000` localmente e para `https://carteira-investimentos-api-sigma.vercel.app` em produção.
- **`js/utils.js`:** utilitários compartilhados (formatadores `pt-BR`, `escapeHtml`, `showFeedback` toast, `renderKPIs` + barra RV/RF, `renderSkeletonRows`).
- **`js/theme.js` + `css/style.css`:** modo claro/escuro (**Midnight Acinonyx**) persistido em `localStorage`, modo privacidade (`👁️` borrando valores monetários `.money-val` mantendo percentuais visíveis), transições suaves entre páginas e registro do Service Worker PWA (`sw.js`, `manifest.json`).

### Requisitos de UI/UX (Design System Acinonyx — Precision Fintech)
- **Marca e Assets:** Logo `frontend/icons/icon-192.png` (guepardo verde-oliva sobre barras azul-marinho) exibida no header à esquerda com **Acinonyx** (fundo `#FFFFFF` arredondado) e usada como favicon e ícone PWA (`192x192` e `512x512`).
- **Paleta (CSS Variables):**
  - Primária (Navy): `#1E3250` / Hero `#132238 → #1E3250` (Hero Card de Patrimônio, cabeçalhos, badges de tickers, botões outline navy, acento RV, séries principais dos gráficos).
  - Destaque (Oliva): `#9DA347` no claro / `#C6CE5C` no escuro (CTA principal `+ Novo Aporte`, barra de composição RF, acento RF, foco de inputs, séries secundárias).
  - Neutros (Modo Claro): fundo `#F4F6FA`, superfícies `#FFFFFF`, bordas `#DCE3EE`, texto principal de alto contraste `#0B1220`, secundário `#334155`, rótulos `#5B6B82`.
  - Neutros (Modo Escuro — **Midnight Acinonyx**): fundo `#080E18`, superfícies `#101B2E`, bordas `#223452`, texto/valores `#FFFFFF`, rótulos `#8FA3BF`.
  - Semânticas: `#15803D` / `#DC2626` (claro) e `#34D399` / `#FB7185` (escuro), exibidas em pílulas com setas `▲`/`▼`.
- **Tipografia e Geometria:** Dupla tipográfica **`Plus Jakarta Sans`** (interface, títulos e marca) + **`JetBrains Mono`** (valores monetários, percentuais e tickers com `tabular-nums`); `border-radius: 12px` em cards/modais e `8px` em botões/inputs.
- **Mobile & PWA:** Navegação inferior fixa (*bottom nav*) em `≤ 640px`, primeira coluna do ticker fixa (`position: sticky`) nas tabelas largas, skeleton shimmer no carregamento e notificações *toast* flutuantes.

---

## 5. Evoluções Planejadas

- **Snapshot de evolução patrimonial (sem GitHub Actions):**
  - Coleta **intraday** a cada 10 min durante o pregão (`10h–18h` BRT, seg–sex) sem retenção de longo prazo (limpa registros de dias anteriores).
  - Coleta **diária** no fechamento (`19h` BRT) com retenção permanente em `historico_patrimonio`.
  - Agendamento externo gratuito compatível com Vercel (ex: `cron-job.org` ou `pg_cron` no Supabase).
- **Segurança (futuro):** adicionar autenticação simples para proteger a URL pública da Vercel.
- **Estudo Cloud/K8s (futuro):** Dockerfiles (FastAPI + Nginx) e manifestos `k8s/` para laboratório local (`kind`/`k3d`).
