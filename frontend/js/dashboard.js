const {
  formatCurrency,
  formatPercent,
  formatMesLabel,
  showFeedback,
  renderKPIs,
} = window.Utils;

const percentNumberFormatter = new Intl.NumberFormat("pt-BR", {
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
  ACAO: "#1E3250",
  FII: "#3B6291",
  ETF: "#64748B",
  RENDA_FIXA: "#9DA347",
};

const charts = {
  classes: null,
  pesos: null,
  comparativo: null,
  mensal: null,
  cdi: null,
};

let ultimaCarteira = null;
const elBtnRecarregar = document.getElementById("btn-recarregar-dash");

function getChartTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    textColor: isDark ? "#cbd5e1" : "#334155",
    gridColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.25)",
    surfaceColor: isDark ? "#101B2E" : "#ffffff",
    navy: isDark ? "#60A5FA" : "#1E3250",
    navyFill: isDark ? "rgba(96, 165, 250, 0.16)" : "rgba(30, 50, 80, 0.1)",
    olive: isDark ? "#C6CE5C" : "#9DA347",
    muted: isDark ? "#64748B" : "#94A3B8",
    danger: isDark ? "#FB7185" : "#DC2626",
  };
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

  const theme = getChartTheme();
  charts.pesos = new Chart(document.getElementById("chart-pesos"), {
    type: "bar",
    data: {
      labels: ordenados.map((i) => i.codigo),
      datasets: [
        {
          label: "Peso na carteira (%)",
          data: ordenados.map((i) => i.peso),
          backgroundColor: ordenados.map((i) =>
            i.peso > 20 ? theme.danger : theme.navy
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
              return ` ${percentNumberFormatter.format(ctx.raw)}% da carteira`;
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

  const theme = getChartTheme();
  charts.comparativo = new Chart(document.getElementById("chart-comparativo"), {
    type: "bar",
    data: {
      labels: ativosConsolidados.map((a) => a.codigo),
      datasets: [
        {
          label: "Aportado",
          data: ativosConsolidados.map((a) => a.totalInvestido),
          backgroundColor: theme.muted,
          borderRadius: 5,
        },
        {
          label: "Valor Atual",
          data: ativosConsolidados.map((a) => a.valorAtual),
          backgroundColor: theme.navy,
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

  const theme = getChartTheme();
  charts.mensal = new Chart(document.getElementById("chart-mensal"), {
    type: "bar",
    data: {
      labels: aportesPorMes.map((m) => formatMesLabel(m.mes)),
      datasets: [
        {
          label: "Aportes",
          data: aportesPorMes.map((m) => m.total_aportado),
          backgroundColor: theme.olive,
          borderRadius: 5,
        },
        {
          label: "Resgates",
          data: aportesPorMes.map((m) => m.total_resgatado),
          backgroundColor: theme.danger,
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

  const theme = getChartTheme();
  charts.cdi = new Chart(document.getElementById("chart-cdi"), {
    type: "line",
    data: {
      labels: comparativoCDI.map((p) => formatMesLabel(p.mes)),
      datasets: [
        {
          label: "Carteira (%)",
          data: comparativoCDI.map((p) => p.carteira_pct),
          borderColor: theme.navy,
          backgroundColor: theme.navyFill,
          borderWidth: 2.5,
          tension: 0.25,
          fill: true,
        },
        {
          label: "CDI Acumulado (%)",
          data: comparativoCDI.map((p) => p.cdi_pct),
          borderColor: theme.olive,
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
  Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';

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
