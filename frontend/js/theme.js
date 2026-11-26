(function () {
  const THEME_KEY = "carteira-theme";
  const PRIVACY_KEY = "acinonyx-privacy";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getPreferredPrivacy() {
    return localStorage.getItem(PRIVACY_KEY) === "hidden" ? "hidden" : "visible";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

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

  function applyPrivacy(mode) {
    document.documentElement.setAttribute("data-privacy", mode);
    localStorage.setItem(PRIVACY_KEY, mode);

    const btn = document.getElementById("btn-privacidade");
    if (btn) {
      btn.textContent = mode === "hidden" ? "🙈" : "👁️";
      btn.setAttribute(
        "aria-label",
        mode === "hidden" ? "Mostrar valores" : "Ocultar valores"
      );
      btn.setAttribute(
        "title",
        mode === "hidden" ? "Mostrar valores" : "Ocultar valores"
      );
    }
  }

  // Aplica imediatamente para evitar flash de tema/privacidade ao carregar
  const initialTheme = getPreferredTheme();
  const initialPrivacy = getPreferredPrivacy();
  document.documentElement.setAttribute("data-theme", initialTheme);
  document.documentElement.setAttribute("data-privacy", initialPrivacy);

  window.addEventListener("DOMContentLoaded", () => {
    applyTheme(initialTheme);
    applyPrivacy(initialPrivacy);

    const btnTema = document.getElementById("btn-tema");
    if (btnTema) {
      btnTema.addEventListener("click", () => {
        const current =
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }

    const btnPriv = document.getElementById("btn-privacidade");
    if (btnPriv) {
      btnPriv.addEventListener("click", () => {
        const current =
          document.documentElement.getAttribute("data-privacy") === "hidden"
            ? "hidden"
            : "visible";
        applyPrivacy(current === "hidden" ? "visible" : "hidden");
      });
    }

    // Transição suave ao alternar entre Carteira, Aportes e Dashboard
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const navLinks = document.querySelectorAll(
      ".topnav .nav-link, .bottom-nav .bottom-nav-link, a.nav-transition"
    );
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

  // Registra Service Worker para instalação como PWA (Android/Firefox/Chrome)
  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
