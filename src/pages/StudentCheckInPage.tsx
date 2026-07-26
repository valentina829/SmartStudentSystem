import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ScanFace, QrCode, Camera, CheckCircle2, Loader2, RefreshCw,
  ShieldCheck, Zap, AlertCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { AttendanceSession, Course } from "@/lib/supabase";

type CheckInState = "idle" | "scanning" | "success" | "absent";

export function StudentCheckInPage({
  profileId,
  onBack,
}: {
  profileId: string;
  onBack: () => void;
}) {
  const [openSessions, setOpenSessions] = useState<(AttendanceSession & { course: Pick<Course, "id" | "code" | "name"> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [state, setState] = useState<CheckInState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ status: string; courseName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadOpen() {
    setLoading(true);
    // Get student's enrollments, then open sessions for those courses
    const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("student_id", profileId);
    const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
    if (!courseIds.length) { setLoading(false); return; }
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("*, course:courses(id, code, name)")
      .in("course_id", courseIds)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setOpenSessions((sessions ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { loadOpen(); }, [profileId]);

  async function startScan(session: AttendanceSession) {
    setActiveSession(session.id);
    setState("scanning");
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      // no camera — run simulation anyway
    }

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + 6 + Math.random() * 10;
        if (np >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          completeCheckIn(session);
          return 100;
        }
        return np;
      });
    }, 140);
  }

  async function completeCheckIn(session: AttendanceSession) {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Determine late if after start time + 10 min
    const startedAt = new Date(session.created_at).getTime();
    const isLate = Date.now() - startedAt > 10 * 60 * 1000 && Math.random() > 0.5;
    const status = isLate ? "late" : "present";

    const { error } = await supabase.from("attendance_records").upsert({
      session_id: session.id,
      student_id: profileId,
      status,
      marked_at: new Date().toISOString(),
      method: "qr",
    }, { onConflict: "session_id,student_id" });

    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    const course = openSessions.find((s) => s.id === session.id)?.course;
    setResult({ status, courseName: course?.name ?? "Course" });
    setState("success");
  }

  function reset() {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveSession(null);
    setState("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    loadOpen();
  }

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Check In</h1>
        <p className="text-ink-500 mt-1">Scan the QR code shown by your professor to mark attendance.</p>
      </div>

      {state === "success" && result ? (
        <Card className="max-w-lg mx-auto text-center py-10 animate-fade-in">
          <div className="mx-auto h-20 w-20 rounded-full bg-success-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-success-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink-900 mt-4">Attendance Recorded</h2>
          <p className="text-ink-500 mt-1">{result.courseName}</p>
          <div className="mt-3 flex justify-center">
            <Badge tone={result.status === "late" ? "warning" : "success"}>
              {result.status === "late" ? "Marked Late" : "Marked Present"}
            </Badge>
          </div>
          <button onClick={reset} className="btn-primary mt-6">
            <RefreshCw size={16} /> Scan another
          </button>
        </Card>
      ) : state === "scanning" ? (
        <Card className="max-w-lg mx-auto">
          <CardHeader title="Scanning QR Code" subtitle="Point your camera at the code" />
          <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-ink-950 border border-ink-200">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-xl" />
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-scan-line" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/50 backdrop-blur p-3 text-white">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Decoding...</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-400 to-success-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <button onClick={reset} className="btn-secondary mt-4 w-full">Cancel</button>
        </Card>
      ) : (
        <>
          {/* Scanner card */}
          <Card className="max-w-lg mx-auto text-center">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-brand-50 flex items-center justify-center">
              <QrCode size={36} className="text-brand-600" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900 mt-4">Ready to scan</h2>
            <p className="text-sm text-ink-500 mt-1">Tap a live session below to start your camera and check in.</p>
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-50 border border-danger-200 px-3 py-2 text-xs text-danger-700">
                <AlertCircle size={14} className="mt-0.5" /> {error}
              </div>
            )}
          </Card>

          {/* Open sessions */}
          <Card>
            <CardHeader
              title="Live Sessions"
              subtitle="Open attendance sessions for your courses"
              action={<Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" /> {openSessions.length} live</Badge>}
            />
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-ink-50 animate-pulse" />)}</div>
            ) : openSessions.length === 0 ? (
              <div className="py-12 text-center">
                <Camera size={32} className="mx-auto text-ink-300" />
                <p className="text-ink-500 mt-3 text-sm">No live sessions right now.</p>
                <p className="text-ink-400 text-xs mt-1">Ask your professor to start an attendance session, then refresh.</p>
                <button onClick={loadOpen} className="btn-secondary mt-4 text-xs"><RefreshCw size={14} /> Refresh</button>
              </div>
            ) : (
              <div className="space-y-2">
                {openSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => startScan(s)}
                    className="w-full flex items-center gap-4 rounded-xl border border-ink-100 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-all text-left card-hover"
                  >
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center">
                      <QrCode size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink-900 truncate">{s.course?.name}</div>
                      <div className="text-xs text-ink-400">{s.course?.code} · {s.method === "face" ? "Face recognition" : "QR code"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" /> Live</Badge>
                      <ScanFace size={18} className="text-brand-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="flex items-center justify-center gap-2 text-xs text-ink-400">
            <ShieldCheck size={14} className="text-success-500" />
            Simulated scanning for thesis demonstration.
          </div>
        </>
      )}
    </div>
  );
}
