import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "HR_ADMIN") return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const announcement = await prisma.announcement.update({ where: { id }, data });
  return NextResponse.json(announcement);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
