const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CLASS_LABELS = {
  ACAO: "Ações",
  FII: "FIIs",
  ETF: "ETFs",
  RENDA_FIXA: "Renda Fixa",
};

const CLASS_COLORS = {
  ACAO: "#2563eb",
  FII: "#0ea5e9",
  ETF: "#8b5cf6",
  RENDA_FIXA: "#16a34a",
};

const charts = {
  classes: null,
  pesos: null,
  comparativo: null,
  mensal: null,
  cdi: null,
};

let feedbackTimer = null;
let ultimaCarteira = null;

function getChartTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    textColor: isDark ? "#cbd5e1" : "#475569",
    gridColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.25)",
    surfaceColor: isDark ? "#111827" : "#ffffff",
  };
}

// DOM
const elFeedback = document.getElementById("feedback");
const elBtnRecarregar = document.getElementById("btn-recarregar-dash");
const elKpiPatrimonio = document.getElementById("kpi-patrimonio");
const elKpiSubPatrimonio = document.getElementById("kpi-sub-patrimonio");
const elKpiAportado = document.getElementById("kpi-aportado");
const elKpiLucro = document.getElementById("kpi-lucro");
const elKpiRentabilidade = document.getElementById("kpi-rentabilidade");
const elKpiMaiorAlta = document.getElementById("kpi-maior-alta");
const elKpiMaiorQueda = document.getElementById("kpi-maior-queda");

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatPercent(value) {
  const num = Number(value) || 0;
  return `${num > 0 ? "+" : ""}${percentFormatter.format(num)}%`;
}

function formatMesLabel(anoMes) {
  const [ano, mes] = String(anoMes).split("-");
  return ano && mes ? `${mes}/${ano}` : anoMes;
}

function showFeedback(message, type = "error") {
  clearTimeout(feedbackTimer);
  elFeedback.textContent = message;
  elFeedback.className = `feedback ${type}`;
  feedbackTimer = setTimeout(() => {
    elFeedback.classList.add("hidden");
  }, 5000);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
}

function toggleEmpty(canvasId, emptyId, isEmpty) {
  document.getElementById(canvasId).classList.toggle("hidden", isEmpty);
  document.getElementById(emptyId).classList.toggle("hidden", !isEmpty);
}

function renderKPIs(resumo) {
  const patrimonio = Number(resumo?.patrimonio_total) || 0;
  const aportado = Number(resumo?.total_aportado) || 0;
  const lucro = Number(resumo?.lucro_prejuizo) || 0;
  const rentPct = Number(resumo?.rentabilidade_total_pct) || 0;
  const totalRV = Number(resumo?.total_rv) || 0;
  const totalRF = Number(resumo?.total_rf) || 0;

  elKpiPatrimonio.textContent = formatCurrency(patrimonio);
  elKpiSubPatrimonio.textContent = `RV ${formatCurrency(totalRV)} · RF ${formatCurrency(totalRF)}`;
  elKpiAportado.textContent = formatCurrency(aportado);

  const lucroClass = lucro > 0 ? "pos" : lucro < 0 ? "neg" : "neu";
  elKpiLucro.textContent = `${lucro > 0 ? "+" : ""}${formatCurrency(lucro)}`;
  elKpiLucro.className = `summary-value ${lucroClass}`;
  elKpiRentabilidade.textContent = formatPercent(rentPct);
  elKpiRentabilidade.className = `kpi-sub ${lucroClass}`;

  elKpiMaiorAlta.textContent = resumo?.maior_alta
    ? `▲ ${resumo.maior_alta.codigo} ${formatPercent(resumo.maior_alta.rentabilidade_pct)}`
    : "—";

  elKpiMaiorQueda.textContent = resumo?.maior_queda
    ? `▼ ${resumo.maior_queda.codigo} ${formatPercent(resumo.maior_queda.rentabilidade_pct)}`
    : "—";
}

