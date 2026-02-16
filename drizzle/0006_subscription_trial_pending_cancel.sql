ALTER TYPE "public"."subscription_status" ADD VALUE 'PENDING' BEFORE 'INACTIVE';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'CANCELLED' BEFORE 'INACTIVE';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "free_trial_taken" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "free_trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_since" timestamp;