ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'signup_started';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'signup_completed';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'event_created';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'guests_added';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'cards_sent';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'first_payment';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'gate_app_installed';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'gate_scan_session_started';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'michango_enabled';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'referral_link_clicked';
--> statement-breakpoint
ALTER TYPE "public"."analytics_event" ADD VALUE IF NOT EXISTS 'referral_signup';
--> statement-breakpoint
CREATE TYPE "public"."referral_reward_status" AS ENUM('pending_event', 'credited');
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_utm_source" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_utm_medium" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_utm_campaign" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_referrer_host" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_referral_code" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "show_referral_footer" boolean;
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"cards_awarded" integer NOT NULL,
	"status" "referral_reward_status" DEFAULT 'pending_event' NOT NULL,
	"credited_event_id" uuid,
	"credited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_credited_event_id_events_id_fk" FOREIGN KEY ("credited_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_uq" ON "users" USING btree ("referral_code");
--> statement-breakpoint
CREATE INDEX "users_referred_by_idx" ON "users" USING btree ("referred_by_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_rewards_referred_uq" ON "referral_rewards" USING btree ("referred_user_id");
--> statement-breakpoint
CREATE INDEX "referral_rewards_referrer_idx" ON "referral_rewards" USING btree ("referrer_user_id","status");
