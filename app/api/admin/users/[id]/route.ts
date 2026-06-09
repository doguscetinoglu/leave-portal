import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "HR_ADMIN") return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const { name, email, password, role, department, managerId } = await req.json();

  if (!name || !email) return NextResponse.json({ error: "Ad ve e-posta zorunlu" }, { status: 400 });

  const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (existing) return NextResponse.json({ error: "Bu e-posta zaten kullanımda" }, { status: 409 });

  const data: Record<string, unknown> = {
    name,
    email,
    role: role ?? "EMPLOYEE",
    department: department || null,
    managerId: managerId || null,
  };
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  }

  const leaveCount = await prisma.leaveRequest.count({ where: { userId: id } });
  if (leaveCount > 0) {
    return NextResponse.json(
      { error: `Bu kullanıcının ${leaveCount} izin talebi var. Önce talepleri silin.` },
      { status: 400 }
    );
  }

  await prisma.leaveBalance.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
