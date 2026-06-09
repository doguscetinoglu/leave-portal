import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  if (user.role !== "HR_ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-secondary)" }}>
      <AdminSidebar user={user} />
      <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
