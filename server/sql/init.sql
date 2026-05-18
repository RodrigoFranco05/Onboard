-- Tabla unica del onboarding: public.registro
-- Se agregan campos necesarios para verificacion de email y estado del flujo.

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS modulos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pending_tenant';

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS verification_token text NULL;

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz NULL;

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS verification_sent_at timestamptz NULL;

ALTER TABLE public.registro
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS registro_correo_uq
  ON public.registro (correo);

CREATE UNIQUE INDEX IF NOT EXISTS registro_verification_token_uq
  ON public.registro (verification_token)
  WHERE verification_token IS NOT NULL;
