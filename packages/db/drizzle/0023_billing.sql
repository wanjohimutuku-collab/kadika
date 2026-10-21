CREATE TYPE "public"."purchase_kind" AS ENUM('bundle', 'pack', 'grant');--> statement-breakpoint
CREATE TYPE "public"."purchase_method" AS ENUM('mobile', 'manual', 'grant');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "event_purchases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "purchase_kind" NOT NULL,
	"item_key" text,
	"label" text NOT NULL,
	"cards" integer DEFAULT 0 NOT NULL,
	"sms" integer DEFAULT 0 NOT NULL,
	"whatsapp" integer DEFAULT 0 NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" "currency" NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"method" "purchase_method" NOT NULL,
	"provider" text,
	"provider_ref" text,
	"provider_txn" text,
	"phone_e164" text,
	"note" text,
	"requested_by" uuid,
	"confirmed_by" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_purchases" ADD CONSTRAINT "event_purchases_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_purchases" ADD CONSTRAINT "event_purchases_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_purchases" ADD CONSTRAINT "event_purchases_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD CONSTRAINT "pricing_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_purchases_event_idx" ON "event_purchases" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "event_purchases_status_idx" ON "event_purchases" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_purchases_ref_uq" ON "event_purchases" USING btree ("provider_ref");