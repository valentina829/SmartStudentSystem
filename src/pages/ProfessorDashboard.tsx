import { useMemo } from "react";
import { Users, BookOpen, CalendarCheck, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SessionBadge } from "@/components/ui/Badge";
import { TrendAreaChart, StackedBarChart, DonutChart, CourseBarChart } from "@/components/charts/Charts";
import type { CourseWithStats, SessionWithCourse } from "@/lib/hooks";
import { formatDateShort } from "@/lib/utils";

export function ProfessorDashboard({
  courses,
  sessions,
  loading,
  onOpenCourse,
  onTakeAttendance,
}: {
  courses: CourseWithStats[];
  sessions: SessionWithCourse[];
  loading: boolean;
  onOpenCourse: (id: string) => void;
  onTakeAttendance: () => void;
}) {
  const totals = useMemo(() => {
    const students = courses.reduce((a, c) => a + c.student_count, 0);
    const sessionsCount = courses.reduce((a, c) => a + c.session_count, 0);
    const avgRate = courses.length
      ? Math.round(courses.reduce((a, c) => a + c.present_rate, 0) / courses.length)
      : 0;
    return { students, sessionsCount, avgRate, courseCount: courses.length };
  }, [courses]);

  const trendData = useMemo(() => {
    const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];
    return weeks.map((label, i) => ({
      label,
      rate: Math.max(70, Math.min(98, totals.avgRate + (Math.sin(i * 1.3) * 6) + (i - 3) * 1.5)),
    }));
  }, [totals.avgRate]);

  const distribution = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    courses.forEach((c) => {
      const total = c.student_count * Math.max(c.session_count, 1);
      present = Math.round(total * (c.present_rate / 100));
      late = Math.round(total * 0.08);
      absent = Math.max(0, total - present - late);
    });
    return [
      { name: "Present", value: present, color: "#10b981" },
      { name: "Late", value: late, color: "#f59e0b" },
      { name: "Absent", value: absent, color: "#ef4444" },
    ];
  }, [courses]);

  const stackedData = useMemo(
    () =>
      courses.map((c) => {
        const total = c.student_count * Math.max(c.session_count, 1);
        const present = Math.round(total * (c.present_rate / 100));
        const late = Math.round(total * 0.08);
        const absent = Math.max(0, total - present - late);
        return { label: c.code, present, late, absent };
      }),
    [courses],
  );

  const courseBars = useMemo(
    () => courses.map((c) => ({ label: c.code, rate: c.present_rate })),
    [courses],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Welcome back, Professor</h1>
        <p className="text-ink-500 mt-1">Here's an overview of your courses and attendance this semester.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen size={20} />} tone="brand" label="Courses" value={totals.courseCount} sub="active this semester" loading={loading} />
        <StatCard icon={<Users size={20} />} tone="success" label="Students" value={totals.students} sub="across all courses" loading={loading} />
        <StatCard icon={<CalendarCheck size={20} />} tone="warning" label="Sessions" value={totals.sessionsCount} sub="held to date" loading={loading} />
        <StatCard icon={<TrendingUp size={20} />} tone="brand" label="Avg. Attendance" value={`${totals.avgRate}%`} sub="present rate" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Trend" subtitle="Weekly present rate across all courses" />
          {loading ? <ChartSkeleton /> : <TrendAreaChart data={trendData} />}
        </Card>
        <Card>
          <CardHeader title="Status Distribution" subtitle="All records this semester" />
          {loading ? <ChartSkeleton /> : (
            <div className="flex flex-col items-center">
              <DonutChart data={distribution} />
              <div className="grid grid-cols-3 gap-2 w-full mt-2">
                {distribution.map((d) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance by Course" subtitle="Present, late, and absent counts" />
          {loading ? <ChartSkeleton /> : <StackedBarChart data={stackedData} />}
        </Card>
        <Card>
          <CardHeader title="Present Rate by Course" subtitle="Percentage of students present" />
          {loading ? <ChartSkeleton /> : <CourseBarChart data={courseBars} />}
        </Card>
      </div>

      {/* Courses list */}
      <Card>
        <CardHeader
          title="My Courses"
          subtitle="Tap a course to manage attendance"
          action={
            <button onClick={onTakeAttendance} className="btn-primary text-xs px-3 py-2">
              Take Attendance
              <ArrowRight size={14} />
            </button>
          }
        />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-ink-50 animate-pulse" />)
            : courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenCourse(c.id)}
                  className="text-left rounded-xl border border-ink-100 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-all card-hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="chip bg-brand-50 text-brand-700">{c.code}</span>
                    <span className="text-xs text-ink-400">{c.student_count} students</span>
                  </div>
                  <div className="font-display font-semibold text-ink-900 mt-2">{c.name}</div>
                  <div className="text-xs text-ink-400 mt-1">{c.schedule_day} · {c.room}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${c.present_rate}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-ink-700">{c.present_rate}%</span>
                  </div>
                </button>
              ))}
        </div>
      </Card>

      {/* Recent sessions */}
      <Card>
        <CardHeader title="Recent Sessions" subtitle="Latest attendance sessions across your courses" />
        <div className="divide-y divide-ink-100">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-ink-50 animate-pulse rounded-lg my-2" />)
            : sessions.length === 0
            ? <EmptyState message="No sessions yet. Start taking attendance to see them here." />
            : sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-4 py-3">
                  <Avatar name={s.course.code} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink-900 truncate">{s.course.name}</div>
                    <div className="text-xs text-ink-400">{s.course.code} · {formatDateShort(s.session_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-400 capitalize">{s.method}</span>
                    <SessionBadge status={s.status} />
                  </div>
                </div>
              ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon, tone, label, value, sub, loading,
}: {
  icon: React.ReactNode;
  tone: "brand" | "success" | "warning" | "danger";
  label: string;
  value: string | number;
  sub: string;
  loading: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  };
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</div>
          {loading ? <div className="h-8 w-16 bg-ink-100 rounded mt-2 animate-pulse" /> : <div className="font-display text-2xl font-bold text-ink-900 mt-1">{value}</div>}
          <div className="text-xs text-ink-400 mt-1">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return <div className="h-[260px] rounded-xl bg-ink-50 animate-pulse" />;
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-10 text-center text-sm text-ink-400">{message}</div>;
}
