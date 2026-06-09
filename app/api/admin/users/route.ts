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

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, department: true, managerId: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { name, email, password, role, department, managerId } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Ad, e-posta ve şifre zorunlu" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Bu e-posta zaten kullanımda" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role ?? "EMPLOYEE",
      department: department || null,
      managerId: managerId || null,
    },
  });

  const year = new Date().getFullYear();
  await Promise.all([
    prisma.leaveBalance.create({ data: { userId: user.id, year, leaveType: "ANNUAL", totalDays: 20, usedDays: 0 } }),
    prisma.leaveBalance.create({ data: { userId: user.id, year, leaveType: "SICK", totalDays: 5, usedDays: 0 } }),
  ]);

  return NextResponse.json(user, { status: 201 });
}
