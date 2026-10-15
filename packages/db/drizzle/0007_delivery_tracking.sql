ALTER TABLE "guests" ADD COLUMN "reminders_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "kind" text DEFAULT 'invite' NOT NULL;--> statement-breakpoint
CREATE INDEX "message_log_provider_msg_idx" ON "message_log" USING btree ("provider_msg_id");--> statement-breakpoint
CREATE INDEX "message_log_guest_idx" ON "message_log" USING btree ("guest_id");