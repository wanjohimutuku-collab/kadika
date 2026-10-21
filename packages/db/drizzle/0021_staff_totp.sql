ALTER TABLE "refresh_tokens" ADD COLUMN "mfa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_totp_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_totp_enrolled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_totp_last_step" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_totp_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_totp_locked_until" timestamp with time zone;