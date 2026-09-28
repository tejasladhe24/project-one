CREATE TYPE "public"."inbox_item_type" AS ENUM('issue', 'review', 'team');--> statement-breakpoint
CREATE TYPE "public"."issue_activity_type" AS ENUM('comment', 'status-change', 'assignee-change', 'due-date-change', 'priority-change', 'estimated-hours-change', 'label-change', 'created', 'mention', 'title-change', 'description-change');--> statement-breakpoint
CREATE TYPE "public"."issue_comment_mention_type" AS ENUM('user', 'issue');--> statement-breakpoint
CREATE TYPE "public"."issue_relation_type" AS ENUM('related-to', 'parent-of', 'sub-of');--> statement-breakpoint
CREATE TYPE "public"."issue_status_category" AS ENUM('triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."issue_subscriber_reason" AS ENUM('creator', 'assignee', 'mentioned', 'manual');--> statement-breakpoint
CREATE TYPE "public"."project_activity_type" AS ENUM('comment', 'created', 'status-change', 'priority-change', 'lead-change', 'member-change', 'date-change', 'team-change', 'label-change', 'name-change', 'description-change');--> statement-breakpoint
CREATE TYPE "public"."project_comment_mention_type" AS ENUM('user', 'issue');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"team_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"identifier" varchar(4) NOT NULL,
	"description" text,
	"member_count" integer DEFAULT 0 NOT NULL,
	"estimate_type" text DEFAULT 'exponential' NOT NULL,
	"allow_zero_estimates" boolean DEFAULT true NOT NULL,
	"extended_estimate_scale" boolean DEFAULT false NOT NULL,
	"count_unestimated_issues" boolean DEFAULT false NOT NULL,
	"cycles_enabled" boolean DEFAULT false NOT NULL,
	"cycle_duration_weeks" integer DEFAULT 1 NOT NULL,
	"cycle_start_day" integer DEFAULT 1 NOT NULL,
	"cycles_origin" timestamp,
	"organization_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "team_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"membership_key" text,
	"created_at" timestamp,
	CONSTRAINT "team_member_membership_key_unique" UNIQUE("membership_key")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "inbox_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "inbox_item_type" NOT NULL,
	"activity_id" text,
	"issue_id" text,
	"team_id" text,
	"actor_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"number" integer NOT NULL,
	"project_id" text,
	"status_id" text,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" text,
	"due_date" timestamp,
	"priority" integer,
	"estimated_hours" integer,
	"cycle_number" integer,
	"attachments" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"type" "issue_activity_type" NOT NULL,
	"user_id" text,
	"message" text,
	"comment" text,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"parent_id" text,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comment_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"type" "issue_comment_mention_type" NOT NULL,
	"user_id" text,
	"mentioned_issue_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_status" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "issue_status_category" NOT NULL,
	"sort_order" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_subscriber" (
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" "issue_subscriber_reason" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issue_subscriber_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "issue_to_label" (
	"issue_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "issue_to_label_issue_id_label_id_pk" PRIMARY KEY("issue_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "label" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"user_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'backlog' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"lead" text,
	"start_date" timestamp,
	"target_date" timestamp NOT NULL,
	"issues_count" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" "project_activity_type" NOT NULL,
	"user_id" text,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "project_member" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_team" (
	"project_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_team_project_id_team_id_pk" PRIMARY KEY("project_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "project_to_label" (
	"project_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "project_to_label_project_id_label_id_pk" PRIMARY KEY("project_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "related_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text,
	"related_issue_id" text,
	"relation_type" "issue_relation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text,
	"issue_id" text,
	"title" text NOT NULL,
	"content" text,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_activity_id_issue_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."issue_activity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notification" ADD CONSTRAINT "inbox_notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_status_id_issue_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."issue_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment" ADD CONSTRAINT "issue_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issue_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_comment_id_issue_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comment_mention" ADD CONSTRAINT "issue_comment_mention_mentioned_issue_id_issue_id_fk" FOREIGN KEY ("mentioned_issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_status" ADD CONSTRAINT "issue_status_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_subscriber" ADD CONSTRAINT "issue_subscriber_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_subscriber" ADD CONSTRAINT "issue_subscriber_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_to_label" ADD CONSTRAINT "issue_to_label_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_to_label" ADD CONSTRAINT "issue_to_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_lead_user_id_fk" FOREIGN KEY ("lead") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment" ADD CONSTRAINT "project_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."project_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_comment_id_project_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."project_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comment_mention" ADD CONSTRAINT "project_comment_mention_mentioned_issue_id_issue_id_fk" FOREIGN KEY ("mentioned_issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_to_label" ADD CONSTRAINT "project_to_label_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_to_label" ADD CONSTRAINT "project_to_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_issue" ADD CONSTRAINT "related_issue_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_issue" ADD CONSTRAINT "related_issue_related_issue_id_issue_id_fk" FOREIGN KEY ("related_issue_id") REFERENCES "public"."issue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_organizationId_idx" ON "team" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teamMember_teamId_idx" ON "team_member" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teamMember_userId_idx" ON "team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_user_id_idx" ON "inbox_notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_org_user_idx" ON "inbox_notification" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_issue_id_idx" ON "inbox_notification" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "inbox_notification_team_id_idx" ON "inbox_notification" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_team_number_uidx" ON "issue" USING btree ("team_id","number");--> statement-breakpoint
CREATE INDEX "issue_project_id_idx" ON "issue" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_assignee_id_idx" ON "issue" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issue_status_id_idx" ON "issue" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "issue_team_cycle_number_idx" ON "issue" USING btree ("team_id","cycle_number");--> statement-breakpoint
CREATE INDEX "issue_activity_issue_id_idx" ON "issue_activity" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_activity_created_at_idx" ON "issue_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issue_comment_issue_id_idx" ON "issue_comment" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_comment_parent_id_idx" ON "issue_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "issue_comment_mention_comment_id_idx" ON "issue_comment_mention" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "issue_comment_mention_user_id_idx" ON "issue_comment_mention" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_status_team_name_uidx" ON "issue_status" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "issue_subscriber_user_id_idx" ON "issue_subscriber" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "label_org_name_uidx" ON "label" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "label_organization_id_idx" ON "label" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_organization_id_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_activity_project_id_idx" ON "project_activity" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_activity_created_at_idx" ON "project_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_comment_project_id_idx" ON "project_comment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_comment_parent_id_idx" ON "project_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "project_comment_mention_comment_id_idx" ON "project_comment_mention" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "project_comment_mention_user_id_idx" ON "project_comment_mention" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_team_id_idx" ON "document" USING btree ("team_id");