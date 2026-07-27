CREATE SEQUENCE IF NOT EXISTS "users_public_id_seq" START WITH 1;

ALTER TABLE "users" ADD COLUMN "public_id" integer;

WITH numbered_users AS (
  SELECT "id", row_number() OVER (ORDER BY "created_at", "id")::integer AS "public_id"
  FROM "users"
)
UPDATE "users"
SET "public_id" = numbered_users."public_id"
FROM numbered_users
WHERE "users"."id" = numbered_users."id";

SELECT setval(
  '"users_public_id_seq"',
  COALESCE((SELECT max("public_id") FROM "users"), 0) + 1,
  false
);

ALTER TABLE "users" ALTER COLUMN "public_id" SET DEFAULT nextval('"users_public_id_seq"');
ALTER TABLE "users" ALTER COLUMN "public_id" SET NOT NULL;
ALTER SEQUENCE "users_public_id_seq" OWNED BY "users"."public_id";
CREATE UNIQUE INDEX "users_public_id_idx" ON "users" ("public_id");
