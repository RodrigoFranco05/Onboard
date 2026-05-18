/**
 * Paso 2 — validación, localStorage y POST `/api/onboard/personal`.
 *
 * Países: por defecto van **embebidos** abajo (sirve abriendo el HTML como archivo).
 * Opcional HTTP: en `#onboarding-personal` poné `data-countries-src="fetch"` y
 * `data-countries-json` con la URL del JSON.
 *
 * POST al servidor: si abrís la página como `file://`, no hay fetch posible al API;
 * en ese caso se omite el POST y solo se usa localStorage + siguiente paso.
 * Forzar: `data-skip-personal-api="true"` | desactivar omisión: `"false"`.
 *
 * Requiere `client/js/api-config.js` antes de este archivo (mismo patrón que `index`).
 * Opcional: `client/js/onboarding-shared.js` para `LUTENTE_ONBOARDING_KEYS`.
 */
(function () {
  "use strict";

  /** Misma clave que `onboarding-step1.js` (`redireccionPaso2`). */
  var STORED_EMAIL_KEY = "userEmail";

  var KEYS = window.LUTENTE_ONBOARDING_KEYS || {
    PERSONAL: "lutente_onboarding_personal"
  };

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

  /** @param {string|null} attrValue valor de `data-endpoint-personal` */
  function resolvePersonalEndpoint(attrValue) {
    var v = String(attrValue || "").trim();
    var pathOrDefault = v || "/api/onboard/personal";
    if (/^https?:\/\//i.test(pathOrDefault)) {
      return pathOrDefault;
    }
    return apiUrl(pathOrDefault);
  }

  /** Copia de client/data/countries-latam-europe.json — mantener sincronizada si editás el JSON. */
  var LUTENTE_EMBEDDED_COUNTRIES = {
    version: 2,
    countries: [
      { code: "AG", name: "Antigua y Barbuda", region: "latam" },
      { code: "AR", name: "Argentina", region: "latam" },
      { code: "BS", name: "Bahamas", region: "latam" },
      { code: "BB", name: "Barbados", region: "latam" },
      { code: "BZ", name: "Belice", region: "latam" },
      { code: "BO", name: "Bolivia", region: "latam" },
      { code: "BR", name: "Brasil", region: "latam" },
      { code: "CL", name: "Chile", region: "latam" },
      { code: "CO", name: "Colombia", region: "latam" },
      { code: "CR", name: "Costa Rica", region: "latam" },
      { code: "CU", name: "Cuba", region: "latam" },
      { code: "DM", name: "Dominica", region: "latam" },
      { code: "EC", name: "Ecuador", region: "latam" },
      { code: "SV", name: "El Salvador", region: "latam" },
      { code: "GD", name: "Granada", region: "latam" },
      { code: "GT", name: "Guatemala", region: "latam" },
      { code: "GY", name: "Guyana", region: "latam" },
      { code: "HT", name: "Haití", region: "latam" },
      { code: "HN", name: "Honduras", region: "latam" },
      { code: "JM", name: "Jamaica", region: "latam" },
      { code: "MX", name: "México", region: "latam" },
      { code: "NI", name: "Nicaragua", region: "latam" },
      { code: "PA", name: "Panamá", region: "latam" },
      { code: "PY", name: "Paraguay", region: "latam" },
      { code: "PE", name: "Perú", region: "latam" },
      { code: "DO", name: "República Dominicana", region: "latam" },
      { code: "KN", name: "San Cristóbal y Nieves", region: "latam" },
      { code: "LC", name: "Santa Lucía", region: "latam" },
      { code: "VC", name: "San Vicente y las Granadinas", region: "latam" },
      { code: "SR", name: "Surinam", region: "latam" },
      { code: "TT", name: "Trinidad y Tobago", region: "latam" },
      { code: "UY", name: "Uruguay", region: "latam" },
      { code: "VE", name: "Venezuela", region: "latam" },
      { code: "DE", name: "Alemania", region: "europe" },
      { code: "AL", name: "Albania", region: "europe" },
      { code: "AD", name: "Andorra", region: "europe" },
      { code: "AT", name: "Austria", region: "europe" },
      { code: "BY", name: "Bielorrusia", region: "europe" },
      { code: "BE", name: "Bélgica", region: "europe" },
      { code: "BA", name: "Bosnia y Herzegovina", region: "europe" },
      { code: "BG", name: "Bulgaria", region: "europe" },
      { code: "HR", name: "Croacia", region: "europe" },
      { code: "CY", name: "Chipre", region: "europe" },
      { code: "DK", name: "Dinamarca", region: "europe" },
      { code: "SK", name: "Eslovaquia", region: "europe" },
      { code: "SI", name: "Eslovenia", region: "europe" },
      { code: "ES", name: "España", region: "europe" },
      { code: "EE", name: "Estonia", region: "europe" },
      { code: "FI", name: "Finlandia", region: "europe" },
      { code: "FR", name: "Francia", region: "europe" },
      { code: "GR", name: "Grecia", region: "europe" },
      { code: "HU", name: "Hungría", region: "europe" },
      { code: "IE", name: "Irlanda", region: "europe" },
      { code: "IS", name: "Islandia", region: "europe" },
      { code: "IT", name: "Italia", region: "europe" },
      { code: "XK", name: "Kosovo", region: "europe" },
      { code: "LV", name: "Letonia", region: "europe" },
      { code: "LI", name: "Liechtenstein", region: "europe" },
      { code: "LT", name: "Lituania", region: "europe" },
      { code: "LU", name: "Luxemburgo", region: "europe" },
      { code: "MK", name: "Macedonia del Norte", region: "europe" },
      { code: "MT", name: "Malta", region: "europe" },
      { code: "MD", name: "Moldavia", region: "europe" },
      { code: "MC", name: "Mónaco", region: "europe" },
      { code: "ME", name: "Montenegro", region: "europe" },
      { code: "NO", name: "Noruega", region: "europe" },
      { code: "NL", name: "Países Bajos", region: "europe" },
      { code: "PL", name: "Polonia", region: "europe" },
      { code: "PT", name: "Portugal", region: "europe" },
      { code: "GB", name: "Reino Unido", region: "europe" },
      { code: "CZ", name: "República Checa", region: "europe" },
      { code: "RO", name: "Rumanía", region: "europe" },
      { code: "RU", name: "Rusia", region: "europe" },
      { code: "SM", name: "San Marino", region: "europe" },
      { code: "VA", name: "Santa Sede (Ciudad del Vaticano)", region: "europe" },
      { code: "RS", name: "Serbia", region: "europe" },
      { code: "SE", name: "Suecia", region: "europe" },
      { code: "CH", name: "Suiza", region: "europe" },
      { code: "UA", name: "Ucrania", region: "europe" }
    ]
  };

  /** @type {Set<string>|null} */
  var allowedCountryCodes = null;

  function readStoredEmail() {
    try {
      return (localStorage.getItem(STORED_EMAIL_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function readStoredPersonal() {
    try {
      var raw = localStorage.getItem(KEYS.PERSONAL);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : {};
    } catch (e) {
      return {};
    }
  }

  function writeStoredPersonalDraft(draft) {
    try {
      localStorage.setItem(KEYS.PERSONAL, JSON.stringify(draft));
    } catch (e) {}
  }

  /** @param {HTMLFormElement} form */
  function collectPersonalFields(form) {
    var fd = new FormData(form);
    return {
      nombre: String(fd.get("nombre") || "").trim(),
      apellido: String(fd.get("apellido") || "").trim(),
      telefono: String(fd.get("telefono") || "").trim(),
      empresa: String(fd.get("empresa") || "").trim(),
      pais: normalizeCountryCode(String(fd.get("pais") || "")),
      provincia: String(fd.get("provincia") || "").trim(),
      mensaje: String(fd.get("mensaje") || "").trim()
    };
  }

  function normalizeCountryCode(v) {
    return String(v || "").trim().toUpperCase();
  }

  /** @param {Record<string, string>} draft @param {Set<string>|null} codesSet */
  function validatePersonal(draft, codesSet) {
    /** @type {Record<string, string>} */
    var err = {};

    if (!draft.nombre.length) err.nombre = "Indica el nombre.";
    else if (draft.nombre.length < 2) err.nombre = "Nombre demasiado corto.";

    if (!draft.apellido.length) err.apellido = "Indica el apellido.";
    else if (draft.apellido.length < 2) err.apellido = "Apellido demasiado corto.";

    if (!draft.telefono.length) err.telefono = "Indica un teléfono.";
    else {
      var telDigits = draft.telefono.replace(/\D/g, "");
      if (telDigits.length < 8)
        err.telefono = "El teléfono debe tener al menos 8 dígitos.";
    }

    if (!draft.pais) err.pais = "Selecciona tu país.";
    else if (codesSet && !codesSet.has(draft.pais))
      err.pais = "Selecciona un país válido de la lista.";

    if (!draft.provincia.length)
      err.provincia = "Indica provincia, estado o región.";
    else if (draft.provincia.length < 2)
      err.provincia = "Demasiado corto (mínimo 2 caracteres).";
    else if (draft.provincia.length > 50)
      err.provincia = "Máximo 50 caracteres.";

    return err;
  }

  /** @param {HTMLElement} root @param {Record<string, string>} err */
  function showFieldErrors(root, err) {
    root.querySelectorAll("[data-field-error]").forEach(function (el) {
      var name = el.getAttribute("data-field-error");
      if (!name) return;
      if (!err[name]) {
        el.textContent = "";
        el.hidden = true;
        var inp = root.querySelector('[name="' + name + '"]');
        if (inp && inp.classList) inp.classList.remove("input--error");
      } else {
        el.textContent = err[name];
        el.hidden = false;
        var input = root.querySelector('[name="' + name + '"]');
        if (input && input.classList) input.classList.add("input--error");
      }
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

  /** @param {HTMLFormElement} form @param {Record<string, unknown>} draft */
  function applyDraftToForm(form, draft) {
    ["nombre", "apellido", "telefono", "empresa", "mensaje", "provincia"].forEach(
      function (name) {
        if (!(name in draft)) return;
        var v = draft[name];
        if (v === null || v === "") return;
        var cell = form.elements.namedItem(name);
        if (cell && "value" in cell)
          /** @type {HTMLInputElement | HTMLTextAreaElement} */ (cell).value =
            String(v);
      },
    );
    if (draft.pais) {
      var paisEl = form.elements.namedItem("pais");
      if (paisEl && "value" in paisEl) {
        var code = normalizeCountryCode(String(draft.pais));
        /** @type {HTMLSelectElement} */ (paisEl).value = code;
      }
    }
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var self = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }

  /** @param {unknown} dataPayload API JSON o objeto embebido */
  /** @param {HTMLFormElement} form */
  /** @returns {Set<string>|null} */
  function fillCountrySelectFromData(form, dataPayload) {
    var raw = Array.isArray(dataPayload) ? dataPayload : /** @type {{countries?:unknown}} */ (dataPayload).countries;
    if (!Array.isArray(raw)) return null;

    var countries = raw.filter(function (c) {
      return (
        c &&
        typeof c === "object" &&
        /** @type {{region?:unknown,code?:unknown,name?:unknown}} */ (c).region !== undefined &&
        (/** @type {{region:string}} */ (c).region === "latam" ||
          /** @type {{region:string}} */ (c).region === "europe") &&
        /** @type {{code?:unknown,name?:unknown}} */ (c).code &&
        /** @type {{code?:unknown,name?:unknown}} */ (c).name
      );
    });

    countries.sort(function (a, b) {
      return String(/** @type {{name:string}} */ (a).name).localeCompare(
        String(/** @type {{name:string}} */ (b).name),
        "es",
      );
    });

    var sel = form.elements.namedItem("pais");
    if (!(sel instanceof HTMLSelectElement)) return null;

    while (sel.options.length > 1) sel.remove(1);

    var codes = new Set();
    countries.forEach(function (c) {
      var row = /** @type {{code:string,name:string}} */ (c);
      var code = normalizeCountryCode(String(row.code));
      codes.add(code);
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = String(row.name);
      sel.appendChild(opt);
    });

    return codes;
  }

  /**
   * @param {HTMLElement} main
   * @param {HTMLFormElement} form
   * @param {HTMLElement|null} bannerEl
   * @returns {Promise<Set<string>|null>}
   */
  function loadCountries(main, form, bannerEl) {
    var mode = (main.getAttribute("data-countries-src") || "embedded").toLowerCase();

    if (mode === "fetch") {
      var url =
        main.getAttribute("data-countries-json") ||
        "../data/countries-latam-europe.json";

      return fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          var codes = fillCountrySelectFromData(form, data);
          if (!codes) throw new Error("formato inválido");
          return codes;
        })
        .catch(function () {
          showBanner(
            bannerEl,
            "No pudimos cargar la lista de países (fetch). Probá modo embebido o un servidor estático.",
            false,
          );
          return null;
        });
    }

    try {
      var embedded = fillCountrySelectFromData(form, LUTENTE_EMBEDDED_COUNTRIES);
      if (!embedded) throw new Error("sin datos");
      return Promise.resolve(embedded);
    } catch (e) {
      showBanner(bannerEl, "Lista de países interna inválida.", false);
      return Promise.resolve(null);
    }
  }

  /** @param {HTMLElement} main */
  function shouldSkipPersonalApi(main) {
    var a = main.getAttribute("data-skip-personal-api");
    if (a === "true") return true;
    if (a === "false") return false;
    return window.location.protocol === "file:";
  }

  /** @param {HTMLElement} main */
  function init(main) {
    if (!main) return;

    var form = main.querySelector("#paso2-form");
    if (!(form instanceof HTMLFormElement)) return;

    var bannerEl = main.querySelector("#paso2-form-banner");
    var storedEmailDisplay = main.querySelector("#stored-email-display");
    var submitBtn = form.querySelector('[type="submit"]');
    var backBtn = main.querySelector("#btn-back-paso2");

    var endpoint = resolvePersonalEndpoint(main.getAttribute("data-endpoint-personal"));

    var nextStep =
      main.getAttribute("data-next-step") || "paso_3_seleccion_modulos.html";

    var backStep = main.getAttribute("data-back-step") || "../index.html";

    var debouncedAutosave = debounce(function () {
      writeStoredPersonalDraft(collectPersonalFields(form));
    }, 380);

    function refreshEmailChip() {
      var emailVal = readStoredEmail();
      if (!storedEmailDisplay) return;
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      if (!emailVal || !ok) {
        storedEmailDisplay.textContent = "Sin correo en memoria · volvé al paso 1";
        storedEmailDisplay.classList.add("stored-email-display--warn");
      } else {
        storedEmailDisplay.textContent = emailVal;
        storedEmailDisplay.classList.remove("stored-email-display--warn");
      }
    }

    loadCountries(main, form, bannerEl).then(function (codes) {
      allowedCountryCodes = codes;
      if (!codes) {
        if (submitBtn) submitBtn.disabled = true;
        return;
      }

      refreshEmailChip();
      applyDraftToForm(form, readStoredPersonal());

      form.addEventListener("input", debouncedAutosave);
      form.addEventListener("change", debouncedAutosave);

      if (backBtn) {
        backBtn.addEventListener("click", function () {
          window.location.href = backStep;
        });
      }

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();

        clearBanner(bannerEl);
        showFieldErrors(main, {});

        var draft = collectPersonalFields(form);
        writeStoredPersonalDraft(draft);

        var registeredEmail = readStoredEmail();

        if (!registeredEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registeredEmail)) {
          showBanner(bannerEl, "Falta el correo registrado en el paso anterior. Volvé atrás.", false);
          return;
        }

        var errs = validatePersonal(draft, allowedCountryCodes);
        if (Object.keys(errs).length) {
          showFieldErrors(main, errs);
          showBanner(bannerEl, "Revisa los datos indicados más abajo.", false);
          return;
        }

        if (submitBtn) submitBtn.disabled = true;

        if (shouldSkipPersonalApi(main)) {
          window.location.href = nextStep;
          return;
        }

        var bodyPayload = Object.assign({}, draft, { email: registeredEmail });

        fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(bodyPayload),
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
            var respData =
              typeof out.data === "object" && out.data !== null ? out.data : {};
            var nestedErr = respData.error;
            var errMsg =
              nestedErr !== null &&
              typeof nestedErr === "object" &&
              typeof nestedErr.message === "string"
                ? nestedErr.message
                : null;
            var msg =
              errMsg ||
              "No pudimos guardar los datos en el servidor.";
            showBanner(bannerEl, msg, false);
          })
          .catch(function () {
            showBanner(bannerEl, "Error de conexión al servidor.", false);
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    init(document.getElementById("onboarding-personal"));
  });
})();
