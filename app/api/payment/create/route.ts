import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";
import * as z from "zod";

const createPaymentSchema = z.object({
  orderId: z.string(),
});

export async function POST(req: Request) {
  let userId: string = "mock-user-id";
  let body: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = (session.user as any).id;
    body = await req.json();
    const { orderId } = createPaymentSchema.parse(body);

    // Fetch the order
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Order is already paid or cancelled" },
        { status: 400 }
      );
    }

    // Convert order total to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(order.total * 100);

    const isPlaceholder = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_placeholder");
    if (isPlaceholder) {
      console.warn("Using simulated Razorpay order response (placeholder keys detected)");
      return NextResponse.json({
        id: `order_mock_${Math.random().toString(36).substring(2, 9)}`,
        amount: amountInPaise,
        currency: "INR",
        receipt: order.id,
        keyId: "rzp_test_placeholder",
        isMockPayment: true,
      });
    }

    // Call Razorpay API to create an order
    const rpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.id,
      notes: {
        userId: userId,
        orderId: order.id,
      },
    });

    // Check if a payment record already exists for this order
    const existingPayment = order.payments.find(
      (p) => p.razorpayOrderId === rpOrder.id
    );

    if (!existingPayment) {
      // Create a pending Payment record in the database
      await db.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: rpOrder.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({
      id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      receipt: rpOrder.receipt,
      keyId: process.env.RAZORPAY_KEY_ID || "",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Razorpay order generation error, attempting offline mock order mode:", error);
    
    // If the database is offline and we are handling a mock order
    if (body && body.orderId && body.orderId.startsWith("mock-order-")) {
      const isPlaceholder = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_placeholder");
      if (isPlaceholder) {
        console.warn("Using simulated Razorpay order response (placeholder keys detected)");
        return NextResponse.json({
          id: `order_mock_${Math.random().toString(36).substring(2, 9)}`,
          amount: 500,
          currency: "INR",
          receipt: body.orderId,
          keyId: "rzp_test_placeholder",
          isMockPayment: true,
        });
      }

      try {
        const amountInPaise = 500; // ₹5 = 500 paise!
        const rpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: body.orderId,
          notes: {
            userId: userId,
            orderId: body.orderId,
          },
        });
        
        return NextResponse.json({
          id: rpOrder.id,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          receipt: rpOrder.receipt,
          keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
        });
      } catch (rpErr) {
        console.error("Failed to call Razorpay in mock mode:", rpErr);
      }
    }

    return NextResponse.json(
      { error: "Failed to generate payment transaction" },
      { status: 500 }
    );
  }
}
