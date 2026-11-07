CREATE TYPE "public"."analytics_device" AS ENUM('mobile', 'tablet', 'desktop');--> statement-breakpoint
CREATE TYPE "public"."analytics_event" AS ENUM('page_view', 'start_registration', 'complete_registration', 'create_event', 'complete_event_setup', 'create_invitation', 'share_invitation', 'add_guest', 'receive_rsvp', 'record_contribution', 'scan_qr', 'complete_checkin');--> statement-breakpoint
CREATE TYPE "public"."analytics_source" AS ENUM('direct', 'search', 'social', 'referral');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" "analytics_event" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_hash" text NOT NULL,
	"market" text NOT NULL,
	"locale" text NOT NULL,
	"edition" text NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"device" "analytics_device" NOT NULL,
	"source" "analytics_source" DEFAULT 'direct' NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_name_time_idx" ON "analytics_events" USING btree ("name","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_time_idx" ON "analytics_events" USING btree ("occurred_at");