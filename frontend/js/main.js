const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const state = {
  ativos: [],
  ativosById: new Map(),
  aportesById: new Map(),
  feedbackTimer: null,
};

// Elementos do DOM
const elFeedback = document.getElementById("feedback");
const elBtnRecarregar = document.getElementById("btn-recarregar");
const elKpiPatrimonio = document.getElementById("kpi-patrimonio");
const elKpiSubPatrimonio = document.getElementById("kpi-sub-patrimonio");
const elKpiAportado = document.getElementById("kpi-aportado");
const elKpiLucro = document.getElementById("kpi-lucro");
const elKpiRentabilidade = document.getElementById("kpi-rentabilidade");
const elKpiDivisao = document.getElementById("kpi-divisao");
const elKpiMaiorAlta = document.getElementById("kpi-maior-alta");
const elKpiMaiorQueda = document.getElementById("kpi-maior-queda");
const elTbodyRV = document.getElementById("tbody-rv");
const elTbodyRF = document.getElementById("tbody-rf");
const elTbodyAportes = document.getElementById("tbody-aportes");

// Form Novo Ativo
const elFormAtivo = document.getElementById("form-ativo");
const elAtivoCodigo = document.getElementById("ativo-codigo");
const elAtivoNome = document.getElementById("ativo-nome");
const elAtivoClasse = document.getElementById("ativo-classe");
const elCamposRF = document.getElementById("campos-rf");
const elAtivoIndexador = document.getElementById("ativo-indexador");
const elLabelAtivoTaxa = document.getElementById("label-ativo-taxa");
const elAtivoTaxa = document.getElementById("ativo-taxa");
const elAtivoValorInicial = document.getElementById("ativo-valor-inicial");

// Form Aporte
const elFormAporte = document.getElementById("form-aporte");
const elTituloFormAporte = document.getElementById("titulo-form-aporte");
const elBtnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
const elBtnSubmitAporte = document.getElementById("btn-submit-aporte");
const elAporteId = document.getElementById("aporte-id");
const elAporteAtivo = document.getElementById("aporte-ativo");
const elAporteTipo = document.getElementById("aporte-tipo");
const elAporteQtde = document.getElementById("aporte-quantidade");
const elHintQtdeRF = document.getElementById("hint-qtde-rf");
const elLabelAporteValor = document.getElementById("label-aporte-valor");
const elAporteValor = document.getElementById("aporte-valor");
const elAporteData = document.getElementById("aporte-data");

// Modal Saldo RF
const elModalRF = document.getElementById("modal-saldo-rf");
const elFormSaldoRF = document.getElementById("form-saldo-rf");
const elModalRFNome = document.getElementById("modal-rf-nome");
const elModalRFAtivoId = document.getElementById("modal-rf-ativo-id");
const elModalRFValor = document.getElementById("modal-rf-valor");
const elBtnFecharModal = document.getElementById("btn-fechar-modal");

// Utilitários de formatação
function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatPercent(value) {
  const num = Number(value) || 0;
  const prefix = num > 0 ? "+" : "";
  return `${prefix}${percentFormatter.format(num)}%`;
}

