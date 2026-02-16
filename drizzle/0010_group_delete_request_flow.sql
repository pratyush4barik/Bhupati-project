CREATE TYPE "public"."group_delete_request_status" AS ENUM('NONE', 'PENDING');--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "delete_request_status" "group_delete_request_status" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "delete_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "deleted_at" timestamp;
