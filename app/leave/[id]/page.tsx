import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/portal/navbar";
import { StatusBadge, leaveTypeLabel } from "@/components/portal/status-badge";
import { CancelLeaveButton } from "@/components/portal/cancel-leave-button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const STEPS = ["PENDING", "IN_REVIEW", "APPROVED"] as const;
const STEP_LABELS: Record<string, string> = {
  PENDING: "Talep Oluşturuldu",
  IN_REVIEW: "Yönetici İncelemesinde",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
};

export default async function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    select: {
      id: true, leaveType: true, startDate: true, endDate: true, days: true,
      address: true, description: true, status: true, logoFlowId: true, createdAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  const userRole = user.role;
  if (request.userId !== user.id && userRole !== "MANAGER" && userRole !== "HR_ADMIN") redirect("/dashboard");

  const canCancel = request.userId === user.id && !["APPROVED", "REJECTED", "CANCELLED"].includes(request.status);
  const isTerminal = request.status === "REJECTED" || request.status === "CANCELLED";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <Navbar user={user} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 fade-up">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
          <Link href="/dashboard" style={{ color: "var(--primary)" }}>Ana Sayfa</Link>
          <span>/</span>
          <span>İzin Detayı</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {leaveTypeLabel(request.leaveType)}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {format(new Date(request.startDate), "d MMMM", { locale: tr })} –{" "}
              {format(new Date(request.endDate), "d MMMM yyyy", { locale: tr })} • {request.days} iş günü
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Timeline */}
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Onay Süreci</h2>
          </div>
          <div className="p-5">
            {isTerminal ? (
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--error-light)" }}
                >
                  <svg className="w-5 h-5" style={{ color: "var(--error)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium" style={{ color: "var(--text)" }}>{STEP_LABELS[request.status]}</p>
                  {request.statusHistory.slice(-1)[0]?.note && (
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {request.statusHistory.slice(-1)[0].note}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {STEPS.map((step, idx) => {
                  const entry = request.statusHistory.find((h) => h.status === step);
                  const done = !!entry;
                  const current = request.status === step && !done;
                  return (
                    <div key={step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: done ? "var(--success-light)" : current ? "var(--primary-light)" : "var(--bg-secondary)",
                          }}
                        >
                          {done ? (
                            <svg className="w-4 h-4" style={{ color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: current ? "var(--primary)" : "var(--text-tertiary)" }}
                            />
                          )}
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div
                            className="w-0.5 h-8 mt-1"
                            style={{ background: done ? "var(--success-light)" : "var(--border)" }}
                          />
                        )}
                      </div>
                      <div className="pb-6 pt-1.5">
                        <p
                          className="text-sm font-medium"
                          style={{ color: done ? "var(--success)" : current ? "var(--primary)" : "var(--text-tertiary)" }}
                        >
                          {STEP_LABELS[step]}
                        </p>
                        {entry && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                            {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
                            {entry.note && ` • ${entry.note}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detaylar */}
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>Talep Detayları</h2>
          <dl className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Tarih Aralığı",
                value: `${format(new Date(request.startDate), "d MMMM yyyy", { locale: tr })} – ${format(new Date(request.endDate), "d MMMM yyyy", { locale: tr })}`,
                full: true,
              },
              { label: "İzin Süresi", value: `${request.days} iş günü` },
              { label: "İzin Türü", value: leaveTypeLabel(request.leaveType) },
              ...(request.address ? [{ label: "İzin Adresi", value: request.address, full: true }] : []),
              ...(request.description ? [{ label: "Açıklama", value: request.description, full: true }] : []),
              ...(request.logoFlowId ? [{ label: "Flow ID", value: request.logoFlowId, mono: true }] : []),
            ].map((item, i) => (
              <div key={i} className={item.full ? "col-span-2" : ""}>
                <dt className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>{item.label}</dt>
                <dd
                  className={"text-sm font-medium " + (item.mono ? "font-mono text-xs" : "")}
                  style={{ color: item.mono ? "var(--text-secondary)" : "var(--text)" }}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {canCancel && (
          <div className="flex justify-end">
            <CancelLeaveButton requestId={request.id} />
          </div>
        )}
      </main>
    </div>
  );
}
