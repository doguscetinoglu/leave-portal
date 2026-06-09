import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge, leaveTypeLabel } from "@/components/portal/status-badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const year = new Date().getFullYear();
  const monthStart = new Date(year, new Date().getMonth(), 1);

  const [
    totalUsers,
    pendingCount,
    approvedThisMonth,
    recentRequests,
    totalUsedDays,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.leaveRequest.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", updatedAt: { gte: monthStart } } }),
    prisma.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, leaveType: true, startDate: true, endDate: true,
        days: true, status: true, createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.leaveBalance.aggregate({
      _sum: { usedDays: true },
      where: { year },
    }),
  ]);

  const stats = [
    { label: "Toplam Kullanıcı", value: totalUsers, color: "var(--primary)", icon: "👥" },
    { label: "Bekleyen Onay", value: pendingCount, color: "var(--warning)", icon: "⏳" },
    { label: "Bu Ay Onaylanan", value: approvedThisMonth, color: "var(--success)", icon: "✅" },
    { label: "Bu Yıl Kullanılan Gün", value: totalUsedDays._sum.usedDays ?? 0, color: "var(--text-secondary)", icon: "📅" },
  ];

  return (
    <main className="p-6 space-y-6 fade-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Genel Bakış</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {format(new Date(), "d MMMM yyyy", { locale: tr })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users/new" className="btn-primary text-sm px-4 py-2">
            + Kullanıcı Ekle
          </Link>
          <Link href="/admin/announcements" className="btn-secondary text-sm px-4 py-2">
            + Duyuru
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                {s.label}
              </p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "Kullanıcı Yönetimi", desc: "Ekle, düzenle, sil" },
          { href: "/admin/leaves", label: "İzin Talepleri", desc: "Onayla veya reddet" },
          { href: "/admin/balances", label: "İzin Bakiyeleri", desc: "Gün düzenle" },
          { href: "/admin/announcements", label: "Duyurular", desc: "Yönet" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="card p-4 block row-hover">
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{q.label}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent requests */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Son İzin Talepleri</h2>
          <Link href="/admin/leaves" className="text-sm" style={{ color: "var(--primary)" }}>
            Tümünü gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Çalışan", "İzin Türü", "Tarih", "Gün", "Durum"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < recentRequests.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>{r.user.name}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{leaveTypeLabel(r.leaveType)}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {format(new Date(r.startDate), "d MMM", { locale: tr })} – {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>{r.days}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {recentRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    Henüz izin talebi yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
