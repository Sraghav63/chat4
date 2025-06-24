CREATE TABLE IF NOT EXISTS "FavouriteModel" (
	"userId" uuid NOT NULL,
	"modelId" varchar(128) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "FavouriteModel_userId_modelId_pk" PRIMARY KEY("userId","modelId")
);
--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "modelId" varchar(128);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FavouriteModel" ADD CONSTRAINT "FavouriteModel_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
