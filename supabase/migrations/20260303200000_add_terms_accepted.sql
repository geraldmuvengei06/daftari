-- Add terms_accepted_at column to tenants table
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;

-- Add owner_email column if it doesn't exist (for completeness)
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "owner_email" text;
