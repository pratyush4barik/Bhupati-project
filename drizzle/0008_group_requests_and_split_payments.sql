CREATE TYPE "public"."group_split_payment_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'PAID');--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "external_account_password" text;--> statement-breakpoint
ALTER TABLE "subscription_service_accounts" ADD COLUMN "password_plain" text;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "service_key" text;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "plan_name" text;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "external_account_email" text;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD COLUMN "external_account_password" text;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ADD COLUMN "share_percentage" integer;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ADD COLUMN "payment_status" "group_split_payment_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD CONSTRAINT "group_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "group_subscription_splits" SET "share_percentage" = 0 WHERE "share_percentage" IS NULL;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ALTER COLUMN "share_percentage" SET NOT NULL;
