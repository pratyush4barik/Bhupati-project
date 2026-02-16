DO $$
BEGIN
  CREATE TYPE "wallet_money_request_status" AS ENUM('PENDING', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "wallet_money_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "receiver_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "amount" numeric(14, 2) NOT NULL,
  "status" "wallet_money_request_status" DEFAULT 'PENDING' NOT NULL,
  "internal_transfer_id" uuid REFERENCES "internal_transfers"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "paid_at" timestamp
);

CREATE INDEX IF NOT EXISTS "wallet_money_requests_receiver_status_created_at_idx"
  ON "wallet_money_requests" ("receiver_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "wallet_money_requests_requester_created_at_idx"
  ON "wallet_money_requests" ("requester_id", "created_at");
