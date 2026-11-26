const {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatTaxaRF,
  escapeHtml,
  showFeedback,
  renderKPIs,
} = window.Utils;

const elBtnRecarregar = document.getElementById("btn-recarregar");
const elTbodyRV = document.getElementById("tbody-rv");
const elTbodyRF = document.getElementById("tbody-rf");
const elRvTotalAportado = document.getElementById("rv-total-aportado");
const elRvTotalAtual = document.getElementById("rv-total-atual");
const elRvTotalRentRs = document.getElementById("rv-total-rent-rs");
const elRvTotalRentPct = document.getElementById("rv-total-rent-pct");

// Modal Saldo RF
const elModalRF = document.getElementById("modal-saldo-rf");
const elFormSaldoRF = document.getElementById("form-saldo-rf");
const elModalRFNome = document.getElementById("modal-rf-nome");
const elModalRFAtivoId = document.getElementById("modal-rf-ativo-id");
const elModalRFValor = document.getElementById("modal-rf-valor");
const elBtnFecharModal = document.getElementById("btn-fechar-modal");

function renderTotaisRV(items) {
  const totalAportado = items.reduce(
    (acc, item) => acc + (Number(item.total_investido) || 0),
    0
  );
  const totalAtual = items.reduce(
    (acc, item) => acc + (Number(item.total_atual) || 0),
    0
  );
  const rentRs = totalAtual - totalAportado;
  const rentPct = totalAportado > 0 ? (rentRs / totalAportado) * 100 : 0;
  const rentClass = rentRs > 0 ? "pos" : rentRs < 0 ? "neg" : "neu";

  elRvTotalAportado.textContent = formatCurrency(totalAportado);
  elRvTotalAtual.textContent = formatCurrency(totalAtual);
  elRvTotalRentRs.textContent = `${rentRs > 0 ? "+" : ""}${formatCurrency(rentRs)}`;
  elRvTotalRentRs.className = `section-total-value ${rentClass}`;
  elRvTotalRentPct.textContent = formatPercent(rentPct);
  elRvTotalRentPct.className = `section-total-value ${rentClass}`;
}

function renderRendaVariavel(items) {
  renderTotaisRV(items);

  if (!items.length) {
    elTbodyRV.innerHTML =
      '<tr><td colspan="8" class="empty-cell">Nenhum ativo de renda variável em carteira.</td></tr>';
    return;
  }

  elTbodyRV.innerHTML = items
    .map((item) => {
      const totalInvestido = Number(item.total_investido) || 0;
      const totalAtual = Number(item.total_atual) || 0;
      const rentRs = totalAtual - totalInvestido;
      const rent = Number(item.rentabilidade_pct) || 0;
      const rentClass = rentRs > 0 ? "pos" : rentRs < 0 ? "neg" : "neu";
      const rentRsFmt = `${rentRs > 0 ? "+" : ""}${formatCurrency(rentRs)}`;

      return `
        <tr>
          <td>
            <span class="ticker-badge">${escapeHtml(item.codigo)}</span>
            <span class="asset-name">${escapeHtml(item.nome)} · ${escapeHtml(item.classe)}</span>
          </td>
          <td class="num">${formatNumber(item.quantidade_total)}</td>
          <td class="num">${formatCurrency(item.preco_medio)}</td>
          <td class="num">${formatCurrency(totalInvestido)}</td>
          <td class="num">${formatCurrency(item.preco_atual)}</td>
          <td class="num">${formatCurrency(totalAtual)}</td>
          <td class="num ${rentClass}">${rentRsFmt}</td>
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
              class="btn btn-outline-navy btn-sm btn-atualizar-rf"
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

async function carregarCarteira() {
  elBtnRecarregar.disabled = true;
  try {
    const carteira = await window.API.getCarteira();
    renderKPIs(carteira.resumo);
    renderRendaVariavel(carteira.renda_variavel || []);
    renderRendaFixa(carteira.renda_fixa || []);
  } catch (err) {
    showFeedback(err.message, "error");
  } finally {
    elBtnRecarregar.disabled = false;
  }
}

elBtnRecarregar.addEventListener("click", carregarCarteira);

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
    await carregarCarteira();
  } catch (err) {
    showFeedback(err.message, "error");
  }
});

carregarCarteira();
