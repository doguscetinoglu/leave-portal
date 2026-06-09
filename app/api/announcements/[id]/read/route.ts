import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId: session.user.id } },
    update: {},
    create: { announcementId: id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
