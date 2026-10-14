CREATE TABLE "retired_card_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retired_card_tokens" ADD CONSTRAINT "retired_card_tokens_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "retired_card_tokens_hash_uq" ON "retired_card_tokens" USING btree ("token_hash");