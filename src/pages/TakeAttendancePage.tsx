import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  QrCode, ScanFace, Play, Square, RefreshCw, CheckCircle2, XCircle, Clock,
  Users, ArrowLeft, Camera, ShieldCheck, Loader2, Zap,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { Course, AttendanceRecord, Profile } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

type Method = "qr" | "face";

export function TakeAttendancePage({ onBack }: { onBack: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("qr");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("courses").select("*").eq("professor_id", userData.user.id);
      setCourses((data ?? []) as Course[]);
      if (data && data.length) setCourseId(data[0].id);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-64 rounded-xl bg-white animate-pulse" />;
  if (!courses.length) return (
    <Card>
      <div className="py-12 text-center">
        <Users size={32} className="mx-auto text-ink-300" />
        <p className="text-ink-500 mt-3">You don't have any courses yet. Create a course first.</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Take Attendance</h1>
        <p className="text-ink-500 mt-1">Generate a QR code or run live face recognition for your class.</p>
      </div>

      {/* Course + method selector */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <label className="label">Course</label>
          <select value={courseId ?? ""} onChange={(e) => setCourseId(e.target.value)} className="input">
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </Card>
        <Card>
          <label className="label">Attendance Method</label>
          <div className="grid grid-cols-2 gap-2">
            <MethodButton active={method === "qr"} onClick={() => setMethod("qr")} icon={<QrCode size={18} />} label="QR Code" />
            <MethodButton active={method === "face"} onClick={() => setMethod("face")} icon={<ScanFace size={18} />} label="Face Recognition" />
          </div>
        </Card>
      </div>

      {courseId && method === "qr" && <QRGenerator courseId={courseId} />}
      {courseId && method === "face" && <FaceRecognition courseId={courseId} />}
    </div>
  );
}

function MethodButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function QRGenerator({ courseId }: { courseId: string }) {
  const [token, setToken] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [tick, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const course = useMemo(() => courseId, [courseId]);

  async function loadStudents() {
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student:profiles(*)")
      .eq("course_id", courseId);
    setStudents((enrolls ?? []).map((e: any) => e.student));
  }

  async function startSession() {
    const today = new Date().toISOString().slice(0, 10);
    const newToken = crypto.randomUUID();
    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({
        course_id: course,
        session_date: today,
        status: "open",
        method: "qr",
        qr_token: newToken,
        start_time: new Date().toTimeString().slice(0, 5),
      })
      .select()
      .single();
    if (error) {
      // session already exists today, fetch it
      const { data: existing } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("course_id", course)
        .eq("session_date", today)
        .maybeSingle();
      if (existing) {
        setSessionId(existing.id);
        setToken(existing.qr_token ?? newToken);
        await supabase.from("attendance_sessions").update({ status: "open", qr_token: newToken }).eq("id", existing.id);
        setToken(newToken);
      }
      return;
    }
    setSessionId(data.id);
    setToken(newToken);
    setRunning(true);
    setSecondsLeft(30);
    await loadStudents();
  }

  async function stopSession() {
    if (sessionId) {
      await supabase.from("attendance_sessions").update({ status: "closed" }).eq("id", sessionId);
    }
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function refreshToken() {
    const newToken = crypto.randomUUID();
    setToken(newToken);
    if (sessionId) {
      await supabase.from("attendance_sessions").update({ qr_token: newToken }).eq("id", sessionId);
    }
    setSecondsLeft(30);
  }

  // QR render
  useEffect(() => {
    if (!token || !canvasRef.current) return;
    const payload = JSON.stringify({ session: sessionId, token, course: courseId, ts: Date.now() });
    QRCode.toCanvas(canvasRef.current, payload, { width: 240, margin: 2, color: { dark: "#1f57f5", light: "#ffffff" } }, () => {});
  }, [token, sessionId, courseId, tick]);

  // Countdown + auto refresh + simulated scans
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(async () => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          refreshToken();
          return 30;
        }
        return s - 1;
      });
      setTick((t) => t + 1);

      // Simulate a random student checking in
      if (sessionId && students.length) {
        const random = students[Math.floor(Math.random() * students.length)];
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("session_id", sessionId)
          .eq("student_id", random.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("attendance_records").upsert({
            session_id: sessionId,
            student_id: random.id,
            status: "present",
            marked_at: new Date().toISOString(),
            method: "qr",
          }, { onConflict: "session_id,student_id" });
        }
        loadRecords();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, sessionId, students]);

  async function loadRecords() {
    if (!sessionId) return;
    const { data } = await supabase.from("attendance_records").select("*").eq("session_id", sessionId);
    setRecords((data ?? []) as AttendanceRecord[]);
  }

  useEffect(() => {
    loadStudents();
  }, [courseId]);

  const checkedInIds = new Set(records.map((r) => r.student_id));
  const presentCount = records.filter((r) => r.status === "present").length;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader title="Live QR Code" subtitle="Students scan this code to check in. Token rotates every 30s." />
        <div className="flex flex-col items-center py-2">
          <div className="relative">
            <canvas ref={canvasRef} className={`rounded-2xl border-4 ${running ? "border-brand-200" : "border-ink-100"} transition-colors`} />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                <div className="text-center">
                  <QrCode size={40} className="mx-auto text-ink-300" />
                  <p className="text-sm text-ink-400 mt-2">Session not started</p>
                </div>
              </div>
            )}
            {running && (
              <div className="absolute -top-2 -right-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500" />
                </span>
              </div>
            )}
          </div>

          {running ? (
            <div className="mt-5 w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Token refreshes in</span>
                <span className="font-mono font-semibold text-brand-700">{secondsLeft}s</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-1000" style={{ width: `${(secondsLeft / 30) * 100}%` }} />
              </div>
              <div className="flex gap-2">
                <button onClick={refreshToken} className="btn-secondary flex-1 text-xs">
                  <RefreshCw size={14} /> Refresh now
                </button>
                <button onClick={stopSession} className="btn-danger flex-1 text-xs">
                  <Square size={14} /> End session
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startSession} className="btn-primary mt-5 w-full">
              <Play size={16} /> Start attendance session
            </button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Live Check-ins"
          subtitle={`${presentCount} of ${students.length} students present`}
          action={running ? <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" /> Live</Badge> : <Badge tone="neutral">Idle</Badge>}
        />
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {students.map((s) => {
            const rec = records.find((r) => r.student_id === s.id);
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${rec ? "border-success-200 bg-success-50/50" : "border-ink-100"}`}>
                <Avatar name={s.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">{s.full_name}</div>
                  <div className="text-xs text-ink-400">{s.student_number}</div>
                </div>
                {rec ? (
                  <Badge tone="success"><CheckCircle2 size={12} /> Checked in</Badge>
                ) : (
                  <Badge tone="neutral"><Clock size={12} /> Waiting</Badge>
                )}
              </div>
            );
          })}
          {students.length === 0 && <div className="py-8 text-center text-ink-400 text-sm">No students enrolled.</div>}
        </div>
      </Card>
    </div>
  );
}

function FaceRecognition({ courseId }: { courseId: string }) {
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadStudents() {
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student:profiles(*)")
      .eq("course_id", courseId);
    setStudents((enrolls ?? []).map((e: any) => e.student));
  }

  useEffect(() => { loadStudents(); }, [courseId]);

  async function start() {
    setRunning(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("course_id", courseId)
      .eq("session_date", today)
      .maybeSingle();
    let sid: string;
    if (existing) {
      sid = existing.id;
      await supabase.from("attendance_sessions").update({ status: "open", method: "face" }).eq("id", sid);
    } else {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert({ course_id: courseId, session_date: today, status: "open", method: "face", start_time: new Date().toTimeString().slice(0, 5) })
        .select()
        .single();
      if (error) { setLog((l) => [...l, `Error: ${error.message}`]); return; }
      sid = data.id;
    }
    setSessionId(sid);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setLog((l) => [...l, "Camera unavailable — running in simulation mode."]);
    }

    setLog((l) => [...l, "Face recognition engine started."]);

    let idx = 0;
    timerRef.current = setInterval(async () => {
      if (idx >= students.length) {
        setScanningIdx(null);
        setScanProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);
        setRunning(false);
        setLog((l) => [...l, "Scan complete. All students processed."]);
        return;
      }
      setScanningIdx(idx);
      setScanProgress((p) => {
        const np = p + 8 + Math.random() * 10;
        if (np >= 100) {
          // mark this student
          const s = students[idx];
          if (sessionId) {
            const status = Math.random() > 0.85 ? "late" : "present";
            supabase.from("attendance_records").upsert({
              session_id: sessionId,
              student_id: s.id,
              status,
              marked_at: new Date().toISOString(),
              method: "face",
            }, { onConflict: "session_id,student_id" }).then(() => loadRecords());
          }
          setLog((l) => [...l, `Recognized: ${s.full_name} — ${Math.random() > 0.85 ? "late" : "present"}`]);
          idx += 1;
          return 0;
        }
        return np;
      });
    }, 120);
  }

  async function stop() {
    setRunning(false);
    setScanningIdx(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (sessionId) await supabase.from("attendance_sessions").update({ status: "closed" }).eq("id", sessionId);
    setLog((l) => [...l, "Session stopped."]);
  }

  async function loadRecords() {
    if (!sessionId) return;
    const { data } = await supabase.from("attendance_records").select("*").eq("session_id", sessionId);
    setRecords((data ?? []) as AttendanceRecord[]);
  }

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const checkedIds = new Set(records.map((r) => r.student_id));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader
          title="Live Face Recognition"
          subtitle="Webcam feed with simulated recognition overlay"
          action={running ? <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" /> Scanning</Badge> : <Badge tone="neutral">Idle</Badge>}
        />
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink-950 border border-ink-200">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 bg-ink-900">
              <Camera size={36} />
              <p className="text-sm mt-2">Camera preview will appear here</p>
              <p className="text-xs text-white/50 mt-1">Click start to begin face recognition</p>
            </div>
          )}
          {running && (
            <>
              {/* Face detection frame */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-48 border-2 border-brand-400 rounded-2xl shadow-glow">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-300 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-300 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-300 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-300 rounded-br-lg" />
                </div>
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-scan-line" />
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-xs text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-danger-500 animate-pulse" /> REC
              </div>
              <div className="absolute top-3 right-3 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-xs text-white font-mono">
                {new Date().toLocaleTimeString()}
              </div>
              {scanningIdx !== null && students[scanningIdx] && (
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/50 backdrop-blur p-3 text-white">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><ScanFace size={14} /> Analyzing face...</span>
                    <span className="font-mono">{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-400 to-success-400 transition-all" style={{ width: `${scanProgress}%` }} />
                  </div>
                  <div className="mt-1.5 text-xs text-white/70">Matching: {students[scanningIdx].full_name}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {!running ? (
            <button onClick={start} className="btn-primary flex-1"><Play size={16} /> Start recognition</button>
          ) : (
            <button onClick={stop} className="btn-danger flex-1"><Square size={16} /> Stop</button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
          <ShieldCheck size={14} className="text-success-500" />
          Simulated recognition for thesis demonstration. No biometric data is stored.
        </div>
      </Card>

      <Card>
        <CardHeader title="Recognition Log" subtitle="Live feed of recognized students" />
        <div className="rounded-xl bg-ink-950 text-ink-100 font-mono text-xs p-3 h-32 overflow-y-auto">
          {log.length === 0 ? <span className="text-ink-500">Awaiting start...</span> : log.map((l, i) => (
            <div key={i} className="flex gap-2"><span className="text-success-400">›</span>{l}</div>
          ))}
        </div>
        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
          {students.map((s, i) => {
            const rec = records.find((r) => r.student_id === s.id);
            const scanning = scanningIdx === i;
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${rec ? "border-success-200 bg-success-50/50" : scanning ? "border-brand-300 bg-brand-50/50" : "border-ink-100"}`}>
                <Avatar name={s.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">{s.full_name}</div>
                  <div className="text-xs text-ink-400">{s.student_number}</div>
                </div>
                {rec ? <Badge tone={rec.status === "late" ? "warning" : "success"}><CheckCircle2 size={12} /> {rec.status}</Badge>
                  : scanning ? <Badge tone="brand"><Loader2 size={12} className="animate-spin" /> Scanning</Badge>
                  : <Badge tone="neutral"><XCircle size={12} /> Pending</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
