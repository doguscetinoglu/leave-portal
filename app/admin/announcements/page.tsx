import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AnnouncementFormButton,
  ToggleAnnouncementButton,
  DeleteAnnouncementButton,
} from "@/components/admin/announcement-actions";
import { AnnouncementReadersButton } from "@/components/admin/announcement-readers-button";

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [announcements, totalUsers] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reads: true } } },
    }),
    prisma.user.count({ where: { role: { in: ["EMPLOYEE", "MANAGER"] } } }),
  ]);

  const activeCount = announcements.filter((a) => a.isActive).length;
  const confirmCount = announcements.filter((a) => a.requiresConfirmation).length;

  return (
    <main className="p-6 space-y-5 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Duyurular</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {activeCount} aktif • {announcements.length - activeCount} pasif • {confirmCount} onay gerektiriyor
          </p>
        </div>
        <AnnouncementFormButton mode="create" />
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{a.title}</h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{
                      background: a.isActive ? "var(--success-light)" : "var(--bg-secondary)",
                      color: a.isActive ? "var(--success)" : "var(--text-tertiary)",
                    }}
                  >
                    {a.isActive ? "Aktif" : "Pasif"}
                  </span>
                  {a.requiresConfirmation && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: "var(--warning-light)", color: "var(--warning)" }}
                    >
                      Onay Gerekli
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {a.content}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {format(new Date(a.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                  </p>
                  {a.requiresConfirmation && (
                    <AnnouncementReadersButton
                      announcementId={a.id}
                      readCount={a._count.reads}
                      totalUsers={totalUsers}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AnnouncementFormButton
                  mode="edit"
                  id={a.id}
                  defaultTitle={a.title}
                  defaultContent={a.content}
                  defaultRequiresConfirmation={a.requiresConfirmation}
                />
                <ToggleAnnouncementButton id={a.id} isActive={a.isActive} />
                <DeleteAnnouncementButton id={a.id} title={a.title} />
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Henüz duyuru yok</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Yukarıdaki butonu kullanarak ilk duyuruyu oluştur
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
