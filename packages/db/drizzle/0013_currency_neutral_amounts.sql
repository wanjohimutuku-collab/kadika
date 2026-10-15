ALTER TABLE "events" RENAME COLUMN "contribution_target_tzs" TO "contribution_target";--> statement-breakpoint
ALTER TABLE "message_log" RENAME COLUMN "cost_tzs" TO "cost";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "amount_tzs" TO "amount";--> statement-breakpoint
ALTER TABLE "pledges" RENAME COLUMN "amount_tzs" TO "amount";
