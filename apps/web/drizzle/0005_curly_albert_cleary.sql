-- Safe migration: backfill then enforce NOT NULL / uniqueness
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "identifier" varchar(4);--> statement-breakpoint
UPDATE "team" SET "identifier" = 'ENG' WHERE "name" ILIKE 'engineering' AND ("identifier" IS NULL OR "identifier" = '');--> statement-breakpoint
UPDATE "team" SET "identifier" = 'PROD' WHERE "name" ILIKE 'product' AND ("identifier" IS NULL OR "identifier" = '');--> statement-breakpoint
UPDATE "team" SET "identifier" = upper(left(regexp_replace("name", '[^A-Za-z0-9]', '', 'g'), 4)) WHERE "identifier" IS NULL OR "identifier" = '';--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "identifier" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_identifier_unique') THEN
    ALTER TABLE "team" ADD CONSTRAINT "team_identifier_unique" UNIQUE("identifier");
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "team_id" text;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "number" integer;--> statement-breakpoint
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY created_at, id):: AS n
  FROM "issue"
  WHERE team_id IS NOT NULL
)
UPDATE "issue" SET "number" = numbered.n FROM numbered WHERE "issue".id = numbered.id;--> statement-breakpoint
ALTER TABLE "issue" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issue" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issue_team_id_team_id_fk') THEN
    ALTER TABLE "issue" ADD CONSTRAINT "issue_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "issue_team_number_uidx" ON "issue" USING btree ("team_id","number");
