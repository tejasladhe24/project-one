ALTER TYPE "public"."inbox_item_type" ADD VALUE IF NOT EXISTS 'team';--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_notification_team_id_idx" ON "inbox_notification" USING btree ("team_id");
