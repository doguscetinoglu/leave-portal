import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/portal/navbar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend } from "date-fns";
import { tr } from "date-fns/locale";

function dateSet(start: Date, end: Date): Set<string> {
  const s = new Set<string>();
  const days = eachDayOfInterval({ start, end });
  days.forEach((d) => s.add(format(d, "yyyy-MM-dd")));
  return s;
}

const STATUS_BG: Record<string, string> = {
  APPROVED: "var(--success)",
  PENDING: "var(--warning)",
  IN_REVIEW: "var(--primary)",
};

export default async function TeamCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  if (user.role !== "MANAGER" && user.role !== "HR_ADMIN") redirect("/dashboard");

  const { month } = await searchParams;
  const targetDate = month ? new Date(month + "-01") : new Date();
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const [requests, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING", "IN_REVIEW"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { id: true, startDate: true, endDate: true, status: true, user: { select: { id: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "MANAGER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  function getEmpDays(empId: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const r of requests) {
      if (r.user.id !== empId) continue;
      const days = dateSet(new Date(r.startDate), new Date(r.endDate));
      days.forEach((d) => { result[d] = STATUS_BG[r.status] ?? "var(--text-tertiary)"; });
    }
    return result;
  }

  const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
    (d) => !isWeekend(d) && isSameMonth(d, targetDate)
  );

  const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const nextMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <Navbar user={user} />

      <main className="max-w-full px-4 sm:px-6 py-8 fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Ekip Takvimi</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              İzin çakışmalarını görüntüleyin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/manager/calendar?month=${format(prevMonth, "yyyy-MM")}`}
              className="btn-secondary px-3 py-2 text-sm"
            >
              ← Önceki
            </a>
            <span className="px-4 py-2 font-semibold text-sm" style={{ color: "var(--text)" }}>
              {format(targetDate, "MMMM yyyy", { locale: tr })}
            </span>
            <a
              href={`/manager/calendar?month=${format(nextMonth, "yyyy-MM")}`}
              className="btn-secondary px-3 py-2 text-sm"
            >
              Sonraki →
            </a>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 max-w-6xl mx-auto">
          {[
            { label: "Onaylandı", color: "var(--success)" },
            { label: "Bekliyor", color: "var(--warning)" },
            { label: "İncelemede", color: "var(--primary)" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>

        {/* Calendar table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: "600px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="text-left py-3 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: "var(--text-secondary)",
                    background: "var(--surface)",
                    minWidth: "130px",
                  }}
                >
                  Çalışan
                </th>
                {calDays.map((day) => (
                  <th
                    key={day.toString()}
                    className="py-3 px-1 font-medium text-center"
                    style={{ color: "var(--text-tertiary)", minWidth: "34px" }}
                  >
                    <div style={{ color: "var(--text)" }}>{format(day, "d")}</div>
                    <div>{format(day, "EEE", { locale: tr })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, ri) => {
                const leaveDays = getEmpDays(emp.id);
                return (
                  <tr
                    key={emp.id}
                    style={{ borderBottom: ri < employees.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <td
                      className="py-2.5 px-4 font-medium text-sm sticky left-0 z-10"
                      style={{
                        color: "var(--text)",
                        background: "var(--surface)",
                      }}
                    >
                      {emp.name}
                    </td>
                    {calDays.map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const color = leaveDays[key];
                      return (
                        <td key={key} className="py-2 px-1 text-center">
                          {color && (
                            <div
                              className="w-5 h-5 rounded-full mx-auto"
                              style={{ background: color, opacity: 0.75 }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={calDays.length + 1}
                    className="py-12 text-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Çalışan bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
