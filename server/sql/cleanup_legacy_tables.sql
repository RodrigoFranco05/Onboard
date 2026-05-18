-- Ejecutar solo si confirmas que no necesitas historico en estas tablas.
-- Este script limpia tablas que quedaron de una version anterior del backend.

DROP TABLE IF EXISTS public.tenant_jobs;
DROP TABLE IF EXISTS public.email_verifications;
