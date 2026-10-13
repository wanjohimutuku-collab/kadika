CREATE TYPE "public"."invite_channel_pref" AS ENUM('whatsapp', 'sms', 'print', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."event_plan" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."global_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('created', 'queued', 'sent', 'delivered', 'opened', 'confirmed', 'declined', 'checked_in');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('sw', 'en');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'committee', 'gate');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('whatsapp', 'sms', 'print');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pledge_status" AS ENUM('pledged', 'partial', 'paid', 'waived');--> statement-breakpoint
CREATE TYPE "public"."scan_result" AS ENUM('ok', 'duplicate', 'invalid_sig', 'wrong_event', 'not_found', 'manual_ok', 'manual_denied');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"diff" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"couple_names" text NOT NULL,
	"date_start" timestamp with time zone NOT NULL,
	"venue_name" text,
	"venue_lat" double precision,
	"venue_lng" double precision,
	"venue_map_url" text,
	"dress_code" text,
	"language_default" "language" DEFAULT 'sw' NOT NULL,
	"timezone" text DEFAULT 'Africa/Dar_es_Salaam' NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"signing_key_id" uuid,
	"brand_theme" jsonb,
	"rsvp_deadline" timestamp with time zone,
	"contribution_target_tzs" integer,
	"plan" "event_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"phone_e164" text,
	"has_smartphone" boolean,
	"group_label" text,
	"party_size_allowed" integer DEFAULT 1 NOT NULL,
	"short_code" text NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"language" "language" DEFAULT 'sw' NOT NULL,
	"invite_channel_pref" "invite_channel_pref" DEFAULT 'mixed' NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'created' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"rsvp_at" timestamp with time zone,
	"rsvp_party_size" integer,
	"channel_last" "message_channel",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid NOT NULL,
	"channel" "message_channel" NOT NULL,
	"provider" text NOT NULL,
	"provider_msg_id" text,
	"status" text NOT NULL,
	"error" text,
	"cost_tzs" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pledge_id" uuid,
	"guest_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"amount_tzs" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"phone_e164" text,
	"paid_at" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid NOT NULL,
	"amount_tzs" integer NOT NULL,
	"note" text,
	"status" "pledge_status" DEFAULT 'pledged' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid,
	"scanned_by" uuid,
	"device_id" text NOT NULL,
	"result" "scan_result" NOT NULL,
	"party_admitted" integer DEFAULT 0 NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone,
	"offline" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"private_key_encrypted" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"email" text,
	"role_global" "global_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_pledge_id_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_log" ADD CONSTRAINT "scan_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_log" ADD CONSTRAINT "scan_log_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_log" ADD CONSTRAINT "scan_log_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_members_event_user_uq" ON "event_members" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_event_short_code_uq" ON "guests" USING btree ("event_id","short_code");--> statement-breakpoint
CREATE INDEX "guests_event_phone_idx" ON "guests" USING btree ("event_id","phone_e164");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitations_guest_idx" ON "invitations" USING btree ("guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_uq" ON "payments" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "scan_log_event_guest_idx" ON "scan_log" USING btree ("event_id","guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_e164_uq" ON "users" USING btree ("phone_e164");