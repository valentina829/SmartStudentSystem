import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Course, AttendanceSession, AttendanceRecord, Profile } from "@/lib/supabase";

export type { Course, AttendanceSession, AttendanceRecord, Profile };

export type CourseWithStats = Course & {
  student_count: number;
  session_count: number;
  present_rate: number;
};

export type SessionWithCourse = AttendanceSession & {
  course: Pick<Course, "id" | "code" | "name">;
};

export type RecordWithMeta = AttendanceRecord & {
  session: Pick<AttendanceSession, "id" | "session_date" | "method"> & {
    course: Pick<Course, "id" | "code" | "name">;
  };
};

export function useProfessorData(profile: Profile | null) {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: courseRows, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .eq("professor_id", profile.id);
      if (cErr) throw cErr;

      const stats: CourseWithStats[] = [];
      for (const c of courseRows as Course[]) {
        const { count: studentCount } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", c.id);
        const { count: sessionCount } = await supabase
          .from("attendance_sessions")
          .select("id", { count: "exact", head: true })
          .eq("course_id", c.id);
        const { data: sessions } = await supabase
          .from("attendance_sessions")
          .select("id")
          .eq("course_id", c.id);
        let present = 0;
        let total = 0;
        if (sessions && sessions.length) {
          const { data: recs } = await supabase
            .from("attendance_records")
            .select("status")
            .in("session_id", sessions.map((s) => s.id));
          total = recs?.length ?? 0;
          present = recs?.filter((r) => r.status === "present").length ?? 0;
        }
        stats.push({
          ...c,
          student_count: studentCount ?? 0,
          session_count: sessionCount ?? 0,
          present_rate: total ? Math.round((present / total) * 100) : 0,
        });
      }
      setCourses(stats);

      // Recent sessions across all courses
      const { data: sessions, error: sErr } = await supabase
        .from("attendance_sessions")
        .select("*, course:courses(id, code, name)")
        .in("course_id", courseRows.map((c) => c.id))
        .order("session_date", { ascending: false })
        .limit(8);
      if (sErr) throw sErr;
      setRecentSessions((sessions ?? []) as unknown as SessionWithCourse[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { courses, recentSessions, loading, error, refresh };
}

export function useStudentData(profile: Profile | null) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<RecordWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: enrolls, error: eErr } = await supabase
        .from("enrollments")
        .select("course:courses(*)")
        .eq("student_id", profile.id);
      if (eErr) throw eErr;
      const courseList = (enrolls ?? []).map((e: any) => e.course) as Course[];
      setCourses(courseList);

      const { data: recs, error: rErr } = await supabase
        .from("attendance_records")
        .select("*, session:attendance_sessions(id, session_date, method, course:courses(id, code, name))")
        .eq("student_id", profile.id)
        .order("marked_at", { ascending: false });
      if (rErr) throw rErr;
      setRecords((recs ?? []) as unknown as RecordWithMeta[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { courses, records, loading, error, refresh };
}
