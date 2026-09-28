CREATE TYPE "public"."issue_status_category" AS ENUM('triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled', 'duplicate');--> statement-breakpoint
ALTER TABLE "issue_status" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "issue_status" ADD COLUMN "category" "issue_status_category";--> statement-breakpoint
ALTER TABLE "issue_status" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'backlog', "is_default" = true, "sort_order" = 0 WHERE lower("name") = 'backlog';--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'unstarted', "sort_order" = 0 WHERE lower("name") = 'todo';--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'started', "sort_order" = 0 WHERE lower("name") = 'in progress';--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'completed', "sort_order" = 0 WHERE lower("name") = 'done';--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'canceled', "sort_order" = 0 WHERE lower("name") = 'canceled';--> statement-breakpoint
UPDATE "issue_status" SET "category" = 'unstarted' WHERE "category" IS NULL;--> statement-breakpoint
ALTER TABLE "issue_status" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_status_category_sort_uidx" ON "issue_status" USING btree ("category","sort_order");
