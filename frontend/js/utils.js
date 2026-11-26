(function () {
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const numberFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

  const pctShortFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  const percentFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let feedbackTimer = null;

  function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
  }

  function formatSignedCurrency(value) {
    const num = Number(value) || 0;
    return `${num > 0 ? "+" : ""}${currencyFormatter.format(num)}`;
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value) {
    const num = Number(value) || 0;
    return `${num > 0 ? "+" : ""}${percentFormatter.format(num)}%`;
  }

  function formatRentPillHtml(value) {
    const num = Number(value) || 0;
    const cls =
      num > 0 ? "rent-pill-pos" : num < 0 ? "rent-pill-neg" : "rent-pill-neu";
    const arrow = num > 0 ? "▲ " : num < 0 ? "▼ " : "";
    return `<span class="rent-pill ${cls}">${arrow}${formatPercent(num)}</span>`;
  }

  function applyRentPillElement(el, value) {
    if (!el) return;
    const num = Number(value) || 0;
    const cls =
      num > 0 ? "rent-pill-pos" : num < 0 ? "rent-pill-neg" : "rent-pill-neu";
    const arrow = num > 0 ? "▲ " : num < 0 ? "▼ " : "";
    el.className = `rent-pill ${cls}`;
    el.textContent = `${arrow}${formatPercent(num)}`;
  }

  function formatDate(isoDate) {
    if (!isoDate) return "-";
    const [year, month, day] = String(isoDate).split("-");
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  }

  function formatMesLabel(anoMes) {
    const [ano, mes] = String(anoMes).split("-");
    return ano && mes ? `${mes}/${ano}` : anoMes;
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

  function renderSkeletonRows(tbody, cols, rows = 3) {
    if (!tbody) return;
    const cells = Array.from({ length: cols }, () => '<td><span class="skeleton-bar"></span></td>').join("");
    tbody.innerHTML = Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join("");
  }

  function showFeedback(message, type = "success") {
    const elFeedback = document.getElementById("feedback");
    if (!elFeedback) return;
    clearTimeout(feedbackTimer);
    elFeedback.textContent = message;
    elFeedback.className = `feedback ${type}`;
    feedbackTimer = setTimeout(() => {
      elFeedback.classList.add("hidden");
    }, 4500);
  }

  function renderKPIs(resumo) {
    const elPatrimonio = document.getElementById("kpi-patrimonio");
    if (!elPatrimonio) return;

    const elBarRV = document.getElementById("kpi-bar-rv");
    const elBarRF = document.getElementById("kpi-bar-rf");
    const elLegendRV = document.getElementById("kpi-legend-rv");
    const elLegendRF = document.getElementById("kpi-legend-rf");
    const elAportado = document.getElementById("kpi-aportado");
    const elLucro = document.getElementById("kpi-lucro");
    const elRentabilidade = document.getElementById("kpi-rentabilidade");
    const elMaiorAlta = document.getElementById("kpi-maior-alta");
    const elMaiorQueda = document.getElementById("kpi-maior-queda");

    const patrimonio = Number(resumo?.patrimonio_total) || 0;
    const aportado = Number(resumo?.total_aportado) || 0;
    const lucro = Number(resumo?.lucro_prejuizo) || 0;
    const rentPct = Number(resumo?.rentabilidade_total_pct) || 0;
    const pctRV = Number(resumo?.pct_rv) || 0;
    const pctRF = Number(resumo?.pct_rf) || 0;

    elPatrimonio.textContent = formatCurrency(patrimonio);

    if (elBarRV && elBarRF) {
      const hasData = patrimonio > 0;
      elBarRV.style.width = `${hasData ? pctRV : 50}%`;
      elBarRF.style.width = `${hasData ? pctRF : 50}%`;
    }
    if (elLegendRV) {
      elLegendRV.textContent = `RV ${pctShortFormatter.format(pctRV)}%`;
    }
    if (elLegendRF) {
      elLegendRF.textContent = `RF ${pctShortFormatter.format(pctRF)}%`;
    }
    if (elAportado) {
      elAportado.textContent = formatCurrency(aportado);
    }

    const lucroClass = lucro > 0 ? "pos" : lucro < 0 ? "neg" : "neu";
    if (elLucro) {
      elLucro.textContent = formatSignedCurrency(lucro);
      elLucro.className = `summary-value money-val ${lucroClass}`;
    }
    applyRentPillElement(elRentabilidade, rentPct);

    if (elMaiorAlta) {
      elMaiorAlta.textContent = resumo?.maior_alta
        ? `▲ ${resumo.maior_alta.codigo} ${formatPercent(resumo.maior_alta.rentabilidade_pct)}`
        : "—";
    }
    if (elMaiorQueda) {
      elMaiorQueda.textContent = resumo?.maior_queda
        ? `▼ ${resumo.maior_queda.codigo} ${formatPercent(resumo.maior_queda.rentabilidade_pct)}`
        : "—";
    }
  }

  window.Utils = {
    formatCurrency,
    formatSignedCurrency,
    formatNumber,
    formatPercent,
    formatRentPillHtml,
    applyRentPillElement,
    formatDate,
    formatMesLabel,
    formatTaxaRF,
    escapeHtml,
    renderSkeletonRows,
    showFeedback,
    renderKPIs,
  };
})();
