ALTER TABLE "team" ADD COLUMN "estimate_type" text DEFAULT 'exponential' NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "allow_zero_estimates" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "extended_estimate_scale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "count_unestimated_issues" boolean DEFAULT false NOT NULL;
