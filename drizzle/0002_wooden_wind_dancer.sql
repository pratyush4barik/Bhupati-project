CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESSFUL');--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" "transaction_status" DEFAULT 'SUCCESSFUL' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ADD COLUMN "px_id" text DEFAULT concat('px-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_px_id_unique" UNIQUE("px_id");