import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYEE: { label: "Çalışan", color: "var(--text-secondary)", bg: "var(--bg-secondary)" },
  MANAGER: { label: "Yönetici", color: "var(--primary)", bg: "var(--primary-light)" },
  HR_ADMIN: { label: "HR Admin", color: "var(--success)", bg: "var(--success-light)" },
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, role: true, department: true, createdAt: true,
      manager: { select: { name: true } },
      _count: { select: { leaveRequests: true } },
    },
  });

  return (
    <main className="p-6 space-y-5 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Kullanıcılar</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {users.length} kullanıcı
          </p>
        </div>
        <Link href="/admin/users/new" className="btn-primary">
          + Yeni Kullanıcı
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Ad Soyad", "E-posta", "Rol", "Departman", "Yönetici", "Talepler", "İşlemler"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const role = ROLE_LABELS[u.role] ?? ROLE_LABELS.EMPLOYEE;
                const init = u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "var(--primary)" }}>
                          {init}
                        </div>
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: role.bg, color: role.color }}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {u.department ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {u.manager?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text)" }}>
                      {u._count.leaveRequests}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/users/${u.id}/edit`}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: "var(--primary-light)", color: "var(--primary)" }}
                        >
                          Düzenle
                        </Link>
                        <DeleteUserButton userId={u.id} userName={u.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    Kullanıcı bulunamadı
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
