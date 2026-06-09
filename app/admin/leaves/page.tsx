import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatusBadge, leaveTypeLabel } from "@/components/portal/status-badge";
import { ApproveRejectButtons } from "@/components/portal/approve-reject-buttons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const STATUS_TABS = [
  { value: "", label: "Tümü" },
  { value: "PENDING", label: "Bekleyen" },
  { value: "IN_REVIEW", label: "İncelemede" },
  { value: "APPROVED", label: "Onaylanan" },
  { value: "REJECTED", label: "Reddedilen" },
  { value: "CANCELLED", label: "İptal" },
];

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { status, q } = await searchParams;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.user = { name: { contains: q, mode: "insensitive" } };
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, leaveType: true, startDate: true, endDate: true,
      days: true, status: true, description: true, createdAt: true,
      user: { select: { name: true, email: true, department: true } },
    },
  });

  const pendingCount = await prisma.leaveRequest.count({
    where: { status: { in: ["PENDING", "IN_REVIEW"] } },
  });

  return (
    <main className="p-6 space-y-5 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>İzin Talepleri</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {pendingCount > 0 && (
              <span style={{ color: "var(--warning)" }}>{pendingCount} bekleyen onay • </span>
            )}
            {requests.length} talep gösteriliyor
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1">
          <input
            type="text"
            name="q"
            defaultValue={q}
            className="input-apple w-full"
            placeholder="Çalışan adı ile ara..."
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const isActive = (status ?? "") === tab.value;
          const href = tab.value
            ? `/admin/leaves?status=${tab.value}${q ? `&q=${q}` : ""}`
            : `/admin/leaves${q ? `?q=${q}` : ""}`;
          return (
            <Link
              key={tab.value}
              href={href}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: isActive ? "var(--primary)" : "var(--surface)",
                color: isActive ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Çalışan", "İzin Türü", "Tarih Aralığı", "Gün", "Durum", "Tarih", "İşlem"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => {
                const init = r.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                const isPending = r.status === "PENDING" || r.status === "IN_REVIEW";
                return (
                  <tr key={r.id} style={{ borderBottom: i < requests.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "var(--primary)" }}>
                          {init}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.user.name}</p>
                          {r.user.department && (
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.user.department}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {leaveTypeLabel(r.leaveType)}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {format(new Date(r.startDate), "d MMM", { locale: tr })} –{" "}
                      {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>
                      {r.days}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {format(new Date(r.createdAt), "d MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-5 py-3.5">
                      {isPending ? (
                        <ApproveRejectButtons requestId={r.id} />
                      ) : (
                        <Link
                          href={`/leave/${r.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                        >
                          Detay
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    Bu kriterlere uygun talep bulunamadı
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
