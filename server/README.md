# Onboarding Backend (Node + Express + Postgres)

Backend simple para el flujo de onboarding de Lutente:

- Solicitar y verificar correo.
- Guardar datos personales.
- Guardar seleccion de modulos y estado.
- Ejecutar script de generacion de tenant.
- Enviar mails de verificacion y credenciales.
- Persistencia en una sola tabla: `public.registro`.

## Estructura

```text
server/
  server.js
  config/
  routes/
  controllers/
  models/
  services/
  middleware/
  scripts/
  sql/
```

## 1) Instalar dependencias

```bash
cd server
pnpm install
```

## 2) Variables de entorno

```bash
cp .env.example .env
```

Completar al menos:

- `DATABASE_URL`
- `CORS_ORIGIN`
- `APP_BASE_URL`

SMTP es opcional. Si no se configura, el envio de mails queda en modo mock (log por consola).

## 3) Crear/actualizar esquema SQL

Ejecutar el contenido de `sql/init.sql` sobre la base `onboarding`.

Opcional:

- Si quieres dejar estrictamente una sola tabla, ejecutar `sql/cleanup_legacy_tables.sql`
  para eliminar tablas viejas (`email_verifications`, `tenant_jobs`).

## 4) Levantar servidor

```bash
pnpm dev
```

## Endpoints

- `GET /api/onboarding/health`
- `POST /api/onboarding/email/check`
- `POST /api/onboarding/email/request`
- `GET /api/onboarding/email/verify?token=...` (redirección 302 a `/api/onboard/email/verify`; compatibilidad con enlaces antiguos)
- `POST /api/onboard/getemailsconfirmed`
- `POST /api/onboard/sendEmailConfirmation`
- `GET /api/onboard/email/verify?token=...` (verificación de correo; enlace que envía el mail)
- `POST /api/onboard/personal`
- `POST /api/onboard/modulos`
- `POST /api/onboarding/submissions`
- `GET /api/onboarding/submissions?email=...`
- `GET /api/onboarding/submissions/:id`
- `POST /api/onboarding/submissions/:id/generate-tenant`
