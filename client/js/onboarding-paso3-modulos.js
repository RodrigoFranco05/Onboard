/**
 * Paso 3 — selección de módulos.
 * Guarda la selección en localStorage y hace POST a `/api/onboard/modulos`.
 *
 * Requiere `client/js/api-config.js` antes de este archivo.
 */
(function () {
  "use strict";

  var STORED_EMAIL_KEY = "userEmail";
  var MODULOS_KEY = "lutente_onboarding_modulos";
  var MODULE_NAMES = ["ventas", "compras", "inventario", "caja", "cuentas", "rrhh", "logistica"];

  function getApiBase() {
    if (typeof window.__LUTENTE_API_BASE__ === "string") {
      return window.__LUTENTE_API_BASE__.replace(/\/$/, "");
    }
    return "";
  }

  function apiUrl(path) {
    var base = getApiBase();
    var p = path.charAt(0) === "/" ? path : "/" + path;
    return base ? base + p : p;
  }

  function readStoredEmail() {
    try {
      return (localStorage.getItem(STORED_EMAIL_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  /** @returns {Record<string, boolean>} */
  function readStoredModulos() {
    try {
      var raw = localStorage.getItem(MODULOS_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : {};
    } catch (e) {
      return {};
    }
  }

  /** @param {Record<string, boolean>} data */
  function writeStoredModulos(data) {
    try {
      localStorage.setItem(MODULOS_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  /** @param {HTMLFormElement} form @returns {Record<string, boolean>} */
  function collectModulos(form) {
    var result = {};
    MODULE_NAMES.forEach(function (name) {
      var input = form.querySelector('input[type="checkbox"][value="' + name + '"]');
      result[name] = input ? input.checked : false;
    });
    return result;
  }

  /** @param {HTMLFormElement} form @param {Record<string, boolean>} stored */
  function applyStoredToForm(form, stored) {
    MODULE_NAMES.forEach(function (name) {
      if (!(name in stored)) return;
      var input = form.querySelector('input[type="checkbox"][value="' + name + '"]');
      if (input) input.checked = !!stored[name];
    });
  }

  function clearBanner(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("notice--error", "notice--ok");
  }

  function showBanner(el, msg, ok) {
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("notice--ok", !!ok);
    el.classList.toggle("notice--error", !ok);
    el.focus();
  }

  function safeParse(txt) {
    try {
      return JSON.parse(txt);
    } catch (e) {
      return null;
    }
  }

  /** @param {HTMLElement} main */
  function shouldSkipApi(main) {
    var a = main.getAttribute("data-skip-modulos-api");
    if (a === "true") return true;
    if (a === "false") return false;
    return window.location.protocol === "file:";
  }

  /** @param {HTMLElement} main */
  function init(main) {
    if (!main) return;

    var form = main.querySelector("form");
    if (!(form instanceof HTMLFormElement)) return;

    var bannerEl = main.querySelector("#paso3-form-banner");
    var submitBtn = form.querySelector('[type="submit"]');
    var backBtn = form.querySelector(".btn-back");

    var endpoint = apiUrl(main.getAttribute("data-endpoint-modulos") || "/api/onboard/modulos");
    var nextStep = main.getAttribute("data-next-step") || "paso_4_resumen_y_generacion.html";
    var backStep = main.getAttribute("data-back-step") || "paso_2_datos_personales.html";

    applyStoredToForm(form, readStoredModulos());

    form.addEventListener("change", function () {
      writeStoredModulos(collectModulos(form));
    });

    if (backBtn) {
      backBtn.addEventListener("click", function () {
        window.location.href = backStep;
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearBanner(bannerEl);

      var email = readStoredEmail();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showBanner(bannerEl, "Falta el correo registrado. Volvé al paso 1.", false);
        return;
      }

      var modulos = collectModulos(form);
      writeStoredModulos(modulos);

      if (shouldSkipApi(main)) {
        window.location.href = nextStep;
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ email: email, modulos: modulos }),
        credentials: "include"
      })
        .then(function (res) {
          return res.text().then(function (txt) {
            return { res: res, data: txt ? safeParse(txt) : null };
          });
        })
        .then(function (out) {
          if (out.res.ok) {
            window.location.href = nextStep;
            return;
          }
          var respData = typeof out.data === "object" && out.data !== null ? out.data : {};
          var nestedErr = respData.error;
          var errMsg =
            nestedErr !== null &&
            typeof nestedErr === "object" &&
            typeof nestedErr.message === "string"
              ? nestedErr.message
              : null;
          showBanner(bannerEl, errMsg || "No pudimos guardar los módulos en el servidor.", false);
        })
        .catch(function () {
          showBanner(bannerEl, "Error de conexión al servidor.", false);
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    init(document.getElementById("onboarding-modulos"));
  });
})();
