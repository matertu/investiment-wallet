(function () {
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

  let feedbackTimer = null;

  function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value) {
    const num = Number(value) || 0;
    return `${num > 0 ? "+" : ""}${percentFormatter.format(num)}%`;
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

    const elSubPatrimonio = document.getElementById("kpi-sub-patrimonio");
    const elAportado = document.getElementById("kpi-aportado");
    const elLucro = document.getElementById("kpi-lucro");
    const elRentabilidade = document.getElementById("kpi-rentabilidade");
    const elMaiorAlta = document.getElementById("kpi-maior-alta");
    const elMaiorQueda = document.getElementById("kpi-maior-queda");

    const patrimonio = Number(resumo?.patrimonio_total) || 0;
    const aportado = Number(resumo?.total_aportado) || 0;
    const lucro = Number(resumo?.lucro_prejuizo) || 0;
    const rentPct = Number(resumo?.rentabilidade_total_pct) || 0;
    const totalRV = Number(resumo?.total_rv) || 0;
    const totalRF = Number(resumo?.total_rf) || 0;

    elPatrimonio.textContent = formatCurrency(patrimonio);
    if (elSubPatrimonio) {
      elSubPatrimonio.textContent = `RV ${formatCurrency(totalRV)} · RF ${formatCurrency(totalRF)}`;
    }
    if (elAportado) {
      elAportado.textContent = formatCurrency(aportado);
    }

    const lucroClass = lucro > 0 ? "pos" : lucro < 0 ? "neg" : "neu";
    if (elLucro) {
      elLucro.textContent = `${lucro > 0 ? "+" : ""}${formatCurrency(lucro)}`;
      elLucro.className = `summary-value ${lucroClass}`;
    }
    if (elRentabilidade) {
      elRentabilidade.textContent = formatPercent(rentPct);
      elRentabilidade.className = `kpi-sub ${lucroClass}`;
    }

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
    formatNumber,
    formatPercent,
    formatDate,
    formatMesLabel,
    formatTaxaRF,
    escapeHtml,
    showFeedback,
    renderKPIs,
  };
})();
