CREATE TABLE "issue_to_tag" (
	"issue_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "issue_to_tag_issue_id_tag_id_pk" PRIMARY KEY("issue_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "issue" DROP CONSTRAINT "issue_tags_issue_tag_id_fk";
--> statement-breakpoint
ALTER TABLE "related_issue" ALTER COLUMN "relation_type" SET DATA TYPE "public"."issue_relation_type" USING "relation_type"::"public"."issue_relation_type";--> statement-breakpoint
ALTER TABLE "issue_to_tag" ADD CONSTRAINT "issue_to_tag_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_to_tag" ADD CONSTRAINT "issue_to_tag_tag_id_issue_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."issue_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" DROP COLUMN "comments";--> statement-breakpoint
ALTER TABLE "issue" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "issue" DROP COLUMN "activity";