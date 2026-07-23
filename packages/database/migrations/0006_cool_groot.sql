CREATE UNIQUE INDEX "calendar_owner_start_end_idx" ON "calendar_events" USING btree ("owner_id","start_at","end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collab_owner_status_idx" ON "collaborations" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_author_created_at_idx" ON "posts" USING btree ("author_id","created_at");