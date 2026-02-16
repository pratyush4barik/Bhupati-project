CREATE TABLE "group_member_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_subscription_id" uuid NOT NULL,
	"trigger_member_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"internal_transfer_id" uuid,
	"status" "internal_transfer_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "group_member_settlements" ADD CONSTRAINT "group_member_settlements_group_subscription_id_group_subscriptions_id_fk" FOREIGN KEY ("group_subscription_id") REFERENCES "public"."group_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_member_settlements" ADD CONSTRAINT "group_member_settlements_trigger_member_id_user_id_fk" FOREIGN KEY ("trigger_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_member_settlements" ADD CONSTRAINT "group_member_settlements_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_member_settlements" ADD CONSTRAINT "group_member_settlements_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_member_settlements" ADD CONSTRAINT "group_member_settlements_internal_transfer_id_internal_transfers_id_fk" FOREIGN KEY ("internal_transfer_id") REFERENCES "public"."internal_transfers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "group_member_settlements_group_status_idx" ON "group_member_settlements" USING btree ("group_subscription_id","status");
