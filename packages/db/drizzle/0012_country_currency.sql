CREATE TYPE "public"."country" AS ENUM('TZ', 'KE');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('TZS', 'KES');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country" "country" DEFAULT 'TZ' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "currency" "currency" DEFAULT 'TZS' NOT NULL;