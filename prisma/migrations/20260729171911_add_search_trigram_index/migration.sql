-- Trigram indexes so ILIKE '%q%' searches (title/author — used by /search,
-- /browse's q filter, /api/search, and the admin manga search box) can use
-- an index instead of a sequential scan. A plain btree index can't help
-- here since the match isn't anchored to the start of the string.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Manga_title_trgm_idx" ON "Manga" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Manga_author_trgm_idx" ON "Manga" USING GIN ("author" gin_trgm_ops);
