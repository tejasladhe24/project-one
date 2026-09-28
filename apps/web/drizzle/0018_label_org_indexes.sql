-- Tenant-scope labels + hot-path indexes
ALTER TABLE "label" ADD COLUMN "organization_id" text;--> statement-breakpoint
UPDATE "label" SET "organization_id" = sub."org_id"
FROM (
	SELECT DISTINCT ON (ptl."label_id") ptl."label_id", p."organization_id" AS "org_id"
	FROM "project_to_label" ptl
	INNER JOIN "project" p ON p."id" = ptl."project_id"
	WHERE p."organization_id" IS NOT NULL
	ORDER BY ptl."label_id", p."organization_id"
) sub
WHERE "label"."id" = sub."label_id" AND "label"."organization_id" IS NULL;--> statement-breakpoint
UPDATE "label" SET "organization_id" = sub."org_id"
FROM (
	SELECT DISTINCT ON (itl."label_id") itl."label_id", t."organization_id" AS "org_id"
	FROM "issue_to_label" itl
	INNER JOIN "issue" i ON i."id" = itl."issue_id"
	INNER JOIN "team" t ON t."id" = i."team_id"
	WHERE t."organization_id" IS NOT NULL
	ORDER BY itl."label_id", t."organization_id"
) sub
WHERE "label"."id" = sub."label_id" AND "label"."organization_id" IS NULL;--> statement-breakpoint
DELETE FROM "label" WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "label" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "label_org_name_uidx" ON "label" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "label_organization_id_idx" ON "label" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_organization_id_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_project_id_idx" ON "issue" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_assignee_id_idx" ON "issue" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issue_status_id_idx" ON "issue" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "document_team_id_idx" ON "document" USING btree ("team_id");
