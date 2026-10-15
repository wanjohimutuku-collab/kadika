CREATE TABLE "gate_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"link_id" uuid,
	"device_id" text NOT NULL,
	"name" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"code" text NOT NULL,
	"pin_hash" text NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_log" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "scan_log" ADD COLUMN "reported_result" "scan_result";--> statement-breakpoint
ALTER TABLE "scan_log" ADD COLUMN "override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_log" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "gate_devices" ADD CONSTRAINT "gate_devices_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_devices" ADD CONSTRAINT "gate_devices_link_id_gate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."gate_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_links" ADD CONSTRAINT "gate_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_links" ADD CONSTRAINT "gate_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gate_devices_event_device_uq" ON "gate_devices" USING btree ("event_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gate_links_code_uq" ON "gate_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gate_links_event_idx" ON "gate_links" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_log_event_client_uq" ON "scan_log" USING btree ("event_id","client_id");