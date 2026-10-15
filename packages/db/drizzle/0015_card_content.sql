CREATE TYPE "public"."card_kind" AS ENUM('invitation', 'contribution');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "card_content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "card_kind" "card_kind" DEFAULT 'invitation' NOT NULL;