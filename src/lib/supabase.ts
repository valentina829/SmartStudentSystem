import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing database configuration. Create a .env file in the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server."
    : null;

export const supabase = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseAnonKey ?? "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type Role = "professor" | "student";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  student_number: string | null;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  semester: string;
  schedule_day: string | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  professor_id: string;
  created_at: string;
};

export type Enrollment = {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
};

export type SessionStatus = "open" | "closed";
export type AttendanceMethod = "qr" | "face";
export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceSession = {
  id: string;
  course_id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status: SessionStatus;
  method: AttendanceMethod;
  qr_token: string | null;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_at: string | null;
  method: string | null;
};