function formatDate(isoDate) {
  if (!isoDate) return "-";
  const [year, month, day] = String(isoDate).split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function formatTaxaRF(indexador, taxa) {
  const taxaFmt = numberFormatter.format(Number(taxa) || 0);
  if (indexador === "CDI" || indexador === "SELIC") {
    return `${taxaFmt}% ${indexador}`;
  }
  if (indexador === "IPCA") {
    return `IPCA + ${taxaFmt}%`;
  }
  return `${taxaFmt}% a.a. (Prefixado)`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showFeedback(message, type = "success") {
  clearTimeout(state.feedbackTimer);
  elFeedback.textContent = message;
  elFeedback.className = `feedback ${type}`;
  state.feedbackTimer = setTimeout(() => {
    elFeedback.classList.add("hidden");
  }, 4500);
}

// Renderizações
function renderResumo(resumo) {
  const patrimonio = Number(resumo?.patrimonio_total) || 0;
  const aportado = Number(resumo?.total_aportado) || 0;
  const lucro = Number(resumo?.lucro_prejuizo) || 0;
  const rentPct = Number(resumo?.rentabilidade_total_pct) || 0;
  const totalRV = Number(resumo?.total_rv) || 0;
  const totalRF = Number(resumo?.total_rf) || 0;
  const pctRV = Number(resumo?.pct_rv) || 0;
  const pctRF = Number(resumo?.pct_rf) || 0;

  elKpiPatrimonio.textContent = formatCurrency(patrimonio);
  elKpiSubPatrimonio.textContent = `RV ${formatCurrency(totalRV)} · RF ${formatCurrency(totalRF)}`;
  elKpiAportado.textContent = formatCurrency(aportado);

  const lucroClass = lucro > 0 ? "pos" : lucro < 0 ? "neg" : "neu";
  elKpiLucro.textContent = `${lucro > 0 ? "+" : ""}${formatCurrency(lucro)}`;
  elKpiLucro.className = `summary-value ${lucroClass}`;
  elKpiRentabilidade.textContent = formatPercent(rentPct);
  elKpiRentabilidade.className = `kpi-sub ${lucroClass}`;

  elKpiDivisao.textContent = `${numberFormatter.format(pctRV)}% RV · ${numberFormatter.format(pctRF)}% RF`;

  if (resumo?.maior_alta) {
    elKpiMaiorAlta.textContent = `▲ ${resumo.maior_alta.codigo} ${formatPercent(resumo.maior_alta.rentabilidade_pct)}`;
  } else {
    elKpiMaiorAlta.textContent = "—";
  }

  if (resumo?.maior_queda) {
    elKpiMaiorQueda.textContent = `▼ ${resumo.maior_queda.codigo} ${formatPercent(resumo.maior_queda.rentabilidade_pct)}`;
  } else {
    elKpiMaiorQueda.textContent = "—";
  }
}

function renderRendaVariavel(items) {
  if (!items.length) {
    elTbodyRV.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Nenhum ativo de renda variável em carteira.</td></tr>';
    return;
  }

  elTbodyRV.innerHTML = items
    .map((item) => {
      const rent = Number(item.rentabilidade_pct) || 0;
      const rentClass = rent > 0 ? "pos" : rent < 0 ? "neg" : "neu";
      return `
        <tr>
          <td>
            <span class="asset-code">${escapeHtml(item.codigo)}</span>
            <span class="asset-name">${escapeHtml(item.nome)} · ${escapeHtml(item.classe)}</span>
          </td>
          <td class="num">${formatNumber(item.quantidade_total)}</td>
          <td class="num">${formatCurrency(item.preco_medio)}</td>
          <td class="num">${formatCurrency(item.total_investido)}</td>
          <td class="num">${formatCurrency(item.preco_atual)}</td>
          <td class="num">${formatCurrency(item.total_atual)}</td>
          <td class="num ${rentClass}">${formatPercent(rent)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderRendaFixa(items) {
  if (!items.length) {
    elTbodyRF.innerHTML =
      '<tr><td colspan="6" class="empty-cell">Nenhum ativo de renda fixa cadastrado.</td></tr>';
    return;
  }

  elTbodyRF.innerHTML = items
    .map((item) => {
      const label = `${item.codigo} — ${item.nome}`;
      const rent = Number(item.rentabilidade_pct) || 0;
      const rentClass = rent > 0 ? "pos" : rent < 0 ? "neg" : "neu";
      const origemBadge = item.calculado_auto
        ? '<span class="asset-name">Automático (BCB)</span>'
        : '<span class="asset-name">Manual</span>';

      return `
        <tr>
          <td>
            <span class="asset-code">${escapeHtml(item.codigo)}</span>
            <span class="asset-name">${escapeHtml(item.nome)}</span>
          </td>
          <td>${escapeHtml(formatTaxaRF(item.indexador, item.taxa_percentual))}</td>
          <td class="num">${formatCurrency(item.total_investido)}</td>
          <td class="num">
            ${formatCurrency(item.valor_atual)}
            ${origemBadge}
          </td>
          <td class="num ${rentClass}">${formatPercent(rent)}</td>
          <td class="actions-col">
            <button
              type="button"
              class="btn btn-secondary btn-sm btn-atualizar-rf"
              data-ativo-id="${item.ativo_id}"
              data-label="${escapeHtml(label)}"
              data-valor="${Number(item.valor_atual) || 0}"
            >
              Atualizar Saldo
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAportes(items) {
  state.aportesById.clear();

  if (!items.length) {
    elTbodyAportes.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Nenhum aporte registrado ainda.</td></tr>';
    return;
  }

  elTbodyAportes.innerHTML = items
    .map((item) => {
      state.aportesById.set(Number(item.id), item);
      const codigo = item.ativos?.codigo || `#${item.ativo_id}`;
      const nome = item.ativos?.nome || "";
      const total = (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0);
      const pillClass = item.tipo === "RESGATE" ? "pill-resgate" : "pill-aporte";

      return `
        <tr>
          <td>${escapeHtml(formatDate(item.data_aporte))}</td>
          <td>
            <span class="asset-code">${escapeHtml(codigo)}</span>
            ${nome ? `<span class="asset-name">${escapeHtml(nome)}</span>` : ""}
          </td>
          <td><span class="pill ${pillClass}">${escapeHtml(item.tipo)}</span></td>
          <td class="num">${formatNumber(item.quantidade)}</td>
          <td class="num">${formatCurrency(item.valor_unitario)}</td>
          <td class="num">${formatCurrency(total)}</td>
          <td class="actions-col">
            <div class="row-actions">
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-editar-aporte"
                data-id="${item.id}"
              >
                Editar
              </button>
              <button
                type="button"
                class="btn btn-danger-ghost btn-sm btn-excluir-aporte"
                data-id="${item.id}"
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSelectAtivos(ativos) {
  state.ativos = ativos;
  state.ativosById.clear();
  ativos.forEach((ativo) => state.ativosById.set(Number(ativo.id), ativo));

  const valorAtual = elAporteAtivo.value;
  const options = [
    '<option value="">Selecione um ativo...</option>',
    ...ativos.map(
      (ativo) =>
        `<option value="${ativo.id}">${escapeHtml(ativo.codigo)} — ${escapeHtml(ativo.nome)} (${escapeHtml(ativo.classe)})</option>`
    ),
  ];

  elAporteAtivo.innerHTML = options.join("");
  if (valorAtual && state.ativosById.has(Number(valorAtual))) {
    elAporteAtivo.value = valorAtual;
  }
  atualizarRegraQuantidadeRF();
}

// Regras de UI dos formulários
function atualizarCamposRendaFixa() {
  const isRF = elAtivoClasse.value === "RENDA_FIXA";
  elCamposRF.classList.toggle("hidden", !isRF);
  elAtivoIndexador.required = isRF;
  elAtivoTaxa.required = isRF;
  atualizarLabelTaxaRF();
}

function atualizarLabelTaxaRF() {
  const indexador = elAtivoIndexador.value;
  if (indexador === "CDI") {
    elLabelAtivoTaxa.textContent = "Percentual do CDI (%)";
    elAtivoTaxa.placeholder = "Ex: 100 ou 120 (120% CDI)";
  } else if (indexador === "SELIC") {
    elLabelAtivoTaxa.textContent = "Percentual da SELIC (%)";
    elAtivoTaxa.placeholder = "Ex: 100 (100% SELIC)";
  } else if (indexador === "IPCA") {
    elLabelAtivoTaxa.textContent = "Taxa fixa + IPCA (% a.a.)";
    elAtivoTaxa.placeholder = "Ex: 6.5 (IPCA + 6,5% a.a.)";
  } else {
    elLabelAtivoTaxa.textContent = "Taxa Prefixada (% a.a.)";
    elAtivoTaxa.placeholder = "Ex: 12.5 (12,5% a.a.)";
  }
}

function atualizarRegraQuantidadeRF() {
  const ativo = state.ativosById.get(Number(elAporteAtivo.value));
  const isRF = ativo?.classe === "RENDA_FIXA";

  if (isRF) {
    elAporteQtde.value = "1";
    elAporteQtde.readOnly = true;
    elHintQtdeRF.classList.remove("hidden");
    elLabelAporteValor.textContent = "Valor do Aporte (R$)";
  } else {
    elAporteQtde.readOnly = false;
    elHintQtdeRF.classList.add("hidden");
    elLabelAporteValor.textContent = "Valor Unitário (R$)";
  }
}

function sairModoEdicaoAporte() {
  elAporteId.value = "";
  elFormAporte.reset();
  elTituloFormAporte.textContent = "Registrar Aporte";
  elBtnSubmitAporte.textContent = "Salvar Aporte";
  elBtnCancelarEdicao.classList.add("hidden");
  atualizarRegraQuantidadeRF();
}

function entrarModoEdicaoAporte(aporte) {
  elAporteId.value = String(aporte.id);
  elAporteAtivo.value = String(aporte.ativo_id);
  elAporteTipo.value = aporte.tipo;
  elAporteQtde.value = String(aporte.quantidade);
  elAporteValor.value = String(aporte.valor_unitario);
  elAporteData.value = aporte.data_aporte || "";

  elTituloFormAporte.textContent = `Editando Aporte #${aporte.id}`;
  elBtnSubmitAporte.textContent = "Atualizar Aporte";
  elBtnCancelarEdicao.classList.remove("hidden");
  atualizarRegraQuantidadeRF();

  elFormAporte.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Carregamento de dados
async function carregarDados() {
  elBtnRecarregar.disabled = true;
  try {
    const [ativos, carteira] = await Promise.all([
      window.API.getAtivos(),
      window.API.getCarteira(),
    ]);
    renderSelectAtivos(ativos);
    renderResumo(carteira.resumo);
    renderRendaVariavel(carteira.renda_variavel);
    renderRendaFixa(carteira.renda_fixa);
    renderAportes(carteira.aportes);
  } catch (err) {
    showFeedback(err.message, "error");
  } finally {
    elBtnRecarregar.disabled = false;
  }
}

// Eventos
elBtnRecarregar.addEventListener("click", carregarDados);
elAtivoClasse.addEventListener("change", atualizarCamposRendaFixa);
elAtivoIndexador.addEventListener("change", atualizarLabelTaxaRF);
elAporteAtivo.addEventListener("change", atualizarRegraQuantidadeRF);
elBtnCancelarEdicao.addEventListener("click", sairModoEdicaoAporte);

elFormAtivo.addEventListener("submit", async (event) => {
  event.preventDefault();

  const classe = elAtivoClasse.value;
  const payload = {
    codigo: elAtivoCodigo.value.trim(),
    nome: elAtivoNome.value.trim(),
    classe,
  };

  if (classe === "RENDA_FIXA") {
    payload.indexador = elAtivoIndexador.value;
    payload.taxa_percentual = Number(elAtivoTaxa.value);
    payload.valor_atual = Number(elAtivoValorInicial.value) || 0;
  }

  try {
    const criado = await window.API.criarAtivo(payload);
    elFormAtivo.reset();
    atualizarCamposRendaFixa();
    showFeedback(`Ativo ${criado.codigo} cadastrado com sucesso.`);
    await carregarDados();
  } catch (err) {
    showFeedback(err.message, "error");
  }
});

elFormAporte.addEventListener("submit", async (event) => {
  event.preventDefault();

  const aporteId = elAporteId.value;
  const payload = {
    ativo_id: Number(elAporteAtivo.value),
    tipo: elAporteTipo.value,
    quantidade: Number(elAporteQtde.value),
    valor_unitario: Number(elAporteValor.value),
  };

  if (elAporteData.value) {
    payload.data_aporte = elAporteData.value;
  }

  try {
    if (aporteId) {
      await window.API.atualizarAporte(Number(aporteId), payload);
      showFeedback(`Aporte #${aporteId} atualizado com sucesso.`);
    } else {
      await window.API.criarAporte(payload);
      showFeedback("Aporte registrado com sucesso.");
    }
    sairModoEdicaoAporte();
    await carregarDados();
  } catch (err) {
    showFeedback(err.message, "error");
  }
});

// Delegação de eventos: botão "Atualizar Saldo" na tabela de Renda Fixa
elTbodyRF.addEventListener("click", (event) => {
  const btn = event.target.closest(".btn-atualizar-rf");
  if (!btn) return;

  elModalRFAtivoId.value = btn.dataset.ativoId;
  elModalRFNome.textContent = btn.dataset.label;
  elModalRFValor.value = btn.dataset.valor;
  elModalRF.showModal();
  elModalRFValor.focus();
  elModalRFValor.select();
});

elBtnFecharModal.addEventListener("click", () => {
  elModalRF.close();
});

elFormSaldoRF.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ativoId = Number(elModalRFAtivoId.value);
  const valorAtual = Number(elModalRFValor.value);

  try {
    await window.API.atualizarSaldoRF(ativoId, valorAtual);
    elModalRF.close();
    showFeedback("Saldo de Renda Fixa atualizado com sucesso.");
    await carregarDados();
  } catch (err) {
    showFeedback(err.message, "error");
  }
});

// Delegação de eventos: Editar / Excluir na tabela de Aportes
elTbodyAportes.addEventListener("click", async (event) => {
  const btnEditar = event.target.closest(".btn-editar-aporte");
  if (btnEditar) {
    const aporte = state.aportesById.get(Number(btnEditar.dataset.id));
    if (aporte) {
      entrarModoEdicaoAporte(aporte);
    }
    return;
  }

  const btnExcluir = event.target.closest(".btn-excluir-aporte");
  if (btnExcluir) {
    const id = Number(btnExcluir.dataset.id);
    if (!window.confirm(`Deseja realmente excluir o aporte #${id}?`)) {
      return;
    }

    try {
      await window.API.deletarAporte(id);
      if (Number(elAporteId.value) === id) {
        sairModoEdicaoAporte();
      }
      showFeedback(`Aporte #${id} excluído com sucesso.`);
      await carregarDados();
    } catch (err) {
      showFeedback(err.message, "error");
    }
  }
});

// Inicialização
atualizarCamposRendaFixa();
carregarDados();
