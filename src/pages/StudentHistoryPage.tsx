import { useMemo, useState } from "react";
import { ArrowLeft, Search, Filter, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StackedBarChart } from "@/components/charts/Charts";
import type { Course, RecordWithMeta } from "@/lib/hooks";
import { formatDate, percent } from "@/lib/utils";

export function StudentHistoryPage({
  courses,
  records,
  onBack,
}: {
  courses: Course[];
  records: RecordWithMeta[];
  onBack: () => void;
}) {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (courseFilter !== "all" && r.session?.course?.id !== courseFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search && !r.session?.course?.name.toLowerCase().includes(search.toLowerCase()) && !r.session?.course?.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [records, courseFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const present = filtered.filter((r) => r.status === "present").length;
    const late = filtered.filter((r) => r.status === "late").length;
    const absent = filtered.filter((r) => r.status === "absent").length;
    return { present, late, absent, total: filtered.length, rate: percent(present + late, filtered.length) };
  }, [filtered]);

  const byCourse = useMemo(() => {
    return courses.map((c) => {
      const cRecs = records.filter((r) => r.session?.course?.id === c.id);
      const present = cRecs.filter((r) => r.status === "present").length;
      const late = cRecs.filter((r) => r.status === "late").length;
      const absent = cRecs.filter((r) => r.status === "absent").length;
      return { label: c.code, present, late, absent };
    });
  }, [courses, records]);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Attendance History</h1>
        <p className="text-ink-500 mt-1">A complete record of your attendance across all courses.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<CheckCircle2 size={18} />} tone="success" label="Present" value={summary.present} />
        <SummaryCard icon={<Clock size={18} />} tone="warning" label="Late" value={summary.late} />
        <SummaryCard icon={<XCircle size={18} />} tone="danger" label="Absent" value={summary.absent} />
        <SummaryCard icon={<Calendar size={18} />} tone="brand" label="Rate" value={`${summary.rate}%`} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader title="Breakdown by Course" subtitle="Present, late, and absent per course" />
        <StackedBarChart data={byCourse} />
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader title="All Records" subtitle={`${filtered.length} records`} />
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search course..." className="input pl-9" />
          </div>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input">
            <option value="all">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase tracking-wider">
                <th className="px-2 py-2 font-medium">Course</th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Method</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((r) => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.session?.course?.code ?? "C"} size="sm" />
                      <div>
                        <div className="font-medium text-ink-900">{r.session?.course?.name}</div>
                        <div className="text-xs text-ink-400">{r.session?.course?.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-ink-600">{formatDate(r.session?.session_date ?? "")}</td>
                  <td className="px-2 py-3 capitalize text-ink-600">{r.session?.method ?? "—"}</td>
                  <td className="px-2 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-ink-400">No records match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, tone, label, value }: { icon: React.ReactNode; tone: "success" | "warning" | "danger" | "brand"; label: string; value: number | string }) {
  const tones: Record<string, string> = {
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
    brand: "bg-brand-50 text-brand-600",
  };
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
        <div>
          <div className="text-xs text-ink-400 uppercase tracking-wider">{label}</div>
          <div className="font-display text-xl font-bold text-ink-900">{value}</div>
        </div>
      </div>
    </Card>
  );
}
