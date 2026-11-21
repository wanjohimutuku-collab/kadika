ALTER TABLE "brand_settings" ADD COLUMN "favicon_mime" text;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "favicon_data" text;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "favicon_version" integer DEFAULT 0 NOT NULL;