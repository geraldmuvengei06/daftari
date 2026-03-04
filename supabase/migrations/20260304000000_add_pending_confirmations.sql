-- Pending confirmations for fuzzy name matching
CREATE TABLE IF NOT EXISTS "public"."pending_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "incoming_name" "text" NOT NULL,
    "matched_customer_id" "uuid" NOT NULL,
    "matched_customer_name" "text" NOT NULL,
    "original_intent" "jsonb" NOT NULL,
    "raw_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + interval '1 hour') NOT NULL
);

ALTER TABLE "public"."pending_confirmations" OWNER TO "postgres";

ALTER TABLE ONLY "public"."pending_confirmations"
    ADD CONSTRAINT "pending_confirmations_pkey" PRIMARY KEY ("id");

-- One pending confirmation per tenant at a time
CREATE UNIQUE INDEX "idx_pending_confirmations_tenant" ON "public"."pending_confirmations" USING "btree" ("tenant_id");

CREATE INDEX "idx_pending_confirmations_expires" ON "public"."pending_confirmations" USING "btree" ("expires_at");

ALTER TABLE ONLY "public"."pending_confirmations"
    ADD CONSTRAINT "pending_confirmations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."pending_confirmations"
    ADD CONSTRAINT "pending_confirmations_matched_customer_id_fkey" FOREIGN KEY ("matched_customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;

ALTER TABLE "public"."pending_confirmations" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."pending_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."pending_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_confirmations" TO "service_role";
