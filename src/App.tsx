import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabaseConfigError } from "@/lib/supabase";
import { LoginPage } from "@/pages/LoginPage";
import { AppShell, type NavKey } from "@/components/AppShell";
import { ProfessorDashboard } from "@/pages/ProfessorDashboard";
import { ProfessorCoursePage } from "@/pages/ProfessorCoursePage";
import { TakeAttendancePage } from "@/pages/TakeAttendancePage";
import { StudentDashboard } from "@/pages/StudentDashboard";
import { StudentHistoryPage } from "@/pages/StudentHistoryPage";
import { StudentCheckInPage } from "@/pages/StudentCheckInPage";
import { StudentProfilePage } from "@/pages/StudentProfilePage";
import { useProfessorData, useStudentData } from "@/lib/hooks";
import type { Profile } from "@/lib/supabase";

function ProfessorView({
  profile,
  nav,
  setNav,
  activeCourseId,
  setActiveCourseId,
}: {
  profile: Profile;
  nav: NavKey;
  setNav: (k: NavKey) => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
}) {
  const data = useProfessorData(profile);

  function openCourse(id: string) {
    setActiveCourseId(id);
    setNav("courses");
  }

  return (
    <>
      {nav === "dashboard" && (
        <ProfessorDashboard
          courses={data.courses}
          sessions={data.recentSessions}
          loading={data.loading}
          onOpenCourse={openCourse}
          onTakeAttendance={() => setNav("take-attendance")}
        />
      )}
      {nav === "courses" && activeCourseId && (
        <ProfessorCoursePage courseId={activeCourseId} onBack={() => { setActiveCourseId(null); setNav("dashboard"); }} />
      )}
      {nav === "courses" && !activeCourseId && (
        <ProfessorDashboard
          courses={data.courses}
          sessions={data.recentSessions}
          loading={data.loading}
          onOpenCourse={openCourse}
          onTakeAttendance={() => setNav("take-attendance")}
        />
      )}
      {nav === "take-attendance" && <TakeAttendancePage onBack={() => setNav("dashboard")} />}
    </>
  );
}

function StudentView({
  profile,
  nav,
  setNav,
}: {
  profile: Profile;
  nav: NavKey;
  setNav: (k: NavKey) => void;
}) {
  const data = useStudentData(profile);

  return (
    <>
      {(nav === "dashboard" || nav === "courses") && (
        <StudentDashboard
          profile={profile}
          courses={data.courses}
          records={data.records}
          loading={data.loading}
          onHistory={() => setNav("history")}
          onScan={() => setNav("scan-qr")}
        />
      )}
      {nav === "scan-qr" && <StudentCheckInPage profileId={profile.id} onBack={() => setNav("dashboard")} />}
      {nav === "history" && <StudentHistoryPage courses={data.courses} records={data.records} onBack={() => setNav("dashboard")} />}
      {nav === "profile" && <StudentProfilePage onBack={() => setNav("dashboard")} />}
    </>
  );
}

function Router() {
  const { profile, loading } = useAuth();
  const [nav, setNav] = useState<NavKey>("dashboard");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  if (supabaseConfigError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
        <div className="max-w-lg rounded-2xl bg-white border border-danger-200 p-8 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center">
              <span className="text-xl font-bold">!</span>
            </div>
            <h1 className="font-display text-lg font-bold text-ink-900">Configuration missing</h1>
          </div>
          <p className="text-sm text-ink-600 mb-4">{supabaseConfigError}</p>
          <div className="rounded-xl bg-ink-50 p-4 text-xs text-ink-600 font-mono">
            VITE_SUPABASE_URL=https://yfalhylroduqhsqctgll.supabase.co<br />
            VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
          </div>
          <p className="text-xs text-ink-400 mt-4">
            After creating the file, stop the dev server (Ctrl+C) and run <span className="font-mono">npm run dev</span> again.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 animate-pulse" />
          <div className="text-sm text-ink-400">Loading AttendIQ...</div>
        </div>
      </div>
    );
  }

  if (!profile) return <LoginPage />;

  function navigate(key: NavKey) {
    setNav(key);
    if (key !== "courses") setActiveCourseId(null);
  }

  return (
    <AppShell active={nav} onNavigate={navigate}>
      {profile.role === "professor" ? (
        <ProfessorView
          profile={profile}
          nav={nav}
          setNav={setNav}
          activeCourseId={activeCourseId}
          setActiveCourseId={setActiveCourseId}
        />
      ) : (
        <StudentView profile={profile} nav={nav} setNav={setNav} />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
