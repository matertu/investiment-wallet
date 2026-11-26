const {
  formatCurrency,
  formatNumber,
  formatDate,
  escapeHtml,
  showFeedback,
} = window.Utils;

const state = {
  ativos: [],
  ativosById: new Map(),
  aportes: [],
  aportesById: new Map(),
};

const elBtnRecarregar = document.getElementById("btn-recarregar-aportes");
const elTbodyAportes = document.getElementById("tbody-aportes");
const elFiltroAtivo = document.getElementById("filtro-ativo");
const elFiltroTipo = document.getElementById("filtro-tipo");

// Form Novo Ativo
const elDetalhesNovoAtivo = document.getElementById("detalhes-novo-ativo");
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
const elFieldAporteQtde = document.getElementById("field-aporte-quantidade");
const elAporteQtde = document.getElementById("aporte-quantidade");
const elLabelAporteValor = document.getElementById("label-aporte-valor");
const elAporteValor = document.getElementById("aporte-valor");
const elAporteData = document.getElementById("aporte-data");

function renderSelectAtivos(ativos) {
  state.ativos = ativos;
  state.ativosById.clear();
  ativos.forEach((ativo) => state.ativosById.set(Number(ativo.id), ativo));

  const ativoSelecionado = elAporteAtivo.value;
  const filtroSelecionado = elFiltroAtivo.value;

  const options = ativos.map(
    (ativo) =>
      `<option value="${ativo.id}">${escapeHtml(ativo.codigo)} — ${escapeHtml(ativo.nome)} (${escapeHtml(ativo.classe)})</option>`
  );

  elAporteAtivo.innerHTML = [
    '<option value="">Selecione um ativo...</option>',
    ...options,
  ].join("");

  elFiltroAtivo.innerHTML = [
    '<option value="">Todos os ativos</option>',
    ...ativos.map(
      (ativo) =>
        `<option value="${ativo.id}">${escapeHtml(ativo.codigo)} — ${escapeHtml(ativo.nome)}</option>`
    ),
  ].join("");

  if (ativoSelecionado && state.ativosById.has(Number(ativoSelecionado))) {
    elAporteAtivo.value = ativoSelecionado;
  }
  if (filtroSelecionado && state.ativosById.has(Number(filtroSelecionado))) {
    elFiltroAtivo.value = filtroSelecionado;
  }

  atualizarRegraQuantidadeRF();
}

function renderAportes() {
  const filtroAtivoId = elFiltroAtivo.value ? Number(elFiltroAtivo.value) : null;
  const filtroTipo = elFiltroTipo.value || null;

  const filtrados = state.aportes.filter((item) => {
    if (filtroAtivoId && Number(item.ativo_id) !== filtroAtivoId) return false;
    if (filtroTipo && item.tipo !== filtroTipo) return false;
    return true;
  });

  if (!filtrados.length) {
    elTbodyAportes.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Nenhum aporte encontrado.</td></tr>';
    return;
  }

  elTbodyAportes.innerHTML = filtrados
    .map((item) => {
      const codigo = item.ativos?.codigo || `#${item.ativo_id}`;
      const nome = item.ativos?.nome || "";
      const total =
        (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0);
      const pillClass = item.tipo === "RESGATE" ? "pill-resgate" : "pill-aporte";

      return `
        <tr>
          <td>${escapeHtml(formatDate(item.data_aporte))}</td>
          <td>
            <span class="ticker-badge">${escapeHtml(codigo)}</span>
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

function atualizarCamposRendaFixa() {
  const isRF = elAtivoClasse.value === "RENDA_FIXA";
  elCamposRF.classList.toggle("hidden", !isRF);
  elAtivoIndexador.required = isRF;
  elAtivoTaxa.required = isRF;
  atualizarLabelTaxaRF();
}

function atualizarRegraQuantidadeRF() {
  const ativo = state.ativosById.get(Number(elAporteAtivo.value));
  const isRF = ativo?.classe === "RENDA_FIXA";

  if (isRF) {
    elAporteQtde.value = "1";
    elFieldAporteQtde.classList.add("hidden");
    elLabelAporteValor.textContent = "Valor do Aporte (R$)";
  } else {
    elFieldAporteQtde.classList.remove("hidden");
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

async function carregarDados() {
  elBtnRecarregar.disabled = true;
  try {
    const [ativos, carteira] = await Promise.all([
      window.API.getAtivos(),
      window.API.getCarteira(),
    ]);
    renderSelectAtivos(ativos);
    state.aportes = carteira.aportes || [];
    state.aportesById.clear();
    state.aportes.forEach((item) => state.aportesById.set(Number(item.id), item));
    renderAportes();
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
elFiltroAtivo.addEventListener("change", renderAportes);
elFiltroTipo.addEventListener("change", renderAportes);

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
    elDetalhesNovoAtivo.open = false;
    showFeedback(`Ativo ${criado.codigo} cadastrado com sucesso.`);
    await carregarDados();
    elAporteAtivo.value = String(criado.id);
    atualizarRegraQuantidadeRF();
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

atualizarCamposRendaFixa();
if (window.location.hash === "#novo-ativo") {
  elDetalhesNovoAtivo.open = true;
  elAtivoCodigo.focus();
}
carregarDados();
