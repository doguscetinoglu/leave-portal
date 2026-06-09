import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRequest, approveRequest, rejectRequest } from "@/lib/logoflow";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    select: {
      id: true,
      leaveType: true,
      startDate: true,
      endDate: true,
      days: true,
      address: true,
      description: true,
      status: true,
      logoFlowId: true,
      logoFlowStatus: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true, department: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const userRole = (session.user as { role?: string }).role;
  if (request.userId !== session.user.id && userRole !== "MANAGER" && userRole !== "HR_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.json(request);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, note } = body;

  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const userRole = (session.user as { role?: string }).role;

  if (action === "cancel") {
    if (request.userId !== session.user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    if (request.logoFlowId) {
      await cancelRequest(request.logoFlowId).catch(console.error);
    }
    await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    await prisma.statusHistory.create({
      data: { leaveRequestId: id, status: "CANCELLED", changedBy: session.user.email!, note },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "approve" || action === "reject") {
    if (userRole !== "MANAGER" && userRole !== "HR_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    if (action === "approve") {
      if (request.logoFlowId) await approveRequest(request.logoFlowId, note).catch(console.error);
      await prisma.leaveRequest.update({ where: { id }, data: { status: "APPROVED" } });
      await prisma.statusHistory.create({
        data: { leaveRequestId: id, status: "APPROVED", changedBy: session.user.email!, note },
      });
    } else {
      if (!note) return NextResponse.json({ error: "Red gerekçesi zorunlu" }, { status: 400 });
      if (request.logoFlowId) await rejectRequest(request.logoFlowId, note).catch(console.error);
      await prisma.leaveRequest.update({ where: { id }, data: { status: "REJECTED" } });
      await prisma.statusHistory.create({
        data: { leaveRequestId: id, status: "REJECTED", changedBy: session.user.email!, note },
      });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
}
