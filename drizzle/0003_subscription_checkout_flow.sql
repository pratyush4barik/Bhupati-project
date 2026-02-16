CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_key" text NOT NULL,
	"service_name" text NOT NULL,
	"category" text NOT NULL,
	"plan_name" text NOT NULL,
	"duration_months" integer NOT NULL,
	"members" integer NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_service_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"service_key" text NOT NULL,
	"service_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"accepted_terms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "service_key" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_name" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_duration_months" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_members" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "base_price" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "gst_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "total_price" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "external_account_email" text;--> statement-breakpoint
ALTER TABLE "subscription_service_accounts" ADD CONSTRAINT "subscription_service_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_plans_service_plan_idx" ON "subscription_plans" USING btree ("service_key","plan_name");--> statement-breakpoint
CREATE INDEX "subscription_plans_service_category_idx" ON "subscription_plans" USING btree ("category","service_key");--> statement-breakpoint
CREATE INDEX "subscription_accounts_user_service_email_idx" ON "subscription_service_accounts" USING btree ("user_id","service_key","email");
--> statement-breakpoint
INSERT INTO "subscription_plans" (
	"service_key",
	"service_name",
	"category",
	"plan_name",
	"duration_months",
	"members",
	"price"
) VALUES
	('netflix', 'Netflix', 'Streaming', 'Mobile', 1, 1, 149.00),
	('netflix', 'Netflix', 'Streaming', 'Standard', 3, 2, 499.00),
	('netflix', 'Netflix', 'Streaming', 'Premium', 12, 4, 1799.00),
	('amazon-prime', 'Amazon Prime', 'Streaming', 'Monthly', 1, 1, 299.00),
	('amazon-prime', 'Amazon Prime', 'Streaming', 'Quarterly', 3, 2, 599.00),
	('amazon-prime', 'Amazon Prime', 'Streaming', 'Yearly', 12, 4, 1499.00),
	('disney-plus', 'Disney+', 'Streaming', 'Super', 1, 1, 199.00),
	('disney-plus', 'Disney+', 'Streaming', 'Premium', 3, 2, 499.00),
	('disney-plus', 'Disney+', 'Streaming', 'Premium Annual', 12, 4, 1499.00),
	('hbo-max', 'HBO Max', 'Streaming', 'Basic', 1, 1, 349.00),
	('hbo-max', 'HBO Max', 'Streaming', 'Standard', 3, 2, 899.00),
	('hbo-max', 'HBO Max', 'Streaming', 'Ultimate', 12, 4, 2499.00),
	('apple-tv-plus', 'Apple TV+', 'Streaming', 'Individual', 1, 1, 99.00),
	('apple-tv-plus', 'Apple TV+', 'Streaming', 'Family', 3, 5, 249.00),
	('apple-tv-plus', 'Apple TV+', 'Streaming', 'Annual', 12, 5, 899.00),
	('spotify', 'Spotify', 'Music', 'Mini', 1, 1, 79.00),
	('spotify', 'Spotify', 'Music', 'Duo', 3, 2, 399.00),
	('spotify', 'Spotify', 'Music', 'Family', 12, 6, 1499.00),
	('apple-music', 'Apple Music', 'Music', 'Individual', 1, 1, 99.00),
	('apple-music', 'Apple Music', 'Music', 'Family', 3, 6, 299.00),
	('apple-music', 'Apple Music', 'Music', 'Annual', 12, 6, 999.00),
	('youtube-music', 'YouTube Music', 'Music', 'Individual', 1, 1, 119.00),
	('youtube-music', 'YouTube Music', 'Music', 'Family', 3, 5, 349.00),
	('youtube-music', 'YouTube Music', 'Music', 'Annual', 12, 5, 1299.00),
	('gaana', 'Gaana', 'Music', 'Plus Monthly', 1, 1, 99.00),
	('gaana', 'Gaana', 'Music', 'Plus Quarterly', 3, 2, 249.00),
	('gaana', 'Gaana', 'Music', 'Plus Annual', 12, 4, 699.00),
	('jiosaavn', 'JioSaavn', 'Music', 'Pro Monthly', 1, 1, 99.00),
	('jiosaavn', 'JioSaavn', 'Music', 'Pro Quarterly', 3, 2, 269.00),
	('jiosaavn', 'JioSaavn', 'Music', 'Pro Annual', 12, 4, 799.00),
	('google-one', 'Google One', 'Productivity', 'Basic 100 GB', 1, 1, 130.00),
	('google-one', 'Google One', 'Productivity', 'Standard 200 GB', 3, 2, 390.00),
	('google-one', 'Google One', 'Productivity', 'Premium 2 TB', 12, 5, 3900.00),
	('microsoft-365', 'Microsoft 365', 'Productivity', 'Personal', 1, 1, 489.00),
	('microsoft-365', 'Microsoft 365', 'Productivity', 'Family', 3, 6, 1299.00),
	('microsoft-365', 'Microsoft 365', 'Productivity', 'Family Annual', 12, 6, 4899.00),
	('canva-pro', 'Canva Pro', 'Productivity', 'Creator', 1, 1, 499.00),
	('canva-pro', 'Canva Pro', 'Productivity', 'Team Starter', 3, 3, 1299.00),
	('canva-pro', 'Canva Pro', 'Productivity', 'Team Annual', 12, 5, 4999.00),
	('notion-pro', 'Notion Pro', 'Productivity', 'Plus', 1, 1, 349.00),
	('notion-pro', 'Notion Pro', 'Productivity', 'Business', 3, 5, 999.00),
	('notion-pro', 'Notion Pro', 'Productivity', 'Business Annual', 12, 10, 3499.00),
	('chatgpt-plus', 'ChatGPT Plus (simulated)', 'Productivity', 'Solo', 1, 1, 1999.00),
	('chatgpt-plus', 'ChatGPT Plus (simulated)', 'Productivity', 'Duo', 3, 2, 5699.00),
	('chatgpt-plus', 'ChatGPT Plus (simulated)', 'Productivity', 'Team', 12, 5, 21999.00),
	('xbox-game-pass', 'Xbox Game Pass', 'Gaming', 'Core', 1, 1, 349.00),
	('xbox-game-pass', 'Xbox Game Pass', 'Gaming', 'Ultimate', 3, 2, 999.00),
	('xbox-game-pass', 'Xbox Game Pass', 'Gaming', 'Ultimate Annual', 12, 4, 3499.00),
	('playstation-plus', 'PlayStation Plus', 'Gaming', 'Essential', 1, 1, 499.00),
	('playstation-plus', 'PlayStation Plus', 'Gaming', 'Extra', 3, 2, 1299.00),
	('playstation-plus', 'PlayStation Plus', 'Gaming', 'Deluxe Annual', 12, 4, 4999.00),
	('steam-wallet', 'Steam Wallet', 'Gaming', 'Starter Credits', 1, 1, 500.00),
	('steam-wallet', 'Steam Wallet', 'Gaming', 'Gamer Credits', 3, 2, 1500.00),
	('steam-wallet', 'Steam Wallet', 'Gaming', 'Pro Credits', 12, 4, 6000.00),
	('coursera-plus', 'Coursera Plus', 'Learning', 'Monthly', 1, 1, 3999.00),
	('coursera-plus', 'Coursera Plus', 'Learning', 'Quarterly', 3, 2, 9999.00),
	('coursera-plus', 'Coursera Plus', 'Learning', 'Annual', 12, 5, 27999.00),
	('udemy-pro', 'Udemy Pro', 'Learning', 'Monthly', 1, 1, 999.00),
	('udemy-pro', 'Udemy Pro', 'Learning', 'Quarterly', 3, 2, 2499.00),
	('udemy-pro', 'Udemy Pro', 'Learning', 'Annual', 12, 5, 8999.00),
	('masterclass', 'MasterClass', 'Learning', 'Individual', 1, 1, 999.00),
	('masterclass', 'MasterClass', 'Learning', 'Duo', 3, 2, 2499.00),
	('masterclass', 'MasterClass', 'Learning', 'Family Annual', 12, 6, 7999.00);
