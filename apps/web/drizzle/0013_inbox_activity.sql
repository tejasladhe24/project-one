ALTER TYPE "public"."issue_activity_type" ADD VALUE IF NOT EXISTS 'created';--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE IF NOT EXISTS 'mention';--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE IF NOT EXISTS 'title-change';--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE IF NOT EXISTS 'description-change';--> statement-breakpoint
CREATE TYPE "public"."issue_subscriber_reason" AS ENUM('creator', 'assignee', 'mentioned', 'manual');--> statement-breakpoint
CREATE TYPE "public"."inbox_item_type" AS ENUM('issue', 'review');--> statement-breakpoint
ALTER TABLE "issue_activity" ALTER COLUMN "issue_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD COLUMN "message" text;--> statement-breakpoint
CREATE TABLE "issue_subscriber" (
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" "issue_subscriber_reason" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issue_subscriber_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id")
);--> statement-breakpoint
CREATE TABLE "inbox_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "inbox_item_type" NOT NULL,
	"activity_id" text,
	"issue_id" text,
	"actor_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "issue_subscriber" ADD CONSTRAINT "issue_subscriber_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_subscriber" ADD CONSTRAINT "issue_subscriber_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_activity_id_issue_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."issue_activity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_activity_issue_id_idx" ON "issue_activity" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_activity_created_at_idx" ON "issue_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issue_subscriber_user_id_idx" ON "issue_subscriber" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_user_id_idx" ON "inbox_notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_org_user_idx" ON "inbox_notification" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_issue_id_idx" ON "inbox_notification" USING btree ("issue_id");
