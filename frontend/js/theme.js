(function () {
  const STORAGE_KEY = "carteira-theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);

    const btn = document.getElementById("btn-tema");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀️ Claro" : "🌙 Escuro";
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
      );
    }

    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  // Aplica imediatamente para evitar flash de tema ao carregar
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute("data-theme", initialTheme);

  window.addEventListener("DOMContentLoaded", () => {
    applyTheme(initialTheme);
    const btn = document.getElementById("btn-tema");
    if (btn) {
      btn.addEventListener("click", () => {
        const current =
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }
  });
})();
