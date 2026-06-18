import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import * as z from "zod";
import { sendOrderConfirmationEmail, sendAdminOrderNotification, sendShipperOrderNotification } from "@/lib/emails";
import { mockDbStore } from "@/lib/mockDbStore";

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  orderId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } =
      verifyPaymentSchema.parse(body);

    const secret = process.env.RAZORPAY_KEY_SECRET || "";

    // Check if it's a mock payment
    const isMock = razorpayOrderId.startsWith("order_mock_") || razorpayOrderId === "mock_order_id";

    if (isMock) {
      console.warn("Verifying simulated Razorpay order signature (mock mode)");
      
      let payment: any = null;
      // Update DB if online, or update mockDbStore if offline
      try {
        payment = await db.payment.findUnique({
          where: { razorpayOrderId },
        });

        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              razorpayPaymentId,
              razorpaySignature,
              method: "ONLINE",
            },
          });

          await db.order.update({
            where: { id: payment.orderId },
            data: { status: "CONFIRMED" },
          });
        }
      } catch (dbErr) {
        console.warn("Database offline during mock order signature verification — updating mockDbStore:", dbErr);
        // Update the mock store to reflect a completed payment
        const targetOrderId = orderId || "mock-order-default";
        mockDbStore.updateOrderStatus(targetOrderId, "CONFIRMED");
        mockDbStore.addPaymentToOrder(targetOrderId, {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          status: "COMPLETED",
          method: "ONLINE",
        });
      }

      const confirmedOrderId = payment?.orderId || orderId || "mock-order-default";
      // Fire emails asynchronously
      Promise.all([
        sendOrderConfirmationEmail(confirmedOrderId).catch(e => console.error("User mock email failed:", e)),
        sendAdminOrderNotification(confirmedOrderId).catch(e => console.error("Admin mock email failed:", e)),
        sendShipperOrderNotification(confirmedOrderId).catch(e => console.error("Shipper mock email failed:", e)),
      ]);

      return NextResponse.json({
        success: true,
        message: "Payment verified successfully (Mock Mode)",
        orderId: confirmedOrderId,
      });
    }

    // 1. Verify Razorpay signature using HMAC-SHA256
    const text = razorpayOrderId + "|" + razorpayPaymentId;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    const isSignatureValid = generatedSignature === razorpaySignature;

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // 2. Database update in Transaction: Mark payment completed and order confirmed
    const result = await db.$transaction(async (tx) => {
      // Find the payment record
      const payment = await tx.payment.findUnique({
        where: { razorpayOrderId },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Update the payment record
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          razorpayPaymentId,
          razorpaySignature,
          method: "ONLINE", // Will be detailed if webhook captures details, or default ONLINE
        },
      });

      // Update the order status to CONFIRMED
      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "CONFIRMED",
        },
        include: {
          address: true,
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      return { updatedPayment, updatedOrder };
    });

    // 3. Trigger email confirmation asynchronously via Resend (Will handle errors gracefully)
    const confirmedOrderId = result.updatedOrder.id;
    Promise.all([
      sendOrderConfirmationEmail(confirmedOrderId).catch(e => console.error("User email failed:", e)),
      sendAdminOrderNotification(confirmedOrderId).catch(e => console.error("Admin email failed:", e)),
      sendShipperOrderNotification(confirmedOrderId).catch(e => console.error("Shipper email failed:", e)),
    ]);

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      orderId: result.updatedOrder.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification error" },
      { status: 500 }
    );
  }
}
