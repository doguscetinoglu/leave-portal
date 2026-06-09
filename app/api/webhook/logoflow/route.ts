import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@/app/generated/prisma/client";

const STATUS_MAP: Record<string, RequestStatus> = {
  PENDING: "PENDING",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.LOGOFLOW_WEBHOOK_SECRET && secret !== process.env.LOGOFLOW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { portalRequestId, flowId, status, note } = body;

  if (!portalRequestId || !status) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const mappedStatus = STATUS_MAP[status.toUpperCase()];
  if (!mappedStatus) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  await prisma.leaveRequest.update({
    where: { id: portalRequestId },
    data: {
      status: mappedStatus,
      logoFlowId: flowId ?? undefined,
      logoFlowStatus: status,
    },
  });

  await prisma.statusHistory.create({
    data: {
      leaveRequestId: portalRequestId,
      status: mappedStatus,
      changedBy: "SYSTEM",
      note: note ?? `Logo Flow: ${status}`,
    },
  });

  return NextResponse.json({ success: true });
}
