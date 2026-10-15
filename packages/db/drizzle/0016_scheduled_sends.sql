CREATE TYPE "public"."scheduled_send_status" AS ENUM('scheduled', 'running', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."send_kind" AS ENUM('invite', 'reminder');--> statement-breakpoint
CREATE TABLE "scheduled_sends" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"created_by" uuid,
	"kind" "send_kind" NOT NULL,
	"target" jsonb NOT NULL,
	"channel" text DEFAULT 'auto' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "scheduled_send_status" DEFAULT 'scheduled' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_sends" ADD CONSTRAINT "scheduled_sends_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_sends" ADD CONSTRAINT "scheduled_sends_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_sends_due_idx" ON "scheduled_sends" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "scheduled_sends_event_idx" ON "scheduled_sends" USING btree ("event_id","scheduled_for");