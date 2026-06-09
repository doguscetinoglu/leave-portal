import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "HR_ADMIN") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(announcements);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { title, content } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Başlık ve içerik zorunlu" }, { status: 400 });

  const announcement = await prisma.announcement.create({ data: { title, content } });
  return NextResponse.json(announcement, { status: 201 });
}
