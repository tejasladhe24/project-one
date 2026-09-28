ALTER TABLE "team" ADD COLUMN "cycles_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "cycle_duration_weeks" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "cycle_start_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "cycles_origin" timestamp;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "cycle_number" integer;--> statement-breakpoint
CREATE INDEX "issue_team_cycle_number_idx" ON "issue" USING btree ("team_id","cycle_number");
