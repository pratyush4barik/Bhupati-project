CREATE TYPE "public"."group_member_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."internal_transfer_status" AS ENUM('PENDING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('EQUAL', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT');--> statement-breakpoint
CREATE TABLE "escrow_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "group_member_role" DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_subscription_splits" (
	"group_subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"share_amount" numeric(14, 2) NOT NULL,
	CONSTRAINT "group_subscription_splits_group_subscription_id_user_id_pk" PRIMARY KEY("group_subscription_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"split_type" "split_type" NOT NULL,
	"next_billing_date" date NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" "internal_transfer_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"service_name" text NOT NULL,
	"monthly_cost" numeric(14, 2) NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"next_billing_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ADD CONSTRAINT "group_subscription_splits_group_subscription_id_group_subscriptions_id_fk" FOREIGN KEY ("group_subscription_id") REFERENCES "public"."group_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_subscription_splits" ADD CONSTRAINT "group_subscription_splits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_subscriptions" ADD CONSTRAINT "group_subscriptions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internal_transfers_sender_created_at_idx" ON "internal_transfers" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "internal_transfers_receiver_created_at_idx" ON "internal_transfers" USING btree ("receiver_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_wallet_id_created_at_idx" ON "transactions" USING btree ("wallet_id","created_at");