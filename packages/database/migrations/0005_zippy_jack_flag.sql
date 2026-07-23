ALTER TABLE "profiles" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp DEFAULT now() NOT NULL;