function renderChartClasses(alocacao) {
  destroyChart("classes");
  const entries = Object.entries(alocacao || {}).filter(([, val]) => val > 0);
  const isEmpty = entries.length === 0;
  toggleEmpty("chart-classes", "empty-classes", isEmpty);
  if (isEmpty) return;

  const total = entries.reduce((acc, [, v]) => acc + v, 0);
  const labels = entries.map(([classe]) => CLASS_LABELS[classe] || classe);
  const data = entries.map(([, val]) => val);
  const colors = entries.map(([classe]) => CLASS_COLORS[classe] || "#64748b");

  const theme = getChartTheme();
  charts.classes = new Chart(document.getElementById("chart-classes"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: theme.surfaceColor,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: theme.textColor },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const val = Number(ctx.raw) || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
              return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderChartPesos(ativosConsolidados) {
  destroyChart("pesos");
  const total = ativosConsolidados.reduce((acc, a) => acc + a.valorAtual, 0);
  const isEmpty = ativosConsolidados.length === 0 || total <= 0;
  toggleEmpty("chart-pesos", "empty-pesos", isEmpty);
  if (isEmpty) return;

  const ordenados = [...ativosConsolidados]
    .map((a) => ({
      codigo: a.codigo,
      peso: Number(((a.valorAtual / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.peso - a.peso);

  charts.pesos = new Chart(document.getElementById("chart-pesos"), {
    type: "bar",
    data: {
      labels: ordenados.map((i) => i.codigo),
      datasets: [
        {
          label: "Peso na carteira (%)",
          data: ordenados.map((i) => i.peso),
          backgroundColor: ordenados.map((i) =>
            i.peso > 20 ? "#dc2626" : "#2563eb"
          ),
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${percentFormatter.format(ctx.raw)}% da carteira`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: (v) => `${v}%` },
        },
      },
    },
  });
}

function renderChartComparativo(ativosConsolidados) {
  destroyChart("comparativo");
  const isEmpty = ativosConsolidados.length === 0;
  toggleEmpty("chart-comparativo", "empty-comparativo", isEmpty);
  if (isEmpty) return;

  charts.comparativo = new Chart(document.getElementById("chart-comparativo"), {
    type: "bar",
    data: {
      labels: ativosConsolidados.map((a) => a.codigo),
      datasets: [
        {
          label: "Aportado",
          data: ativosConsolidados.map((a) => a.totalInvestido),
          backgroundColor: "#94a3b8",
          borderRadius: 5,
        },
        {
          label: "Valor Atual",
          data: ativosConsolidados.map((a) => a.valorAtual),
          backgroundColor: "#2563eb",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatCurrency(v) },
        },
      },
    },
  });
}

function renderChartMensal(aportesPorMes) {
  destroyChart("mensal");
  const isEmpty = !aportesPorMes || aportesPorMes.length === 0;
  toggleEmpty("chart-mensal", "empty-mensal", isEmpty);
  if (isEmpty) return;

  charts.mensal = new Chart(document.getElementById("chart-mensal"), {
    type: "bar",
    data: {
      labels: aportesPorMes.map((m) => formatMesLabel(m.mes)),
      datasets: [
        {
          label: "Aportes",
          data: aportesPorMes.map((m) => m.total_aportado),
          backgroundColor: "#16a34a",
          borderRadius: 5,
        },
        {
          label: "Resgates",
          data: aportesPorMes.map((m) => m.total_resgatado),
          backgroundColor: "#ef4444",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatCurrency(v) },
        },
      },
    },
  });
}

function renderChartCDI(comparativoCDI) {
  destroyChart("cdi");
  const isEmpty = !comparativoCDI || comparativoCDI.length === 0;
  toggleEmpty("chart-cdi", "empty-cdi", isEmpty);
  if (isEmpty) return;

  charts.cdi = new Chart(document.getElementById("chart-cdi"), {
    type: "line",
    data: {
      labels: comparativoCDI.map((p) => formatMesLabel(p.mes)),
      datasets: [
        {
          label: "Carteira (%)",
          data: comparativoCDI.map((p) => p.carteira_pct),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderWidth: 2.5,
          tension: 0.25,
          fill: true,
        },
        {
          label: "CDI Acumulado (%)",
          data: comparativoCDI.map((p) => p.cdi_pct),
          borderColor: "#16a34a",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${formatPercent(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v) => `${v}%` },
        },
      },
    },
  });
}

function renderizarTudo(carteira) {
  const theme = getChartTheme();
  Chart.defaults.color = theme.textColor;
  Chart.defaults.borderColor = theme.gridColor;

  const resumo = carteira.resumo || {};
  renderKPIs(resumo);

  const ativosConsolidados = [
    ...(carteira.renda_variavel || []).map((i) => ({
      codigo: i.codigo,
      totalInvestido: Number(i.total_investido) || 0,
      valorAtual: Number(i.total_atual) || 0,
    })),
    ...(carteira.renda_fixa || []).map((i) => ({
      codigo: i.codigo,
      totalInvestido: Number(i.total_investido) || 0,
      valorAtual: Number(i.valor_atual) || 0,
    })),
  ];

  renderChartClasses(resumo.alocacao_por_classe);
  renderChartPesos(ativosConsolidados);
  renderChartComparativo(ativosConsolidados);
  renderChartMensal(resumo.aportes_por_mes);
  renderChartCDI(resumo.comparativo_cdi);
}

async function carregarDashboard() {
  elBtnRecarregar.disabled = true;
  try {
    ultimaCarteira = await window.API.getCarteira();
    renderizarTudo(ultimaCarteira);
  } catch (err) {
    showFeedback(err.message, "error");
  } finally {
    elBtnRecarregar.disabled = false;
  }
}

window.addEventListener("themechange", () => {
  if (ultimaCarteira) {
    renderizarTudo(ultimaCarteira);
  }
});

elBtnRecarregar.addEventListener("click", carregarDashboard);
carregarDashboard();
