import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const method = paymentEntity.method || "ONLINE";

      const payment = await db.payment.findUnique({
        where: { razorpayOrderId },
      });

      if (payment && payment.status !== "COMPLETED") {
        await db.$transaction([
          db.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              razorpayPaymentId,
              method,
            },
          }),
          db.order.update({
            where: { id: payment.orderId },
            data: { status: "CONFIRMED" },
          }),
        ]);
        console.log(`Webhook: Payment captured for local order ID: ${payment.orderId}`);
      }
    }

    if (event === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      const payment = await db.payment.findUnique({
        where: { razorpayOrderId },
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        console.log(`Webhook: Payment failed for local order ID: ${payment.orderId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook signature or parsing failed" },
      { status: 500 }
    );
  }
}
