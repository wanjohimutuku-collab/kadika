ALTER TABLE "events" ADD COLUMN "pledges_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "method" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pledges_guest_uq" ON "pledges" USING btree ("guest_id");