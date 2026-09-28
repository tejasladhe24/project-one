ALTER TABLE "issue_tag" RENAME TO "label";--> statement-breakpoint
ALTER TABLE "issue_to_tag" RENAME TO "issue_to_label";--> statement-breakpoint
ALTER TABLE "issue_to_label" RENAME COLUMN "tag_id" TO "label_id";--> statement-breakpoint
ALTER TABLE "issue_to_label" RENAME CONSTRAINT "issue_to_tag_issue_id_tag_id_pk" TO "issue_to_label_issue_id_label_id_pk";--> statement-breakpoint
ALTER TABLE "issue_to_label" RENAME CONSTRAINT "issue_to_tag_issue_id_issue_id_fk" TO "issue_to_label_issue_id_issue_id_fk";--> statement-breakpoint
ALTER TABLE "issue_to_label" RENAME CONSTRAINT "issue_to_tag_tag_id_issue_tag_id_fk" TO "issue_to_label_label_id_label_id_fk";--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" RENAME VALUE 'tag-change' TO 'label-change';
