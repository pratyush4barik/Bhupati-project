DO $$
BEGIN
  CREATE TYPE "notification_type" AS ENUM('GROUP_REQUEST_ACCEPTED', 'GROUP_REQUEST_REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_read_created_at_idx"
  ON "notifications" ("user_id", "is_read", "created_at");
