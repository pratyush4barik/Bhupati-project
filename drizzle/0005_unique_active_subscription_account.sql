WITH ranked AS (
	SELECT
		id,
		row_number() OVER (
			PARTITION BY user_id, service_key, external_account_email
			ORDER BY created_at DESC
		) AS rn
	FROM subscriptions
	WHERE status = 'ACTIVE'
		AND service_key IS NOT NULL
		AND external_account_email IS NOT NULL
)
UPDATE subscriptions
SET status = 'INACTIVE'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_unique_active_account_service_idx" ON "subscriptions" USING btree ("user_id","service_key","external_account_email") WHERE "subscriptions"."status" = 'ACTIVE' and "subscriptions"."service_key" is not null and "subscriptions"."external_account_email" is not null;
