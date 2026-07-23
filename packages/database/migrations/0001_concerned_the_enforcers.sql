ALTER TABLE "sessions" ADD COLUMN "family_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "replaced_by_session_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_used_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_at" timestamp;