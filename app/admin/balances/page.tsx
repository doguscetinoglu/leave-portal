import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BalanceRow } from "@/components/admin/balance-row";

export default async function AdminBalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const [users, balances] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "MANAGER"] } },
      select: { id: true, name: true, department: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.leaveBalance.findMany({
      where: { year },
      select: { userId: true, leaveType: true, totalDays: true, usedDays: true },
    }),
  ]);

  const balanceMap = new Map<string, { leaveType: string; totalDays: number; usedDays: number }[]>();
  for (const b of balances) {
    if (!balanceMap.has(b.userId)) balanceMap.set(b.userId, []);
    balanceMap.get(b.userId)!.push(b);
  }

  const prevYear = year - 1;
  const nextYear = year + 1;

  return (
    <main className="p-6 space-y-5 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>İzin Bakiyeleri</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Her çalışanın izin hakkını düzenle
          </p>
        </div>

        {/* Year nav */}
        <div className="flex items-center gap-2">
          <Link href={`/admin/balances?year=${prevYear}`} className="btn-secondary px-3 py-2 text-sm">
            ← {prevYear}
          </Link>
          <span className="px-4 py-2 font-semibold text-sm card" style={{ color: "var(--text)" }}>
            {year}
          </span>
          <Link href={`/admin/balances?year=${nextYear}`} className="btn-secondary px-3 py-2 text-sm">
            {nextYear} →
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-tertiary)", minWidth: "180px" }}>
                  Çalışan
                </th>
                <th colSpan={3} className="py-3 text-xs font-semibold uppercase tracking-wide text-center"
                  style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }}>
                  Yıllık İzin
                </th>
                <th colSpan={3} className="py-3 text-xs font-semibold uppercase tracking-wide text-center"
                  style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }}>
                  Sağlık İzni
                </th>
                <th className="py-3 text-xs font-semibold uppercase tracking-wide text-center"
                  style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }}>
                  İşlem
                </th>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                <th className="px-5 py-2 text-left" />
                {["Toplam", "Kullanılan", "Kalan", "Toplam", "Kullanılan", "Kalan"].map((h, idx) => (
                  <th key={idx} className="px-4 py-2 text-xs text-center font-medium"
                    style={{ color: "var(--text-secondary)", borderLeft: idx === 3 ? "1px solid var(--border)" : undefined }}>
                    {h}
                  </th>
                ))}
                <th className="px-4 py-2" style={{ borderLeft: "1px solid var(--border)" }} />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const userBalances = balanceMap.get(u.id) ?? [];
                const annual = userBalances.find((b) => b.leaveType === "ANNUAL") ?? null;
                const sick = userBalances.find((b) => b.leaveType === "SICK") ?? null;
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: "var(--text)" }}>{u.name}</p>
                      {u.department && (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.department}</p>
                      )}
                    </td>
                    <BalanceRow userId={u.id} year={year} annual={annual} sick={sick} />
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        * Toplam sütununu düzenleyip "Kaydet" butonuna basarak değiştirebilirsin.
      </p>
    </main>
  );
}
