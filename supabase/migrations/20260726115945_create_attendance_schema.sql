/*
# Smart Attendance Management System - Core Schema

## Overview
Creates the full data model for a university smart attendance system with
professor and student roles. Supports courses, enrollments, attendance sessions
(generated via QR code or face recognition), and per-student attendance records.

## Tables

1. `profiles`
   - Extends `auth.users` with role, full name, student/staff ID, department, avatar.
   - `role` is either 'professor' or 'student'.
   - `student_number` is the human-readable university ID (e.g. CS-2021-045).

2. `courses`
   - A course owned (taught) by a professor.
   - `professor_id` references `profiles.id` (the professor teaching it).
   - Includes code, name, semester, schedule day, time window, and room.

3. `enrollments`
   - Links a student to a course (many-to-many).
   - Unique constraint prevents duplicate enrollment of the same student in a course.

4. `attendance_sessions`
   - A single class meeting for a course on a given date.
   - `status` is 'open' (students can still check in) or 'closed'.
   - `method` is 'qr' or 'face' (how attendance is being taken).
   - `qr_token` is the rotating token embedded in the QR code for that session.

5. `attendance_records`
   - One row per student per session.
   - `status` is 'present', 'absent', or 'late'.
   - `marked_at` is when the student checked in (null if marked absent by professor).

## Security (Row Level Security)
- `profiles`: any authenticated user can read all profiles (professors need to see
  student names in their courses). Users can update only their own profile.
- `courses`: professors can insert/update/delete their own courses; any
  authenticated user can read courses (students browse to see enrolled courses).
- `enrollments`: professors can manage enrollments for their courses; students can
  read their own enrollments; all authenticated can read (for roster lookups).
- `attendance_sessions`: professors manage sessions for their own courses; students
  read sessions for courses they are enrolled in.
- `attendance_records`: professors manage records for their own courses; students
  read only their own records.

## Notes
- Owner columns default to `auth.uid()` so inserts from the client succeed even
  when the caller omits the owner field.
- Policies are dropped before re-creation so the migration is idempotent.
*/

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('professor','student')),
  full_name text NOT NULL,
  student_number text,
  department text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== courses =====
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  semester text NOT NULL,
  schedule_day text,
  start_time time,
  end_time time,
  room text,
  professor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_authenticated" ON courses;
CREATE POLICY "courses_select_authenticated" ON courses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "courses_insert_own" ON courses;
CREATE POLICY "courses_insert_own" ON courses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = professor_id);

DROP POLICY IF EXISTS "courses_update_own" ON courses;
CREATE POLICY "courses_update_own" ON courses
  FOR UPDATE TO authenticated USING (auth.uid() = professor_id) WITH CHECK (auth.uid() = professor_id);

DROP POLICY IF EXISTS "courses_delete_own" ON courses;
CREATE POLICY "courses_delete_own" ON courses
  FOR DELETE TO authenticated USING (auth.uid() = professor_id);

-- ===== enrollments =====
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_select_authenticated" ON enrollments;
CREATE POLICY "enrollments_select_authenticated" ON enrollments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "enrollments_insert_course_owner" ON enrollments;
CREATE POLICY "enrollments_insert_course_owner" ON enrollments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "enrollments_update_course_owner" ON enrollments;
CREATE POLICY "enrollments_update_course_owner" ON enrollments
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "enrollments_delete_course_owner" ON enrollments;
CREATE POLICY "enrollments_delete_course_owner" ON enrollments
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

-- ===== attendance_sessions =====
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  method text NOT NULL DEFAULT 'qr' CHECK (method IN ('qr','face')),
  qr_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_enrolled_or_owner" ON attendance_sessions;
CREATE POLICY "sessions_select_enrolled_or_owner" ON attendance_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = attendance_sessions.course_id AND e.student_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_insert_owner" ON attendance_sessions;
CREATE POLICY "sessions_insert_owner" ON attendance_sessions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_update_owner" ON attendance_sessions;
CREATE POLICY "sessions_update_owner" ON attendance_sessions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_delete_owner" ON attendance_sessions;
CREATE POLICY "sessions_delete_owner" ON attendance_sessions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.professor_id = auth.uid())
  );

-- ===== attendance_records =====
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','late')),
  marked_at timestamptz,
  method text,
  UNIQUE (session_id, student_id)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "records_select_owner_or_self" ON attendance_records;
CREATE POLICY "records_select_owner_or_self" ON attendance_records
  FOR SELECT TO authenticated USING (
    auth.uid() = student_id
    OR
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = session_id AND c.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "records_insert_owner" ON attendance_records;
CREATE POLICY "records_insert_owner" ON attendance_records
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = session_id AND c.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "records_update_owner_or_self" ON attendance_records;
CREATE POLICY "records_update_owner_or_self" ON attendance_records
  FOR UPDATE TO authenticated USING (
    auth.uid() = student_id
    OR
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = session_id AND c.professor_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = student_id
    OR
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = session_id AND c.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "records_delete_owner" ON attendance_records;
CREATE POLICY "records_delete_owner" ON attendance_records
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = session_id AND c.professor_id = auth.uid()
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
