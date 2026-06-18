import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendShippingUpdateEmail, sendDeliveryConfirmationEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SHIPPER" && userRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    where: {
      status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "PENDING"] },
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      address: true,
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SHIPPER" && userRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, status, trackingNumber, shippingNotes } = await req.json();

  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (shippingNotes) updateData.shippingNotes = shippingNotes;
  if (status === "SHIPPED") updateData.shippedAt = new Date();
  if (status === "DELIVERED") updateData.deliveredAt = new Date();

  const order = await db.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      user: true,
      address: true,
    },
  });

  // Fire email notifications
  if (status === "SHIPPED" && order.user.email) {
    const trackingLink = trackingNumber
      ? `https://www.google.com/search?q=${encodeURIComponent(trackingNumber + " tracking")}`
      : undefined;
    await sendShippingUpdateEmail(
      order.user.email,
      order.user.name,
      order.id.slice(0, 8).toUpperCase(),
      trackingNumber || "",
      trackingLink
    );
  }

  if (status === "DELIVERED" && order.user.email) {
    await sendDeliveryConfirmationEmail(
      order.user.email,
      order.user.name,
      order.id.slice(0, 8).toUpperCase()
    );
  }

  return NextResponse.json({ order });
}
