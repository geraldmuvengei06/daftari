-- Add registration_state to tenants for WhatsApp onboarding flow
ALTER TABLE "public"."tenants"
  ADD COLUMN IF NOT EXISTS "owner_email" text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "registration_state" text DEFAULT 'complete' NOT NULL;

-- Existing tenants with a user_id are already complete
UPDATE "public"."tenants"
SET "registration_state" = 'complete'
WHERE "user_id" IS NOT NULL AND "registration_state" != 'complete';

-- New tenants from WhatsApp will go through: awaiting_email → awaiting_verification → complete
COMMENT ON COLUMN "public"."tenants"."registration_state"
  IS 'Onboarding state: awaiting_email, awaiting_verification, complete';
