import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "HR_ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const reads = await prisma.announcementRead.findMany({
    where: { announcementId: id },
    orderBy: { readAt: "asc" },
    select: {
      readAt: true,
      user: { select: { name: true, email: true, department: true } },
    },
  });

  return NextResponse.json(reads);
}
