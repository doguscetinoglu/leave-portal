import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/portal/navbar";
import { StatusBadge, leaveTypeLabel } from "@/components/portal/status-badge";
import { AnnouncementConfirmModal } from "@/components/portal/announcement-confirm-modal";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const year = new Date().getFullYear();

  const [balances, recentRequests, announcements, activeRequest, unconfirmedAnnouncements] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { userId, year } }),
    prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.leaveRequest.findFirst({
      where: { userId, status: { in: ["PENDING", "IN_REVIEW"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.announcement.findMany({
      where: {
        isActive: true,
        requiresConfirmation: true,
        reads: { none: { userId } },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, content: true },
    }),
  ]);

  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  const annualBal = balances.find((b) => b.leaveType === "ANNUAL");
  const sickBal = balances.find((b) => b.leaveType === "SICK");
  const annualLeft = annualBal ? annualBal.totalDays - annualBal.usedDays : 20;
  const sickLeft = sickBal ? sickBal.totalDays - sickBal.usedDays : 5;
  const firstName = user.name?.split(" ")[0] ?? "Kullanıcı";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <Navbar user={user} />
      {unconfirmedAnnouncements.length > 0 && (
        <AnnouncementConfirmModal announcements={unconfirmedAnnouncements} />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
            </p>
            <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
              Merhaba, {firstName} 👋
            </h1>
          </div>
          <Link href="/leave/new" className="btn-primary self-start sm:self-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni İzin Talebi
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Yıllık Bakiye */}
          <div className="card p-5 col-span-2 sm:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>
              Yıllık İzin
            </p>
            <p className="text-4xl font-bold" style={{ color: "var(--primary)" }}>
              {annualLeft}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              gün kaldı • {annualBal?.usedDays ?? 0} kullanıldı
            </p>
          </div>

          {/* Sağlık */}
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>
              Sağlık İzni
            </p>
            <p className="text-4xl font-bold" style={{ color: "var(--success)" }}>
              {sickLeft}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              gün kaldı
            </p>
          </div>

          {/* Aktif talep */}
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>
              Aktif Talep
            </p>
            {activeRequest ? (
              <div>
                <StatusBadge status={activeRequest.status} />
                <p className="text-sm font-medium mt-2" style={{ color: "var(--text)" }}>
                  {leaveTypeLabel(activeRequest.leaveType)}
                </p>
                <Link href={`/leave/${activeRequest.id}`} className="text-xs mt-1 inline-block" style={{ color: "var(--primary)" }}>
                  Detay →
                </Link>
              </div>
            ) : (
              <p className="text-3xl font-bold" style={{ color: "var(--text-secondary)" }}>—</p>
            )}
          </div>

          {/* Toplam kullanılan */}
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>
              Bu Yıl
            </p>
            <p className="text-4xl font-bold" style={{ color: "var(--warning)" }}>
              {annualBal?.usedDays ?? 0}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              gün kullanıldı
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Geçmiş İzinler */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Son İzin Hareketleri</h2>
            </div>
            {recentRequests.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
                  <svg className="w-6 h-6" style={{ color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Henüz izin talebiniz yok</p>
              </div>
            ) : (
              <div>
                {recentRequests.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/leave/${r.id}`}
                    className="row-hover flex items-center gap-4 px-5 py-4"
                    style={{
                      borderBottom: i < recentRequests.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: "var(--primary-light)" }}
                    >
                      <svg className="w-5 h-5" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {leaveTypeLabel(r.leaveType)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {format(new Date(r.startDate), "d MMM", { locale: tr })} –{" "}
                        {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })} • {r.days} gün
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Duyurular */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Duyurular</h2>
            </div>
            {announcements.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Yeni duyuru yok</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      {a.title}
                    </p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                      {a.content}
                    </p>
                    <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
                      {format(new Date(a.createdAt), "d MMM", { locale: tr })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
