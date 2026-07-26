import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const brand = "#1f57f5";
const success = "#10b981";
const warning = "#f59e0b";
const danger = "#ef4444";
const ink = "#677092";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #eceef2",
  boxShadow: "0 4px 24px -8px rgba(16,24,40,0.12)",
  fontSize: 12,
  padding: "8px 12px",
};

export function TrendAreaChart({ data, dataKey = "rate", name = "Attendance", color = brand }: {
  data: any[];
  dataKey?: string;
  name?: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: ink }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StackedBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: ink }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
        <Bar dataKey="present" stackId="a" fill={success} radius={[0, 0, 0, 0]} />
        <Bar dataKey="late" stackId="a" fill={warning} radius={[0, 0, 0, 0]} />
        <Bar dataKey="absent" stackId="a" fill={danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadialGauge({ value, label, color = brand }: { value: number; label: string; color?: string }) {
  const data = [{ name: label, value, fill: color }];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
        <RadialBar background={{ fill: "#eceef2" }} dataKey="value" cornerRadius={20} fill={color} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export function CourseBarChart({ data }: { data: { label: string; rate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: ink }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: ink }} axisLine={false} tickLine={false} width={90} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="rate" name="Present %" fill={brand} radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
