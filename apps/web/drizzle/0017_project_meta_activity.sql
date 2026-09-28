ALTER TABLE "project" ADD COLUMN "status" text DEFAULT 'backlog' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
CREATE TYPE "public"."project_activity_type" AS ENUM('comment', 'created');--> statement-breakpoint
CREATE TABLE "project_member" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);--> statement-breakpoint
CREATE TABLE "project_team" (
	"project_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_team_project_id_team_id_pk" PRIMARY KEY("project_id","team_id")
);--> statement-breakpoint
CREATE TABLE "project_to_label" (
	"project_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "project_to_label_project_id_label_id_pk" PRIMARY KEY("project_id","label_id")
);--> statement-breakpoint
CREATE TABLE "project_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" "project_activity_type" NOT NULL,
	"user_id" text,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_to_label" ADD CONSTRAINT "project_to_label_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_to_label" ADD CONSTRAINT "project_to_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_activity_project_id_idx" ON "project_activity" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_activity_created_at_idx" ON "project_activity" USING btree ("created_at");
