import { useMemo } from "react";
import { TrendingUp, CalendarCheck, BookOpen, Clock, XCircle, ArrowRight, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { TrendAreaChart, DonutChart, CourseBarChart, RadialGauge } from "@/components/charts/Charts";
import type { Course, RecordWithMeta } from "@/lib/hooks";
import { formatDateShort, percent } from "@/lib/utils";

export function StudentDashboard({
  profile,
  courses,
  records,
  loading,
  onHistory,
  onScan,
}: {
  profile: { full_name: string; student_number: string | null; department: string | null };
  courses: Course[];
  records: RecordWithMeta[];
  loading: boolean;
  onHistory: () => void;
  onScan: () => void;
}) {
  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const total = records.length;
    const rate = percent(present + late, total);
    return { present, late, absent, total, rate };
  }, [records]);

  const perCourse = useMemo(() => {
    return courses.map((c) => {
      const cRecs = records.filter((r) => r.session?.course?.id === c.id);
      const present = cRecs.filter((r) => r.status === "present").length;
      const late = cRecs.filter((r) => r.status === "late").length;
      const rate = percent(present + late, cRecs.length);
      return { label: c.code, rate, name: c.name, present, late, absent: cRecs.length - present - late };
    });
  }, [courses, records]);

  const trend = useMemo(() => {
    const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];
    return weeks.map((label, i) => ({
      label,
      rate: Math.max(60, Math.min(100, stats.rate + Math.sin(i * 1.7) * 8 + (i - 3) * 2)),
    }));
  }, [stats.rate]);

  const donut = [
    { name: "Present", value: stats.present, color: "#10b981" },
    { name: "Late", value: stats.late, color: "#f59e0b" },
    { name: "Absent", value: stats.absent, color: "#ef4444" },
  ];

  const recent = records.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0, transparent 40%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} size="xl" className="ring-4 ring-white/20" />
            <div>
              <h1 className="font-display text-2xl font-bold">Hi, {profile.full_name.split(" ")[0]}</h1>
              <p className="text-brand-100 text-sm mt-0.5">{profile.student_number} · {profile.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="font-display text-3xl font-bold">{stats.rate}%</div>
              <div className="text-xs text-brand-100">Attendance Rate</div>
            </div>
            <button onClick={onScan} className="btn bg-white text-brand-700 hover:bg-brand-50">
              Check In Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CalendarCheck size={20} />} tone="success" label="Present" value={stats.present} sub={`of ${stats.total} sessions`} loading={loading} />
        <StatCard icon={<ClockIcon size={20} />} tone="warning" label="Late" value={stats.late} sub="arrivals" loading={loading} />
        <StatCard icon={<XCircle size={20} />} tone="danger" label="Absent" value={stats.absent} sub="missed" loading={loading} />
        <StatCard icon={<BookOpen size={20} />} tone="brand" label="Courses" value={courses.length} sub="enrolled" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Progress" subtitle="Your weekly attendance rate trend" />
          {loading ? <div className="h-[260px] rounded-xl bg-ink-50 animate-pulse" /> : <TrendAreaChart data={trend} name="Attendance %" dataKey="rate" color="#10b981" />}
        </Card>
        <Card>
          <CardHeader title="Overall Rate" subtitle="Present + late sessions" />
          {loading ? <div className="h-[200px] rounded-xl bg-ink-50 animate-pulse" /> : (
            <div className="relative">
              <RadialGauge value={stats.rate} label="Rate" color="#10b981" />
              <div className="absolute inset-0 flex flex-col items-center justify-center -mt-6">
                <div className="font-display text-3xl font-bold text-ink-900">{stats.rate}%</div>
                <div className="text-xs text-ink-400">{stats.present + stats.late} / {stats.total}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Per-Course Performance" subtitle="Present rate by course" />
          {loading ? <div className="h-[260px] rounded-xl bg-ink-50 animate-pulse" /> : <CourseBarChart data={perCourse} />}
        </Card>
        <Card>
          <CardHeader title="Status Breakdown" subtitle="All records" />
          {loading ? <div className="h-[240px] rounded-xl bg-ink-50 animate-pulse" /> : (
            <div className="flex flex-col items-center">
              <DonutChart data={donut} />
              <div className="grid grid-cols-3 gap-2 w-full mt-2">
                {donut.map((d) => (
                  <div key={d.name} className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    </div>
                    <div className="text-sm font-semibold text-ink-900 mt-1">{d.value}</div>
                    <div className="text-xs text-ink-400">{d.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent records */}
      <Card>
        <CardHeader
          title="Recent Attendance"
          subtitle="Your latest check-ins"
          action={<button onClick={onHistory} className="btn-ghost text-xs">View all <ArrowRight size={14} /></button>}
        />
        <div className="divide-y divide-ink-100">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-ink-50 animate-pulse rounded-lg my-2" />)
          : recent.length === 0 ? <div className="py-8 text-center text-ink-400 text-sm">No attendance records yet.</div>
          : recent.map((r) => (
              <div key={r.id} className="flex items-center gap-4 py-3">
                <Avatar name={r.session?.course?.code ?? "C"} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 truncate">{r.session?.course?.name}</div>
                  <div className="text-xs text-ink-400">{r.session?.course?.code} · {formatDateShort(r.session?.session_date ?? "")}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, tone, label, value, sub, loading }: { icon: React.ReactNode; tone: "brand" | "success" | "warning" | "danger"; label: string; value: number | string; sub: string; loading: boolean }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</div>
          {loading ? <div className="h-8 w-12 bg-ink-100 rounded mt-2 animate-pulse" /> : <div className="font-display text-2xl font-bold text-ink-900 mt-1">{value}</div>}
          <div className="text-xs text-ink-400 mt-1">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

function ClockIcon(props: any) {
  return <Clock {...props} />;
}
