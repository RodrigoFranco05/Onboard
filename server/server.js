require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const sequelize = require("./config/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();
const port = Number(process.env.PORT || 4000);

/** Orígenes permitidos (cabecera Origin: deben coincidir al carácter, ej. http://localhost:5500). */
function parseAllowedOrigins(raw) {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry === "*") return "*";
      if (/^https?:\/\//i.test(entry)) return entry;
      return `http://${entry}`;
    });
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // Requerido cuando el cliente usa fetch(..., { credentials: "include" })
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error("Origen no permitido por CORS"));
    }
  })
);

app.get("/api-config.js", (_req, res) => {
  const base = process.env.PUBLIC_API_BASE ?? "";
  res.type("application/javascript");
  res.set("Cache-Control", "no-store");
  res.send(`window.__LUTENTE_API_BASE__ = ${JSON.stringify(base)};\n`);
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "onboarding-server",
    docs: "/api/onboarding/health"
  });
});

app.use("/api", routes);

app.use(express.static(path.join(__dirname, "..", "client")));

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await sequelize.authenticate();
  console.log("[db] conexión OK");
  app.listen(port, () => {
    console.log(`[onboarding-server] escuchando en puerto ${port}`);
  });
}

startServer().catch((error) => {
  console.error("[onboarding-server] error al iniciar", error);
  process.exit(1);
});
