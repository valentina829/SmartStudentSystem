import { useState } from "react";
import { GraduationCap, Mail, Lock, ArrowRight, ShieldCheck, Users, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const demoAccounts = [
  { label: "Professor", email: "professor@university.edu", password: "professor123", role: "professor" as const },
  { label: "Student", email: "student1@university.edu", password: "student123", role: "student" as const },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  function quickLogin(acc: typeof demoAccounts[number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 35%)",
        }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="font-display font-bold text-xl">AttendIQ</div>
              <div className="text-xs text-brand-100">Smart Attendance Management</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight text-balance">
            Attendance, reimagined for the modern classroom.
          </h1>
          <p className="text-brand-100 text-lg max-w-md">
            Real-time analytics, QR-based check-ins, and live face recognition — all in one elegant dashboard built for your thesis.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <Stat icon={<Users size={18} />} value="1,240+" label="Students" />
            <Stat icon={<ShieldCheck size={18} />} value="98.6%" label="Accuracy" />
            <Stat icon={<GraduationCap size={18} />} value="42" label="Courses" />
          </div>
        </div>

        <div className="relative text-xs text-brand-200">
          University Thesis Project · 2025
        </div>
      </div>

      {/* Right login form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center">
              <GraduationCap size={22} />
            </div>
            <div className="font-display font-bold text-lg text-ink-900">AttendIQ</div>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900">Welcome back</h2>
          <p className="text-ink-500 mt-1.5">Sign in to access your attendance dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@university.edu"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-danger-50 border border-danger-200 px-3.5 py-3 text-sm text-danger-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-ink-400 uppercase tracking-wider">Quick demo access</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => quickLogin(acc)}
                  className="group rounded-xl border border-ink-200 p-3.5 text-left hover:border-brand-300 hover:bg-brand-50/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-800">{acc.label}</span>
                    <ArrowRight size={14} className="text-ink-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-xs text-ink-400 mt-1 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-ink-400 mt-4">
              Click a role to autofill, then press Sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2.5">
      <div className="flex items-center gap-2 text-brand-100">{icon}</div>
      <div className="font-display font-bold text-lg mt-1">{value}</div>
      <div className="text-xs text-brand-200">{label}</div>
    </div>
  );
}
