const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost" ||
  window.location.protocol === "file:";

const API_BASE_URL = isLocal
  ? "http://127.0.0.1:8000"
  : "https://carteira-investimentos-api-sigma.vercel.app";

async function request(path, options = {}) {
  const config = {
    headers: {},
    ...options,
  };

  if (config.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, config);
  } catch (err) {
    console.error(`Falha na requisição para ${API_BASE_URL}${path}:`, err);
    throw new Error(
      `Não foi possível conectar à API em ${API_BASE_URL} (${err.message}). Verifique se o servidor FastAPI está rodando e abra o front via http://127.0.0.1:5500.`
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    if (data && data.detail) {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail
          .map((item) => item.msg || JSON.stringify(item))
          .join("; ");
      }
    }
    throw new Error(message);
  }

  return data;
}

window.API = {
  getCarteira() {
    return request("/carteira");
  },

  getAtivos() {
    return request("/ativos");
  },

  criarAtivo(payload) {
    return request("/ativos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  atualizarSaldoRF(ativoId, valorAtual) {
    return request(`/renda-fixa/${ativoId}`, {
      method: "PATCH",
      body: JSON.stringify({ valor_atual: valorAtual }),
    });
  },

  criarAporte(payload) {
    return request("/aportes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  atualizarAporte(aporteId, payload) {
    return request(`/aportes/${aporteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deletarAporte(aporteId) {
    return request(`/aportes/${aporteId}`, {
      method: "DELETE",
    });
  },
};
