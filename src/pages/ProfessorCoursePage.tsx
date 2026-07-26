import { useEffect, useState } from "react";
import { ArrowLeft, Users, CalendarCheck, Plus, Search, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { Course, Profile, AttendanceSession, AttendanceRecord } from "@/lib/supabase";
import { formatDate, formatDateShort, percent } from "@/lib/utils";

type StudentRow = Profile & { present: number; late: number; absent: number; rate: number };

export function ProfessorCoursePage({
  courseId,
  onBack,
}: {
  courseId: string;
  onBack: () => void;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [sessions, setSessions] = useState<(AttendanceSession & { present: number; late: number; absent: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"roster" | "sessions">("roster");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      setCourse(c as Course | null);

      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("student:profiles(*)")
        .eq("course_id", courseId);
      const studentList = (enrolls ?? []).map((e: any) => e.student) as Profile[];

      const { data: sessRows } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("course_id", courseId)
        .order("session_date", { ascending: false });

      const sessionIds = (sessRows ?? []).map((s) => s.id);
      let recs: AttendanceRecord[] = [];
      if (sessionIds.length) {
        const { data: r } = await supabase.from("attendance_records").select("*").in("session_id", sessionIds);
        recs = (r ?? []) as AttendanceRecord[];
      }

      const studentRows: StudentRow[] = studentList.map((s) => {
        const sRecs = recs.filter((r) => r.student_id === s.id);
        const present = sRecs.filter((r) => r.status === "present").length;
        const late = sRecs.filter((r) => r.status === "late").length;
        const absent = sRecs.filter((r) => r.status === "absent").length;
        return { ...s, present, late, absent, rate: percent(present + late, sRecs.length) };
      });
      setStudents(studentRows);

      const sessStats = (sessRows ?? []).map((s) => {
        const sRecs = recs.filter((r) => r.session_id === s.id);
        return {
          ...s,
          present: sRecs.filter((r) => r.status === "present").length,
          late: sRecs.filter((r) => r.status === "late").length,
          absent: sRecs.filter((r) => r.status === "absent").length,
        };
      });
      setSessions(sessStats);
      setLoading(false);
    })();
  }, [courseId]);

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_number ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      {/* Course header */}
      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="chip bg-white/15 text-white">{course?.code}</span>
              <span className="text-xs text-brand-100">{course?.semester}</span>
            </div>
            <h1 className="font-display text-2xl font-bold mt-2">{course?.name}</h1>
            <div className="text-sm text-brand-100 mt-1">{course?.schedule_day} · {course?.start_time?.slice(0,5)}–{course?.end_time?.slice(0,5)} · {course?.room}</div>
          </div>
          <div className="flex gap-4">
            <HeaderStat icon={<Users size={18} />} value={students.length} label="Students" />
            <HeaderStat icon={<CalendarCheck size={18} />} value={sessions.length} label="Sessions" />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-100">
        <TabButton active={tab === "roster"} onClick={() => setTab("roster")}>Roster</TabButton>
        <TabButton active={tab === "sessions"} onClick={() => setTab("sessions")}>Sessions</TabButton>
      </div>

      {tab === "roster" && (
        <Card>
          <CardHeader
            title="Enrolled Students"
            subtitle={`${students.length} students in this course`}
            action={
              <button onClick={() => setShowAdd((v) => !v)} className="btn-secondary text-xs px-3 py-2">
                <UserPlus size={14} /> Add Student
              </button>
            }
          />
          {showAdd && <AddStudentPanel courseId={courseId} onAdded={() => setShowAdd(false)} />}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="input pl-9" />
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wider">
                  <th className="px-2 py-2 font-medium">Student</th>
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium text-center">Present</th>
                  <th className="px-2 py-2 font-medium text-center">Late</th>
                  <th className="px-2 py-2 font-medium text-center">Absent</th>
                  <th className="px-2 py-2 font-medium text-center">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} size="sm" />
                        <div>
                          <div className="font-medium text-ink-900">{s.full_name}</div>
                          <div className="text-xs text-ink-400">{s.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-ink-600 font-mono text-xs">{s.student_number ?? "—"}</td>
                    <td className="px-2 py-3 text-center"><Badge tone="success">{s.present}</Badge></td>
                    <td className="px-2 py-3 text-center"><Badge tone="warning">{s.late}</Badge></td>
                    <td className="px-2 py-3 text-center"><Badge tone="danger">{s.absent}</Badge></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-1.5 w-16 rounded-full bg-ink-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${s.rate}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-ink-700 w-9 text-right">{s.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-400">No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "sessions" && (
        <Card>
          <CardHeader title="Attendance Sessions" subtitle={`${sessions.length} sessions held`} />
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wider">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium text-center">Present</th>
                  <th className="px-2 py-2 font-medium text-center">Late</th>
                  <th className="px-2 py-2 font-medium text-center">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-2 py-3 font-medium text-ink-900">{formatDate(s.session_date)}</td>
                    <td className="px-2 py-3 capitalize text-ink-600">{s.method}</td>
                    <td className="px-2 py-3">{s.status === "open" ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Closed</Badge>}</td>
                    <td className="px-2 py-3 text-center"><Badge tone="success">{s.present}</Badge></td>
                    <td className="px-2 py-3 text-center"><Badge tone="warning">{s.late}</Badge></td>
                    <td className="px-2 py-3 text-center"><Badge tone="danger">{s.absent}</Badge></td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-400">No sessions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function HeaderStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className="text-brand-100">{icon}</div>
      <div>
        <div className="font-display font-bold text-xl">{value}</div>
        <div className="text-xs text-brand-100">{label}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
      }`}
    >
      {children}
    </button>
  );
}

function AddStudentPanel({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setStatus(null);
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("student_number", email.trim() ? `%${email.trim()}%` : "____")
      .limit(1)
      .maybeSingle();
    // fallback: search by name substring
    let student = prof;
    if (!student) {
      const { data: byName } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${email.trim()}%`)
        .eq("role", "student")
        .limit(1)
        .maybeSingle();
      student = byName as any;
    }
    if (!student) {
      setStatus("No matching student found. Try their name or student ID.");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("enrollments")
      .upsert({ course_id: courseId, student_id: student.id }, { onConflict: "course_id,student_id", ignoreDuplicates: true });
    if (error) setStatus(error.message);
    else {
      setStatus("Student enrolled.");
      onAdded();
    }
    setBusy(false);
  }

  return (
    <div className="mb-4 rounded-xl border border-ink-100 bg-ink-50/50 p-3 flex flex-col sm:flex-row gap-2 items-end">
      <div className="flex-1 w-full">
        <label className="label">Search student by name or ID</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. James or CS-2021-045" className="input" />
      </div>
      <button onClick={add} disabled={busy} className="btn-primary">{busy ? "Adding..." : "Enroll"}</button>
      {status && <div className="text-xs text-ink-500 sm:ml-2 flex items-center gap-1"><CheckCircle2 size={14} /> {status}</div>}
    </div>
  );
}
