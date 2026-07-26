/*
# Add unique constraint on course code

Makes `courses.code` unique so the seed edge function can upsert courses by code
without creating duplicates on re-runs.
*/

DROP INDEX IF EXISTS courses_code_unique_idx;
CREATE UNIQUE INDEX courses_code_unique_idx ON courses(code);
