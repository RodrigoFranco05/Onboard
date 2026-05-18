-- ===================================================
-- PREVIEW DE MIGRACIONES - 13/12/2025, 1:00:57 pm
-- ===================================================

-- ---------------------------------------------------
-- MIGRACIÓN: 20251110205245-eccomerce.js
-- COMANDOS: 18
-- ---------------------------------------------------

-- Comando 1
CREATE TABLE "menuFuncionalidadAcceso" (/* columnas definidas en el modelo */);

-- Comando 2
CREATE TABLE "rolFuncionalidadAcceso" (/* columnas definidas en el modelo */);

-- Comando 3
CREATE TABLE "sesiones" (/* columnas definidas en el modelo */);

-- Comando 4
CREATE TABLE "lote" (/* columnas definidas en el modelo */);

-- Comando 5
CREATE TABLE "loteItemUbicacion" (/* columnas definidas en el modelo */);

-- Comando 6
CREATE TABLE "loteTransaccion" (/* columnas definidas en el modelo */);

-- Comando 7
CREATE TABLE "condicionIva" (/* columnas definidas en el modelo */);

-- Comando 8
CREATE TABLE "condicionIvaEntidad" (/* columnas definidas en el modelo */);

-- Comando 9
ALTER TABLE "tipoEntidad" ADD COLUMN "verEnCaja" BOOLEAN NOT NULL DEFAULT true;

-- Comando 10
ALTER TABLE "tipoEntidad" ADD COLUMN "verEnGasto" BOOLEAN NOT NULL DEFAULT true;

-- Comando 11
ALTER TABLE "parametrosGlobales" ADD COLUMN "verEnMenu" BOOLEAN NULL DEFAULT false;

-- Comando 12
ALTER TABLE "parametrosGlobales" ADD COLUMN "descripcion" VARCHAR(255) NULL;

-- Comando 13
ALTER TABLE "item" ADD COLUMN "usaGestionLotes" BOOLEAN NOT NULL DEFAULT false;

-- Comando 14
ALTER TABLE "item" DROP COLUMN "viewweb";

-- Comando 15
ALTER TABLE "impuestoItem" ALTER COLUMN "porcentaje" TYPE double precision USING CASE WHEN "porcentaje" IS NULL OR "porcentaje" = '' THEN NULL ELSE "porcentaje"::double precision END;;

-- Comando 16
ALTER TABLE "impuestoItemTransaccion" ALTER COLUMN "porcentaje" TYPE double precision USING CASE WHEN "porcentaje" IS NULL OR "porcentaje" = '' THEN NULL ELSE "porcentaje"::double precision END;;

-- Comando 17
ALTER TABLE "impuestoItemTransaccion" ALTER COLUMN "montoTotal" TYPE double precision USING CASE WHEN "montoTotal" IS NULL OR "montoTotal" = '' THEN NULL ELSE "montoTotal"::double precision END;;

-- Comando 18
ALTER TABLE "transaccionTipoFactura" ADD COLUMN "idCondicionIva" INTEGER NOT NULL DEFAULT 4;

-- ---------------------------------------------------
-- MIGRACIÓN: 20251213122828-crear-tablas-soporte.js
-- COMANDOS: 27
-- ---------------------------------------------------

-- Comando 1
CREATE TABLE "prioridad" (/* columnas definidas en el modelo */);

-- Comando 2
CREATE TABLE "categoria" (/* columnas definidas en el modelo */);

-- Comando 3
CREATE TABLE "ticket" (/* columnas definidas en el modelo */);

-- Comando 4
CREATE TABLE "ticketMensaje" (/* columnas definidas en el modelo */);

-- Comando 5
CREATE TABLE "ticketEvento" (/* columnas definidas en el modelo */);

-- Comando 6
CREATE TABLE "ticketAdjunto" (/* columnas definidas en el modelo */);

-- Comando 7
CREATE TABLE "configSoporte" (/* columnas definidas en el modelo */);

-- Comando 8
CREATE TABLE "plantillaRespuesta" (/* columnas definidas en el modelo */);

-- Comando 9
CREATE TABLE "ticketSecuencia" (/* columnas definidas en el modelo */);

-- Comando 10
CREATE INDEX "numero" ON "ticket" ([object Object]);

-- Comando 11
CREATE INDEX "status" ON "ticket" ([object Object]);

-- Comando 12
CREATE INDEX "requester_id" ON "ticket" ([object Object]);

-- Comando 13
CREATE INDEX "agent_id" ON "ticket" ([object Object]);

-- Comando 14
CREATE INDEX "categoria_id" ON "ticket" ([object Object]);

-- Comando 15
CREATE INDEX "prioridad_id" ON "ticket" ([object Object]);

-- Comando 16
CREATE INDEX "tipo" ON "ticket" ([object Object]);

-- Comando 17
CREATE INDEX "first_response_violated,resolution_violated" ON "ticket" ([object Object]);

-- Comando 18
CREATE INDEX "ticket_id" ON "ticketMensaje" ([object Object]);

-- Comando 19
CREATE INDEX "created_at" ON "ticketMensaje" ([object Object]);

-- Comando 20
CREATE INDEX "ticket_id,created_at" ON "ticketEvento" ([object Object]);

-- Comando 21
CREATE INDEX "ticket_id" ON "ticketAdjunto" ([object Object]);

-- Comando 22
CREATE INDEX "activa" ON "categoria" ([object Object]);

-- Comando 23
CREATE INDEX "activa" ON "prioridad" ([object Object]);

-- Comando 24
ALTER TABLE ticket ADD CONSTRAINT check_ticket_tipo CHECK (tipo IN ('incidencia', 'solicitud'));;

-- Comando 25
ALTER TABLE ticket ADD CONSTRAINT check_ticket_status CHECK (status IN ('nuevo', 'en_progreso', 'esperando_cliente', 'en_espera', 'pendiente_validacion', 'resuelto', 'cerrado'));;

-- Comando 26
CREATE INDEX idx_ticket_search ON ticket USING GIN(to_tsvector('spanish', titulo || ' ' || COALESCE(descripcion, '')));;

-- Comando 27
CREATE INDEX idx_ticket_mensaje_search ON "ticketMensaje" USING GIN(to_tsvector('spanish', content));;

