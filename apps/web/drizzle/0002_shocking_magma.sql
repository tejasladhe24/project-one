ALTER TABLE "project" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "lead" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "target_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "issues_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_lead_user_id_fk" FOREIGN KEY ("lead") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;