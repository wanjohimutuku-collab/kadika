CREATE TABLE "signin_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"config_enc" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signin_settings" ADD CONSTRAINT "signin_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;