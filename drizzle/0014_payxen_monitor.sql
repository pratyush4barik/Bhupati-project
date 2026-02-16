CREATE TABLE "monitor_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"service_name" text NOT NULL,
	"focused_minutes" integer NOT NULL,
	"date" date NOT NULL,
	"source_event_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitor_tokens" ADD CONSTRAINT "monitor_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "monitor_tokens_token_id_idx" ON "monitor_tokens" USING btree ("token_id");
--> statement-breakpoint
CREATE INDEX "monitor_tokens_user_revoked_idx" ON "monitor_tokens" USING btree ("user_id","is_revoked");
--> statement-breakpoint
CREATE INDEX "usage_logs_user_date_idx" ON "usage_logs" USING btree ("user_id","date");
--> statement-breakpoint
CREATE INDEX "usage_logs_user_service_date_idx" ON "usage_logs" USING btree ("user_id","service_name","date");
--> statement-breakpoint
CREATE UNIQUE INDEX "usage_logs_user_event_idx" ON "usage_logs" USING btree ("user_id","source_event_id");
