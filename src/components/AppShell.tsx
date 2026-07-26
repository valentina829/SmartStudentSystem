import { type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  QrCode,
  ScanFace,
  History,
  LogOut,
  GraduationCap,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { twMerge } from "@/lib/utils";

export type NavKey =
  | "dashboard"
  | "courses"
  | "take-attendance"
  | "scan-qr"
  | "history"
  | "profile";

type NavItem = {
  key: NavKey;
  label: string;
  icon: ReactNode;
  roles: ("professor" | "student")[];
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["professor", "student"] },
  { key: "courses", label: "My Courses", icon: <BookOpen size={18} />, roles: ["professor", "student"] },
  { key: "take-attendance", label: "Take Attendance", icon: <QrCode size={18} />, roles: ["professor"] },
  { key: "scan-qr", label: "Check In", icon: <ScanFace size={18} />, roles: ["student"] },
  { key: "history", label: "Attendance History", icon: <History size={18} />, roles: ["student"] },
  { key: "profile", label: "Profile", icon: <User size={18} />, roles: ["student"] },
];

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? "student";
  const items = navItems.filter((i) => i.roles.includes(role));

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-ink-100 bg-white">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="font-display font-bold text-ink-900 leading-tight">AttendIQ</div>
            <div className="text-[11px] text-ink-400 leading-tight">Smart Attendance</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={twMerge(
                "sidebar-item w-full text-left",
                active === item.key && "sidebar-item-active",
              )}
            >
              <span className={active === item.key ? "text-brand-600" : "text-ink-400"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-ink-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={profile?.full_name ?? "U"} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900 truncate">{profile?.full_name}</div>
              <div className="text-xs text-ink-400 capitalize">{role}</div>
            </div>
            <button
              onClick={signOut}
              className="text-ink-400 hover:text-danger-600 transition-colors p-1.5 rounded-lg hover:bg-danger-50"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar role={role} profileName={profile?.full_name ?? "User"} onNavigate={onNavigate} active={active} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

function TopBar({
  role,
  profileName,
  onNavigate,
  active,
}: {
  role: string;
  profileName: string;
  onNavigate: (key: NavKey) => void;
  active: NavKey;
}) {
  const items = navItems.filter((i) => i.roles.includes(role as "professor" | "student"));
  return (
    <header className="h-16 border-b border-ink-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 md:px-6">
      <div className="md:hidden flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center">
          <GraduationCap size={18} />
        </div>
        <span className="font-display font-bold text-ink-900">AttendIQ</span>
      </div>
      <div className="hidden md:block">
        <h2 className="font-display text-lg font-semibold text-ink-900 capitalize">
          {items.find((i) => i.key === active)?.label ?? "Dashboard"}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-xs font-medium text-ink-600">System Online</span>
        </div>
        <Avatar name={profileName} size="sm" />
      </div>
    </header>
  );
}
