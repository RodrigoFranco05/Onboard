/**
 * Paso 4 — resumen desde localStorage (email, datos personales, módulos).
 */
(function () {
  "use strict";

  var STORED_EMAIL_KEY = "userEmail";
  var PERSONAL_KEY = "lutente_onboarding_personal";
  var MODULOS_KEY = "lutente_onboarding_modulos";

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
    if (!btn || !summary || !gen || !bar) return;
    btn.addEventListener("click", function () {
      summary.classList.add("is-hidden");
      gen.classList.remove("is-hidden");
      bar.classList.remove("is-animate");
      void bar.offsetWidth;
      bar.classList.add("is-animate");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
