/**
 * Paso 4 — resumen desde localStorage (email, datos personales, módulos).
 */
(function () {
  "use strict";

  var STORED_EMAIL_KEY = "userEmail";
  var PERSONAL_KEY = "lutente_onboarding_personal";
  var MODULOS_KEY = "lutente_onboarding_modulos";
  var REGISTRO_ID_KEY = "lutente_onboarding_registro_id";
  var RESULTADO_SESSION_KEY = "lutente_onboarding_resultado";

  var MODULE_ORDER = [
    "ventas",
    "compras",
    "inventario",
    "caja",
    "cuentas",
    "rrhh",
    "logistica"
  ];

  var MODULE_LABELS = {
    ventas: "Ventas",
    compras: "Compras",
    inventario: "Inventario",
    caja: "Caja y finanzas",
    cuentas: "Cuentas corrientes",
    rrhh: "Recursos humanos",
    logistica: "Transporte y logística"
  };

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : null;
    } catch (e) {
      return null;
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clienteCellMarkup(label, value, fullSpan) {
    var v = (value || "").trim();
    var display = v || "—";
    var extraClass = fullSpan ? " panel__cell--full" : "";
    return (
      '<div class="panel__cell' + extraClass + '">' +
      '<span class="panel__label">' +
      esc(label) +
      "</span>" +
      '<span class="panel__value">' +
      esc(display) +
      "</span>" +
      "</div>"
    );
  }

  function fillClientePanel(el) {
    if (!el) return;
    var email = "";
    try {
      email = (localStorage.getItem(STORED_EMAIL_KEY) || "").trim();
    } catch (e) {}
    var personal = readJson(PERSONAL_KEY) || {};

    var nombre = String(personal.nombre || "").trim();
    var apellido = String(personal.apellido || "").trim();
    var nombreCompleto = [nombre, apellido].filter(Boolean).join(" ").trim();

    var parts = [];
    parts.push(clienteCellMarkup("Correo electrónico", email));
    parts.push(clienteCellMarkup("Nombre completo", nombreCompleto));
    parts.push(clienteCellMarkup("Teléfono", personal.telefono));
    parts.push(clienteCellMarkup("Negocio / empresa", personal.empresa));
    parts.push(clienteCellMarkup("País (código)", personal.pais));
    parts.push(clienteCellMarkup("Provincia / estado / región", personal.provincia));
    if (String(personal.mensaje || "").trim()) {
      parts.push(clienteCellMarkup("Mensaje adicional", personal.mensaje, true));
    }
    el.innerHTML =
      '<div class="panel__grid panel__grid--cliente">' + parts.join("") + "</div>";
  }

  function fillModulosPanel(el) {
    if (!el) return;
    var stored = readJson(MODULOS_KEY);
    if (!stored || typeof stored !== "object") {
      el.innerHTML =
        '<p class="panel__empty">No hay módulos guardados. Volvé al paso 3 para seleccionarlos.</p>';
      return;
    }

    var selected = MODULE_ORDER.filter(function (id) {
      return stored[id] === true;
    });

    if (!selected.length) {
      el.innerHTML =
        '<p class="panel__empty">No hay módulos seleccionados. Volvé al paso 3.</p>';
      return;
    }

    var iconSvg =
      '<svg class="module-line__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />' +
      '<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 12l2 2 4-4" />' +
      "</svg>";

    el.innerHTML =
      '<div class="modules-grid">' +
      selected
        .map(function (id) {
          var label = MODULE_LABELS[id] || id;
          return (
            '<div class="module-line">' +
            iconSvg +
            "<span>" +
            esc(label) +
            "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }

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

  function safeParse(txt) {
    try {
      return JSON.parse(txt);
    } catch (e) {
      return null;
    }
  }

  function readRegistroId() {
    try {
      return (localStorage.getItem(REGISTRO_ID_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function showSummaryError(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-hidden", !msg);
  }

  function extractApiError(obj) {
    if (!obj || typeof obj !== "object") return null;
    var nestedErr = obj.error;
    if (
      nestedErr !== null &&
      typeof nestedErr === "object" &&
      typeof nestedErr.message === "string"
    ) {
      return nestedErr.message;
    }
    if (typeof obj.message === "string") return obj.message;
    return null;
  }

  function init() {
    fillClientePanel(document.getElementById("panel-cliente"));
    fillModulosPanel(document.getElementById("panel-modulos"));

    var back = document.getElementById("btn-back-paso4");
    if (back) {
      back.addEventListener("click", function () {
        window.location.href = "paso_3_seleccion_modulos.html";
      });
    }

    var btn = document.getElementById("btn-generate");
    var summary = document.getElementById("summary-view");
    var gen = document.getElementById("generation-view");
    var bar = document.getElementById("gen-progress");
    var errEl = document.getElementById("paso4-api-error");
    if (!btn || !summary || !gen || !bar) return;

    var textWindow = gen.querySelector(".gen__text-window");
    var textWindowDefaultHtml = textWindow ? textWindow.innerHTML : "";

    btn.addEventListener("click", function () {
      showSummaryError(errEl, "");

      var registroId = readRegistroId();
      if (!registroId) {
        showSummaryError(
          errEl,
          "Falta el identificador del registro. Completá el paso 2 con el servidor activo (no abras el flujo como archivo local)."
        );
        return;
      }

      btn.disabled = true;

      summary.classList.add("is-hidden");
      gen.classList.remove("is-hidden");

      if (textWindow) {
        textWindow.innerHTML = textWindowDefaultHtml;
        textWindow.classList.remove("gen__text-window--done");
      }
      bar.classList.remove("is-complete");
      bar.classList.remove("is-animate");
      void bar.offsetWidth;
      bar.classList.add("is-animate");

      function fail(msg) {
        summary.classList.remove("is-hidden");
        gen.classList.add("is-hidden");
        showSummaryError(errEl, msg);
        btn.disabled = false;
      }

      function finishSuccess(url, user, password) {
        bar.classList.remove("is-animate");
        void bar.offsetWidth;
        bar.classList.add("is-complete");
        if (textWindow) {
          textWindow.innerHTML =
            '<div class="gen__text-line gen__text-line--done">Completado</div>';
          textWindow.classList.add("gen__text-window--done");
        }
        window.setTimeout(function () {
          try {
            sessionStorage.setItem(
              RESULTADO_SESSION_KEY,
              JSON.stringify({
                url: String(url || ""),
                user: String(user || ""),
                password: String(password || "")
              })
            );
          } catch (e) {}
          window.location.href = "paso_5_exito.html";
        }, 1000);
      }

      var reqUrl =
        apiUrl(
          "/api/onboard/submissions/" +
            encodeURIComponent(registroId) +
            "/generate-tenant"
        );

      fetch(reqUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: "{}",
        credentials: "include"
      })
        .then(function (res) {
          return res.text().then(function (txt) {
            return { res: res, body: txt ? safeParse(txt) : null };
          });
        })
        .then(function (out) {
          var st = out.res.status;
          if (st === 201) {
            var d = out.body && out.body.data;
            var cred = d && d.credentials;
            if (!cred || typeof cred !== "object") {
              fail("Respuesta inválida del servidor.");
              return;
            }
            finishSuccess(cred.url, cred.user, cred.password);
            return;
          }
          if (st === 200) {
            var sub = out.body && out.body.data;
            if (!sub || typeof sub !== "object") {
              fail("Respuesta inválida del servidor.");
              return;
            }
            var u = sub.url;
            var mail = sub.correo || "";
            if (!u) {
              fail("El tenant no tiene URL registrada.");
              return;
            }
            finishSuccess(
              u,
              mail,
              "Revisá tu correo: el ambiente ya estaba creado y no podemos mostrar la contraseña de nuevo."
            );
            return;
          }
          var errMsg =
            extractApiError(out.body) ||
            "No pudimos generar el ambiente (código " + st + ").";
          fail(errMsg);
        })
        .catch(function () {
          fail("Error de conexión al servidor.");
        });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
