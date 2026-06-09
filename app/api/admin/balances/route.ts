import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "HR_ADMIN") return null;
  return session;
}

export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const balances = await prisma.leaveBalance.findMany({
    where: { year },
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(balances);
}

export async function PUT(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { userId, year, balances } = await req.json();
  if (!userId || !year || !Array.isArray(balances)) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  await Promise.all(
    balances.map((b: { leaveType: string; totalDays: number; usedDays: number }) =>
      prisma.leaveBalance.upsert({
        where: { userId_year_leaveType: { userId, year, leaveType: b.leaveType as "ANNUAL" | "SICK" | "ADMINISTRATIVE" | "MATERNITY" | "OTHER" } },
        update: { totalDays: b.totalDays, usedDays: b.usedDays },
        create: { userId, year, leaveType: b.leaveType as "ANNUAL" | "SICK" | "ADMINISTRATIVE" | "MATERNITY" | "OTHER", totalDays: b.totalDays, usedDays: b.usedDays },
      })
    )
  );

  return NextResponse.json({ success: true });
}
