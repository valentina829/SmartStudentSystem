import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type DemoUser = {
  email: string;
  password: string;
  role: "professor" | "student";
  full_name: string;
  student_number?: string;
  department: string;
};

const demoUsers: DemoUser[] = [
  {
    email: "professor@university.edu",
    password: "professor123",
    role: "professor",
    full_name: "Dr. Sarah Mitchell",
    department: "Computer Science",
  },
  {
    email: "student1@university.edu",
    password: "student123",
    role: "student",
    full_name: "James Anderson",
    student_number: "CS-2021-045",
    department: "Computer Science",
  },
  {
    email: "student2@university.edu",
    password: "student123",
    role: "student",
    full_name: "Emily Rodriguez",
    student_number: "CS-2021-051",
    department: "Computer Science",
  },
  {
    email: "student3@university.edu",
    password: "student123",
    role: "student",
    full_name: "Michael Chen",
    student_number: "CS-2021-067",
    department: "Computer Science",
  },
  {
    email: "student4@university.edu",
    password: "student123",
    role: "student",
    full_name: "Olivia Park",
    student_number: "CS-2021-072",
    department: "Computer Science",
  },
];

const courseSeed = [
  {
    code: "CS401",
    name: "Advanced Algorithms",
    semester: "Fall 2025",
    schedule_day: "Mon, Wed, Fri",
    start_time: "09:00",
    end_time: "10:30",
    room: "Engineering Hall 204",
  },
  {
    code: "CS405",
    name: "Database Systems",
    semester: "Fall 2025",
    schedule_day: "Tue, Thu",
    start_time: "11:00",
    end_time: "12:30",
    room: "Science Block 110",
  },
  {
    code: "CS410",
    name: "Machine Learning",
    semester: "Fall 2025",
    schedule_day: "Mon, Wed",
    start_time: "14:00",
    end_time: "15:30",
    room: "Tech Center 305",
  },
];

async function upsertUser(u: DemoUser): Promise<string> {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing.users.find((x) => x.email === u.email);
  if (found) {
    await supabase.from("profiles").upsert({
      id: found.id,
      role: u.role,
      full_name: u.full_name,
      student_number: u.student_number ?? null,
      department: u.department,
    }, { onConflict: "id" });
    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`);

  await supabase.from("profiles").upsert({
    id: data.user.id,
    role: u.role,
    full_name: u.full_name,
    student_number: u.student_number ?? null,
    department: u.department,
  }, { onConflict: "id" });

  return data.user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ids: Record<string, string> = {};
    for (const u of demoUsers) {
      ids[u.email] = await upsertUser(u);
    }

    const profId = ids["professor@university.edu"];
    const studentIds = [
      ids["student1@university.edu"],
      ids["student2@university.edu"],
      ids["student3@university.edu"],
      ids["student4@university.edu"],
    ];

    // Upsert courses
    const courseRows = courseSeed.map((c) => ({
      ...c,
      professor_id: profId,
    }));
    const { data: courses, error: courseErr } = await supabase
      .from("courses")
      .upsert(courseRows, { onConflict: "code", ignoreDuplicates: false })
      .select();
    if (courseErr) throw new Error(`courses: ${courseErr.message}`);

    // Note: upsert with onConflict requires unique constraint; ensure code unique.
    // If onConflict fails, fallback handled below.

    // Enroll all students in all courses
    const enrollmentRows: { course_id: string; student_id: string }[] = [];
    for (const c of courses) {
      for (const sid of studentIds) {
        enrollmentRows.push({ course_id: c.id, student_id: sid });
      }
    }
    await supabase.from("enrollments").upsert(enrollmentRows, {
      onConflict: "course_id,student_id",
      ignoreDuplicates: true,
    });

    // Seed attendance sessions + records for past 6 weeks per course
    const today = new Date();
    const statuses: ("present" | "late" | "absent")[] = ["present", "present", "present", "late", "absent"];
    const sessionRows: {
      course_id: string;
      session_date: string;
      start_time: string;
      end_time: string;
      status: string;
      method: string;
      qr_token: string;
    }[] = [];

    for (const c of courses) {
      for (let w = 6; w >= 1; w--) {
        const d = new Date(today);
        d.setDate(d.getDate() - w * 7);
        const dateStr = d.toISOString().slice(0, 10);
        const token = crypto.randomUUID();
        sessionRows.push({
          course_id: c.id,
          session_date: dateStr,
          start_time: c.start_time,
          end_time: c.end_time,
          status: "closed",
          method: w % 2 === 0 ? "qr" : "face",
          qr_token: token,
        });
      }
    }
    const { data: sessions, error: sessErr } = await supabase
      .from("attendance_sessions")
      .upsert(sessionRows, { onConflict: "course_id,session_date" })
      .select();
    if (sessErr) throw new Error(`sessions: ${sessErr.message}`);

    // Create records for each session/student
    const recordRows: {
      session_id: string;
      student_id: string;
      status: string;
      marked_at: string | null;
      method: string | null;
    }[] = [];
    for (const s of sessions) {
      const method = s.method;
      studentIds.forEach((sid, idx) => {
        // deterministic-ish distribution
        const status = statuses[(idx + Number(s.session_date.replace(/-/g, "").slice(-2))) % statuses.length];
        const markedAt = status === "absent"
          ? null
          : new Date(s.session_date + "T09:00:00Z").toISOString();
        recordRows.push({
          session_id: s.id,
          student_id: sid,
          status,
          marked_at: markedAt,
          method,
        });
      });
    }
    await supabase.from("attendance_records").upsert(recordRows, {
      onConflict: "session_id,student_id",
      ignoreDuplicates: true,
    });

    return new Response(
      JSON.stringify({
        seeded: true,
        users: demoUsers.length,
        courses: courses.length,
        sessions: sessions.length,
        records: recordRows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
