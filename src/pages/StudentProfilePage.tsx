import { ArrowLeft, Mail, CreditCard, Building2, GraduationCap, Edit3, Check, X } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export function StudentProfilePage({ onBack }: { onBack: () => void }) {
  const { profile, session, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, department }).eq("id", profile?.id);
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={onBack} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0, transparent 40%)" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={profile.full_name} size="xl" className="ring-4 ring-white/20 h-24 w-24 text-3xl" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-brand-100 text-sm mt-1">{profile.student_number ?? "No student ID"} · {profile.department ?? "—"}</p>
            <div className="mt-2"><Badge tone="brand" className="bg-white/15 text-white capitalize">{profile.role}</Badge></div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn bg-white/15 text-white hover:bg-white/25 backdrop-blur">
              <Edit3 size={16} /> Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn bg-white text-brand-700 hover:bg-brand-50">
                <Check size={16} /> {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setFullName(profile.full_name); setDepartment(profile.department ?? ""); }} className="btn bg-white/15 text-white hover:bg-white/25">
                <X size={16} /> Cancel
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Personal Information" subtitle="Your account details" />
        <div className="space-y-1">
          <InfoRow icon={<Mail size={18} />} label="Email" value={session?.user?.email ?? "—"} />
          {editing ? (
            <>
              <div className="px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-ink-400" />
                  <div className="flex-1">
                    <div className="text-xs text-ink-400 uppercase tracking-wider">Full Name</div>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mt-1" />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-ink-400" />
                  <div className="flex-1">
                    <div className="text-xs text-ink-400 uppercase tracking-wider">Department</div>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} className="input mt-1" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <InfoRow icon={<CreditCard size={18} />} label="Student ID" value={profile.student_number ?? "—"} />
              <InfoRow icon={<Building2 size={18} />} label="Department" value={profile.department ?? "—"} />
            </>
          )}
          <InfoRow icon={<GraduationCap size={18} />} label="Role" value={profile.role} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" subtitle="Session metadata" />
        <div className="space-y-1">
          <InfoRow icon={<CreditCard size={18} />} label="User ID" value={profile.id} mono />
          <InfoRow icon={<Mail size={18} />} label="Member since" value={formatDate(profile.created_at)} />
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-ink-400">{icon}</div>
        <div className="flex-1">
          <div className="text-xs text-ink-400 uppercase tracking-wider">{label}</div>
          <div className={`text-sm text-ink-900 mt-0.5 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
