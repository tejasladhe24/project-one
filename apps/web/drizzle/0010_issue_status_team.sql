-- Make issue statuses team-specific: clone globals per team, remap issues, drop globals.

ALTER TABLE "issue_status" ADD COLUMN "team_id" text;--> statement-breakpoint

DO $$
DECLARE
  t RECORD;
  s RECORD;
  new_id text;
BEGIN
  FOR t IN SELECT id FROM team LOOP
    FOR s IN SELECT * FROM issue_status WHERE team_id IS NULL LOOP
      new_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO issue_status (
        id, team_id, name, description, category, sort_order, is_default, created_at, updated_at
      ) VALUES (
        new_id,
        t.id,
        s.name,
        s.description,
        s.category,
        s.sort_order,
        s.is_default,
        s.created_at,
        s.updated_at
      );

      UPDATE issue
      SET status_id = new_id
      WHERE team_id = t.id AND status_id = s.id;
    END LOOP;
  END LOOP;
END $$;--> statement-breakpoint

DELETE FROM "issue_status" WHERE "team_id" IS NULL;--> statement-breakpoint

ALTER TABLE "issue_status" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "issue_status" ADD CONSTRAINT "issue_status_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "issue_status_team_name_uidx" ON "issue_status" USING btree ("team_id","name");
