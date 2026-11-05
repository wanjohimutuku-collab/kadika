CREATE TYPE "public"."event_product" AS ENUM('cards', 'sms');--> statement-breakpoint
CREATE TYPE "public"."sms_campaign_status" AS ENUM('scheduled', 'running', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "sms_campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"created_by" uuid,
	"body" text NOT NULL,
	"target" jsonb NOT NULL,
	"status" "sms_campaign_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"segments" integer DEFAULT 1 NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "product" "event_product" DEFAULT 'cards' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "segments" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_campaigns_due_idx" ON "sms_campaigns" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "sms_campaigns_event_idx" ON "sms_campaigns" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "message_log_campaign_idx" ON "message_log" USING btree ("campaign_id");