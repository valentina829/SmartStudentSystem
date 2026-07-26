/*
# Add unique constraints for upsert conflict targets

The seed edge function upserts sessions by (course_id, session_date) and
enrollments by (course_id, student_id). Add unique indexes so those ON CONFLICT
specs resolve.
*/

DROP INDEX IF EXISTS sessions_course_date_unique_idx;
CREATE UNIQUE INDEX sessions_course_date_unique_idx
  ON attendance_sessions(course_id, session_date);

DROP INDEX IF EXISTS enrollments_course_student_unique_idx;
CREATE UNIQUE INDEX enrollments_course_student_unique_idx
  ON enrollments(course_id, student_id);

DROP INDEX IF EXISTS records_session_student_unique_idx;
CREATE UNIQUE INDEX records_session_student_unique_idx
  ON attendance_records(session_id, student_id);
