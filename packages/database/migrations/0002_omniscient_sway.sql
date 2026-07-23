CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"relationship_id" uuid,
	"remote_session_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"success" boolean NOT NULL,
	"metadata_json" json,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderator_permissions" (
	"relationship_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderator_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streamer_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"paused_at" timestamp,
	"revoked_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remote_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"streamer_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"streamer_device_id" uuid,
	"moderator_device_id" uuid,
	"relationship_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'creating' NOT NULL,
	"transport" varchar(20) DEFAULT 'unknown' NOT NULL,
	"permissions_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"connected_at" timestamp,
	"ended_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"close_reason" text,
	CONSTRAINT "remote_sessions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_relationship_id_moderator_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."moderator_relationships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_remote_session_id_remote_sessions_id_fk" FOREIGN KEY ("remote_session_id") REFERENCES "public"."remote_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_permissions" ADD CONSTRAINT "moderator_permissions_relationship_id_moderator_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."moderator_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_relationships" ADD CONSTRAINT "moderator_relationships_streamer_id_users_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_relationships" ADD CONSTRAINT "moderator_relationships_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_relationships" ADD CONSTRAINT "moderator_relationships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_sessions" ADD CONSTRAINT "remote_sessions_streamer_id_users_id_fk" FOREIGN KEY ("streamer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_sessions" ADD CONSTRAINT "remote_sessions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_sessions" ADD CONSTRAINT "remote_sessions_streamer_device_id_devices_id_fk" FOREIGN KEY ("streamer_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_sessions" ADD CONSTRAINT "remote_sessions_moderator_device_id_devices_id_fk" FOREIGN KEY ("moderator_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_sessions" ADD CONSTRAINT "remote_sessions_relationship_id_moderator_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."moderator_relationships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_permission_idx" ON "moderator_permissions" USING btree ("relationship_id","permission_key");--> statement-breakpoint
CREATE UNIQUE INDEX "streamer_moderator_idx" ON "moderator_relationships" USING btree ("streamer_id","moderator_id");