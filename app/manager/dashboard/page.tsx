import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/portal/navbar";
import { StatusBadge, leaveTypeLabel } from "@/components/portal/status-badge";
import { ApproveRejectButtons } from "@/components/portal/approve-reject-buttons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function ManagerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  if (user.role !== "MANAGER" && user.role !== "HR_ADMIN") redirect("/dashboard");

  const [pendingRequests, recentDecisions] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: { in: ["PENDING", "IN_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, leaveType: true, startDate: true, endDate: true,
        days: true, status: true, description: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, department: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, leaveType: true, startDate: true, endDate: true,
        days: true, status: true, updatedAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Yönetici Paneli</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Bekleyen onay talepleri ve son kararlar
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Bekleyen", value: pendingRequests.length, color: "var(--warning)" },
            { label: "Onaylanan", value: recentDecisions.filter((r) => r.status === "APPROVED").length, color: "var(--success)" },
            { label: "Reddedilen", value: recentDecisions.filter((r) => r.status === "REJECTED").length, color: "var(--error)" },
          ].map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text)" }}>
              Bekleyen Onaylar
              {pendingRequests.length > 0 && (
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "var(--warning-light)", color: "var(--warning)" }}
                >
                  {pendingRequests.length}
                </span>
              )}
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "var(--success-light)" }}
              >
                <svg className="w-7 h-7" style={{ color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium" style={{ color: "var(--text)" }}>Harika! Bekleyen talep yok.</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Tüm talepler işlendi.</p>
            </div>
          ) : (
            <div>
              {pendingRequests.map((req, i) => {
                const init = req.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4"
                    style={{ borderBottom: i < pendingRequests.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                        style={{ background: "var(--primary)" }}
                      >
                        {init}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{req.user.name}</p>
                          {req.user.department && (
                            <span
                              className="badge"
                              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                            >
                              {req.user.department}
                            </span>
                          )}
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {leaveTypeLabel(req.leaveType)} •{" "}
                          {format(new Date(req.startDate), "d MMM", { locale: tr })} –{" "}
                          {format(new Date(req.endDate), "d MMM yyyy", { locale: tr })} •{" "}
                          <strong>{req.days} gün</strong>
                        </p>
                        {req.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{req.description}</p>
                        )}
                      </div>
                    </div>
                    <ApproveRejectButtons requestId={req.id} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent decisions */}
        {recentDecisions.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Son Kararlar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Çalışan", "İzin Türü", "Tarih", "Gün", "Durum"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentDecisions.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: i < recentDecisions.length - 1 ? "1px solid var(--border)" : "none" }}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>{r.user.name}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{leaveTypeLabel(r.leaveType)}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {format(new Date(r.startDate), "d MMM", { locale: tr })} – {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>{r.days}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
