/**
 * Paso 1 — email: lista de verificados, redirección o envío de confirmación.
 */
(function () {
  "use strict";

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

  function normalizeEmail(raw) {
    return (raw || "").trim();
  }

  /** @returns {boolean} */
  function isValidEmailFormat(raw) {
    var s = normalizeEmail(raw);
    if (!s.includes("@")) return false;
    var parts = s.split("@");
    if (parts.length < 2) return false;
    var local = parts[0];
    var domainPart = parts.slice(1).join("@");
    if (!local.length || !domainPart.length) return false;
    if (!domainPart.includes(".")) return false;
    return true;
  }

  /** Heurística UX; la seguridad real está en el servidor. */
  /** @returns {boolean} true si el texto parece sospechoso */
  function looksLikeSqlInjectionAttempt(raw) {
    var s = normalizeEmail(raw);
    if (!s) return false;
    var lower = s.toLowerCase();
    var patterns = [
      /--(\s|$)/,
      /;\s*(drop|delete|insert|update|union|select)\b/i,
      /(\b)(or|and)\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
      /(\b)(or|and)\b\s+['"].*['"]\s*=\s*['"]/i,
      /\bexec(\s|\()/i,
      /\bxp_/i,
      /\/\*|\*\//,
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(s) || patterns[i].test(lower)) return true;
    }
    return false;
  }

  /** @param {unknown} emails @param {string} normalizedEmail */
  function emailEstaEnListaConfirmados(normalizedEmail, emails) {
    if (!Array.isArray(emails)) return false;
    var want = normalizedEmail.trim().toLowerCase();
    if (!want) return false;
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i]).trim().toLowerCase() === want) return true;
    }
    return false;
  }

  function safeParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function errorMessageFromPayload(data) {
    if (!data || typeof data !== "object") return null;
    var o = /** @type {Record<string, unknown>} */ (data);
    if (typeof o.message === "string") return o.message;
    var err = o.error;
    if (err && typeof err === "object" && typeof err.message === "string") {
      return err.message;
    }
    return null;
  }

  /** @param {Response} res @param {unknown} data */
  function getErrorMessage(res, data) {
    return (
      errorMessageFromPayload(data) ||
      ("Error " + res.status + ": no se pudo completar la solicitud.")
    );
  }

  function getElements() {
    var root = document.getElementById("onboarding-email");
    var form = document.getElementById("email-step-form");
    var input = document.getElementById("email");
    var submitBtn = form ? form.querySelector('[type="button"]') : null;
    var fieldErrorEl = document.getElementById("email-field-error");
    var bannerEl = document.getElementById("email-step-banner");
    return { root, form, input, submitBtn, fieldErrorEl, bannerEl };
  }

  function clearBanner(bannerEl) {
    if (!bannerEl) return;
    bannerEl.hidden = true;
    bannerEl.textContent = "";
    bannerEl.classList.remove("notice--confirm");
    bannerEl.classList.remove("notice--error");
  }

  /** @param {'confirm'|'error'} kind */
  function showBanner(bannerEl, msg, kind) {
    if (!bannerEl) return;
    bannerEl.hidden = false;
    bannerEl.textContent = msg;
    bannerEl.classList.toggle("notice--confirm", kind === "confirm");
    bannerEl.classList.toggle("notice--error", kind === "error");
    bannerEl.focus();
  }

  function setFieldError(fieldErrorEl, input, msg) {
    if (!fieldErrorEl || !input) return;
    fieldErrorEl.textContent = msg || "";
    input.classList.toggle("input-wrap__field--error", !!msg);
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function setSubmitting(submitBtn, busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
  }

  function redireccionPaso2(email) {
    var normalized = normalizeEmail(email);
    try {
      localStorage.setItem("userEmail", normalized);
    } catch (e) {
      /* ignore */
    }
    window.location.href = "pages/paso_2_datos_personales.html";
  }

  async function generacionEmailConfirmacion(email, bannerEl) {
    var url = apiUrl("/api/onboard/sendEmailConfirmation");
    var res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    var text = await res.text();
    var data = text ? safeParse(text) : null;

    if (res.ok) {
      var msg =
        (data && typeof data === "object" && typeof data.message === "string" && data.message) ||
        "Te enviamos un correo de confirmación. Revisá tu bandeja de entrada (y spam) antes de continuar.";
      showBanner(bannerEl, msg, "confirm");
      return;
    }

    showBanner(bannerEl, getErrorMessage(res, data), "error");
  }

  async function emailVerification() {
    var el = getElements();
    var input = el.input;
    var submitBtn = el.submitBtn;
    var fieldErrorEl = el.fieldErrorEl;
    var bannerEl = el.bannerEl;

    if (!input || !submitBtn) return;

    var email = input.value ? input.value : "";

    clearBanner(bannerEl);
    setFieldError(fieldErrorEl, input, "");

    if (!isValidEmailFormat(email)) {
      setFieldError(
        fieldErrorEl,
        input,
        "Introduce una dirección de correo válida (debe incluir @ y un dominio con punto).",
      );
      return;
    }

    if (looksLikeSqlInjectionAttempt(email)) {
      setFieldError(
        fieldErrorEl,
        input,
        "El formato del correo no es válido. Eliminá caracteres o símbolos no permitidos.",
      );
      return;
    }

    var normalized = normalizeEmail(email);
    setSubmitting(submitBtn, true);
    try {
      var checkUrl = apiUrl("/api/onboard/getemailsconfirmed");
      var checkRes = await fetch(checkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      var checkText = await checkRes.text();
      var checkData = checkText ? safeParse(checkText) : null;

      if (!checkRes.ok) {
        showBanner(bannerEl, getErrorMessage(checkRes, checkData), "error");
        return;
      }

      var status = checkData && checkData.status;

      if (status === "VERIFIED") {
        redireccionPaso2(normalized);
        return;
      }

      if (status === "TENANT_ALREADY_CREATED") {
        showBanner(bannerEl, checkData.message || "Este correo ya tiene un tenant creado.", "error");
        return;
      }

      if (status === "PENDING_VERIFICATION") {
        showBanner(bannerEl, "Ya te enviamos un correo de verificación. Revisá tu bandeja de entrada (y spam).", "confirm");
        return;
      }

      // NOT_FOUND: enviar mail de confirmación
      await generacionEmailConfirmacion(normalized, bannerEl);
    } catch (e) {
      showBanner(
        bannerEl,
        "Error de conexión. Comprueba tu red o intenta más tarde.",
        "error",
      );
    } finally {
      setSubmitting(submitBtn, false);
    }
  }

  window.emailVerification = emailVerification;
})();
