ALTER TABLE "Message_v2" ADD COLUMN "cost" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "branchedFromId";