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

    // Transição suave ao alternar entre Carteira e Dashboard
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const navLinks = document.querySelectorAll(".topnav .nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (
          prefersReducedMotion ||
          link.classList.contains("active") ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        const href = link.getAttribute("href");
        if (!href) return;

        event.preventDefault();
        const main = document.querySelector("main");
        if (main) {
          main.classList.add("page-leaving");
        }
        setTimeout(() => {
          window.location.href = href;
        }, 140);
      });
    });
  });

  // Garante que o conteúdo volte visível ao usar o botão Voltar do navegador (bfcache)
  window.addEventListener("pageshow", () => {
    const main = document.querySelector("main");
    if (main) {
      main.classList.remove("page-leaving");
    }
  });
})();
