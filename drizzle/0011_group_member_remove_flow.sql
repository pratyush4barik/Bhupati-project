ALTER TYPE "group_split_payment_status" ADD VALUE IF NOT EXISTS 'REMOVED';

DO $$
BEGIN
  CREATE TYPE "group_member_removal_status" AS ENUM('NONE', 'PENDING', 'REMOVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "group_subscription_splits"
  ADD COLUMN IF NOT EXISTS "removal_request_status" "group_member_removal_status" DEFAULT 'NONE' NOT NULL,
  ADD COLUMN IF NOT EXISTS "removal_requested_at" timestamp,
  ADD COLUMN IF NOT EXISTS "removed_at" timestamp;
