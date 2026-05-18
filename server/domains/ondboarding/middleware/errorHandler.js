const { ZodError } = require("zod");

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    }
  });
}

function errorHandler(error, _req, res, _next) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos inválidos",
        details: error.issues
      }
    });
  }

  const status = error.statusCode || error.status || 500;
  const code = error.code || "INTERNAL_ERROR";
  const message = status >= 500 ? "Error interno del servidor" : error.message;

  if (status >= 500) {
    console.error("[error]", error);
  }

  return res.status(status).json({
    ok: false,
    error: {
      code,
      message
    }
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
