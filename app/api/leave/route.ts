import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitLeaveRequest } from "@/lib/logoflow";
import { calculateWorkdays } from "@/lib/utils/workdays";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      leaveType: true,
      startDate: true,
      endDate: true,
      days: true,
      status: true,
      logoFlowStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leaveType, startDate, endDate, address, handoverPersonId, description } = body;

  if (!leaveType || !startDate || !endDate) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = calculateWorkdays(start, end);

  if (days === 0) {
    return NextResponse.json({ error: "Seçilen tarihler arasında iş günü bulunmuyor" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      address,
      handoverPersonId,
      description,
      status: "PENDING",
      statusHistory: {
        create: { status: "PENDING", changedBy: user.email, note: "Talep oluşturuldu" },
      },
    },
  });

  try {
    const flowRes = await submitLeaveRequest({
      employeeId: user.id,
      employeeName: user.name,
      employeeEmail: user.email,
      leaveType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days,
      description,
      handoverPerson: handoverPersonId ?? undefined,
      address: address ?? undefined,
      portalRequestId: leaveRequest.id,
    });

    await prisma.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: { logoFlowId: flowRes.flowId, logoFlowStatus: flowRes.status, status: "IN_REVIEW" },
    });

    await prisma.statusHistory.create({
      data: {
        leaveRequestId: leaveRequest.id,
        status: "IN_REVIEW",
        changedBy: "SYSTEM",
        note: "Logo Flow sürecine gönderildi",
      },
    });
  } catch (err) {
    console.error("LogoFlow submit failed:", err);
  }

  return NextResponse.json(leaveRequest, { status: 201 });
}
