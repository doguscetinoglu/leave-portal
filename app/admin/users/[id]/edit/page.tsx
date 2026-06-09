import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserForm } from "@/components/admin/user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, managers] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, department: true, managerId: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["MANAGER", "HR_ADMIN"] }, NOT: { id } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

  return (
    <main className="p-6 max-w-2xl space-y-5 fade-up">
      <div>
        <Link href="/admin/users" className="text-sm flex items-center gap-1 mb-4"
          style={{ color: "var(--text-secondary)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kullanıcılara Dön
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Kullanıcı Düzenle</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
      </div>
      <UserForm
        mode="edit"
        userId={user.id}
        managers={managers}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department ?? "",
          managerId: user.managerId ?? "",
        }}
      />
    </main>
  );
}
