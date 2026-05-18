-- ===================================================
-- PREVIEW DE MIGRACIONES - 03/03/2026, 1:39:57 pm
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

-- ---------------------------------------------------
-- MIGRACIÓN: 20251214000000-agregar-visualizacion-estadisticas-config.js
-- COMANDOS: 2
-- ---------------------------------------------------

-- Comando 1
SELECT pk.constraint_type as "Constraint",c.column_name as "Field", c.column_default as "Default",c.is_nullable as "Null", (CASE WHEN c.udt_name = 'hstore' THEN c.udt_name ELSE c.data_type END) || (CASE WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length || ')' ELSE '' END) as "Type", (SELECT array_agg(e.enumlabel) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON t.oid=e.enumtypid WHERE t.typname=c.udt_name) AS "special", (SELECT pgd.description FROM pg_catalog.pg_statio_all_tables AS st INNER JOIN pg_catalog.pg_description pgd on (pgd.objoid=st.relid) WHERE c.ordinal_position=pgd.objsubid AND c.table_name=st.relname) AS "Comment" FROM information_schema.columns c LEFT JOIN (SELECT tc.table_schema, tc.table_name, cu.column_name, tc.constraint_type FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.KEY_COLUMN_USAGE cu ON tc.table_schema=cu.table_schema and tc.table_name=cu.table_name and tc.constraint_name=cu.constraint_name and tc.constraint_type='PRIMARY KEY') pk ON pk.table_schema=c.table_schema AND pk.table_name=c.table_name AND pk.column_name=c.column_name WHERE c.table_name = 'configSoporte' AND c.table_schema = 'public';

-- Comando 2
ALTER TABLE "configSoporte" ADD COLUMN "visualizacion_estadisticas" VARCHAR(255) NULL DEFAULT solo_agentes;

-- ---------------------------------------------------
-- MIGRACIÓN: 20260113192516-sistema soporte.js
-- COMANDOS: 10
-- ---------------------------------------------------

-- Comando 1
DROP TABLE IF EXISTS "soporte_TicketSecuencia" CASCADE; DROP TABLE IF EXISTS "soporte_TicketAdjunto" CASCADE; DROP TABLE IF EXISTS "soporte_TicketEvento" CASCADE; DROP TABLE IF EXISTS "soporte_TicketMensaje" CASCADE; DROP TABLE IF EXISTS "soporte_Ticket" CASCADE; DROP TABLE IF EXISTS "soporte_PlantillaRespuesta" CASCADE; DROP TABLE IF EXISTS "soporte_ConfigSoporte" CASCADE; DROP TABLE IF EXISTS "soporte_Categoria" CASCADE; DROP TABLE IF EXISTS "soporte_Prioridad" CASCADE;;

-- Comando 2
CREATE TABLE "soporte_Prioridad" (/* columnas definidas en el modelo */);

-- Comando 3
CREATE TABLE "soporte_Categoria" (/* columnas definidas en el modelo */);

-- Comando 4
CREATE TABLE "soporte_ConfigSoporte" (/* columnas definidas en el modelo */);

-- Comando 5
CREATE TABLE "soporte_PlantillaRespuesta" (/* columnas definidas en el modelo */);

-- Comando 6
CREATE TABLE "soporte_Ticket" (/* columnas definidas en el modelo */);

-- Comando 7
CREATE TABLE "soporte_TicketMensaje" (/* columnas definidas en el modelo */);

-- Comando 8
CREATE TABLE "soporte_TicketEvento" (/* columnas definidas en el modelo */);

-- Comando 9
CREATE TABLE "soporte_TicketAdjunto" (/* columnas definidas en el modelo */);

-- Comando 10
CREATE TABLE "soporte_TicketSecuencia" (/* columnas definidas en el modelo */);

-- ---------------------------------------------------
-- MIGRACIÓN: 20260116220832-renombrar-path-a-archivo.js
-- COMANDOS: 0
-- ---------------------------------------------------

-- ---------------------------------------------------
-- MIGRACIÓN: 20260211125520-entidadAtributoClasificacion.js
-- COMANDOS: 0
-- ---------------------------------------------------

-- ---------------------------------------------------
-- MIGRACIÓN: 20260303163730-cambios 3-3.js
-- COMANDOS: 3
-- ---------------------------------------------------

-- Comando 1
ALTER TABLE "lote" ALTER COLUMN "fechaFabricacion" TYPE TIMESTAMP NULL;

-- Comando 2
ALTER TABLE "lote" ALTER COLUMN "fechaVencimiento" TYPE TIMESTAMP NULL;

-- Comando 3
ALTER TABLE "transaccionTipoFactura" ALTER COLUMN "idCondicionIva" TYPE INTEGER NOT NULL;

