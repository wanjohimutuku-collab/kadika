CREATE TABLE "brand_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"primary" text,
	"accent" text,
	"font_body" text DEFAULT 'system' NOT NULL,
	"font_display" text DEFAULT 'elegant' NOT NULL,
	"logo_mime" text,
	"logo_data" text,
	"logo_version" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"route" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"config_enc" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;