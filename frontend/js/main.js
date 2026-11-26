const {
  formatCurrency,
  formatSignedCurrency,
  formatNumber,
  formatRentPillHtml,
  applyRentPillElement,
  formatTaxaRF,
  escapeHtml,
  renderSkeletonRows,
  showFeedback,
  renderKPIs,
} = window.Utils;

const elBtnRecarregar = document.getElementById("btn-recarregar");
const elTbodyRV = document.getElementById("tbody-rv");
const elTbodyRF = document.getElementById("tbody-rf");

// Totais RV
const elRvTotalAportado = document.getElementById("rv-total-aportado");
const elRvTotalAtual = document.getElementById("rv-total-atual");
const elRvTotalRentRs = document.getElementById("rv-total-rent-rs");
const elRvTotalRentPct = document.getElementById("rv-total-rent-pct");

// Totais RF
const elRfTotalAportado = document.getElementById("rf-total-aportado");
const elRfTotalAtual = document.getElementById("rf-total-atual");
const elRfTotalRentRs = document.getElementById("rf-total-rent-rs");
const elRfTotalRentPct = document.getElementById("rf-total-rent-pct");

// Modal Saldo RF
const elModalRF = document.getElementById("modal-saldo-rf");
const elFormSaldoRF = document.getElementById("form-saldo-rf");
const elModalRFNome = document.getElementById("modal-rf-nome");
const elModalRFAtivoId = document.getElementById("modal-rf-ativo-id");
const elModalRFValor = document.getElementById("modal-rf-valor");
const elBtnFecharModal = document.getElementById("btn-fechar-modal");

function renderTotaisBloco(items, getAtual, els) {
  const totalAportado = items.reduce(
    (acc, item) => acc + (Number(item.total_investido) || 0),
    0
  );
  const totalAtual = items.reduce((acc, item) => acc + (Number(getAtual(item)) || 0), 0);
  const rentRs = totalAtual - totalAportado;
  const rentPct = totalAportado > 0 ? (rentRs / totalAportado) * 100 : 0;
  const rentClass = rentRs > 0 ? "pos" : rentRs < 0 ? "neg" : "neu";

  els.aportado.textContent = formatCurrency(totalAportado);
  els.atual.textContent = formatCurrency(totalAtual);
  els.rentRs.textContent = formatSignedCurrency(rentRs);
  els.rentRs.className = `section-total-value money-val ${rentClass}`;
  applyRentPillElement(els.rentPct, rentPct);
}

function renderRendaVariavel(items) {
  renderTotaisBloco(items, (i) => i.total_atual, {
    aportado: elRvTotalAportado,
    atual: elRvTotalAtual,
    rentRs: elRvTotalRentRs,
    rentPct: elRvTotalRentPct,
  });

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

      return `
        <tr>
          <td>
            <span class="ticker-badge">${escapeHtml(item.codigo)}</span>
            <span class="asset-name">${escapeHtml(item.nome)} · ${escapeHtml(item.classe)}</span>
          </td>
          <td class="num">${formatNumber(item.quantidade_total)}</td>
          <td class="num money-val">${formatCurrency(item.preco_medio)}</td>
          <td class="num money-val">${formatCurrency(totalInvestido)}</td>
          <td class="num money-val">${formatCurrency(item.preco_atual)}</td>
          <td class="num num-strong money-val">${formatCurrency(totalAtual)}</td>
          <td class="num money-val ${rentClass}">${formatSignedCurrency(rentRs)}</td>
          <td class="num">${formatRentPillHtml(rent)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderRendaFixa(items) {
  renderTotaisBloco(items, (i) => i.valor_atual, {
    aportado: elRfTotalAportado,
    atual: elRfTotalAtual,
    rentRs: elRfTotalRentRs,
    rentPct: elRfTotalRentPct,
  });

  if (!items.length) {
    elTbodyRF.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Nenhum ativo de renda fixa cadastrado.</td></tr>';
    return;
  }

  elTbodyRF.innerHTML = items
    .map((item) => {
      const label = `${item.codigo} — ${item.nome}`;
      const totalInvestido = Number(item.total_investido) || 0;
      const valorAtual = Number(item.valor_atual) || 0;
      const rentRs = valorAtual - totalInvestido;
      const rent = Number(item.rentabilidade_pct) || 0;
      const rentClass = rentRs > 0 ? "pos" : rentRs < 0 ? "neg" : "neu";
      const origemBadge = item.calculado_auto
        ? '<span class="asset-name">Automático (BCB)</span>'
        : '<span class="asset-name">Manual</span>';

      return `
        <tr>
          <td>
            <span class="ticker-badge">${escapeHtml(item.codigo)}</span>
            <span class="asset-name">${escapeHtml(item.nome)}</span>
          </td>
          <td>${escapeHtml(formatTaxaRF(item.indexador, item.taxa_percentual))}</td>
          <td class="num money-val">${formatCurrency(totalInvestido)}</td>
          <td class="num num-strong">
            <span class="money-val">${formatCurrency(valorAtual)}</span>
            ${origemBadge}
          </td>
          <td class="num money-val ${rentClass}">${formatSignedCurrency(rentRs)}</td>
          <td class="num">${formatRentPillHtml(rent)}</td>
          <td class="actions-col">
            <button
              type="button"
              class="btn btn-outline-navy btn-sm btn-atualizar-rf"
              data-ativo-id="${item.ativo_id}"
              data-label="${escapeHtml(label)}"
              data-valor="${valorAtual}"
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
  renderSkeletonRows(elTbodyRV, 8, 3);
  renderSkeletonRows(elTbodyRF, 7, 2);

  try {
    const carteira = await window.API.getCarteira();
    renderKPIs(carteira.resumo);
    renderRendaVariavel(carteira.renda_variavel || []);
    renderRendaFixa(carteira.renda_fixa || []);
  } catch (err) {
    showFeedback(err.message, "error");
    elTbodyRV.innerHTML =
      '<tr><td colspan="8" class="empty-cell">Erro ao carregar dados.</td></tr>';
    elTbodyRF.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Erro ao carregar dados.</td></tr>';
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
