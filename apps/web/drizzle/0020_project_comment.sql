CREATE TYPE "public"."project_comment_mention_type" AS ENUM('user', 'issue');--> statement-breakpoint
CREATE TABLE "project_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"parent_id" text,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_comment_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"type" "project_comment_mention_type" NOT NULL,
	"user_id" text,
	"mentioned_issue_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."project_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_comment_id_project_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."project_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_mentioned_issue_id_issue_id_fk" FOREIGN KEY ("mentioned_issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_comment_project_id_idx" ON "project_comment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_comment_parent_id_idx" ON "project_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "project_comment_mention_comment_id_idx" ON "project_comment_mention" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "project_comment_mention_user_id_idx" ON "project_comment_mention" USING btree ("user_id");--> statement-breakpoint
-- Move legacy flat comments out of project_activity into project_comment
INSERT INTO "project_comment" ("id", "project_id", "parent_id", "author_id", "body", "created_at", "updated_at")
SELECT "id", "project_id", NULL, "user_id", "message", "created_at", "created_at"
FROM "project_activity"
WHERE "type" = 'comment' AND "user_id" IS NOT NULL;--> statement-breakpoint
DELETE FROM "project_activity" WHERE "type" = 'comment';
