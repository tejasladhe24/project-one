CREATE TYPE "public"."issue_comment_mention_type" AS ENUM('user', 'issue');--> statement-breakpoint
CREATE TABLE "issue_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"parent_id" text,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "issue_comment_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"type" "issue_comment_mention_type" NOT NULL,
	"user_id" text,
	"mentioned_issue_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issue_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_comment_id_issue_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_mentioned_issue_id_issue_id_fk" FOREIGN KEY ("mentioned_issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_comment_issue_id_idx" ON "issue_comment" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_comment_parent_id_idx" ON "issue_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "issue_comment_mention_comment_id_idx" ON "issue_comment_mention" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "issue_comment_mention_user_id_idx" ON "issue_comment_mention" USING btree ("user_id");
