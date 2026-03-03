CREATE TABLE IF NOT EXISTS "ghost_agent_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT false NOT NULL,
  "min_usage_minutes" integer DEFAULT 60 NOT NULL,
  "free_trial_auto_cancel" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ghost_agent_rules_user_sub_idx"
  ON "ghost_agent_rules" ("user_id", "subscription_id");
