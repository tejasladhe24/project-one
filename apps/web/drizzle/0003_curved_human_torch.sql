CREATE TYPE "public"."issue_activity_type" AS ENUM('comment', 'status-change', 'assignee-change', 'due-date-change', 'priority-change', 'estimated-hours-change', 'tag-change');--> statement-breakpoint
CREATE TYPE "public"."issue_relation_type" AS ENUM('related-to', 'parent-of', 'sub-of');--> statement-breakpoint
CREATE TABLE "issue" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"status_id" text,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" text,
	"due_date" timestamp,
	"priority" integer,
	"estimated_hours" integer,
	"attachments" text[],
	"comments" text[],
	"tags" text[],
	"activity" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text,
	"type" "issue_activity_type" NOT NULL,
	"user_id" text,
	"comment" text,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_status" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text,
	"related_issue_id" text,
	"relation_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_status_id_issue_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."issue_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_tags_issue_tag_id_fk" FOREIGN KEY ("tags") REFERENCES "public"."issue_tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_issue" ADD CONSTRAINT "related_issue_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_issue" ADD CONSTRAINT "related_issue_related_issue_id_issue_id_fk" FOREIGN KEY ("related_issue_id") REFERENCES "public"."issue"("id") ON DELETE no action ON UPDATE no action;