import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";

const validateCouponSchema = z.object({
  code: z.string().toUpperCase(),
  orderAmount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code, orderAmount } = validateCouponSchema.parse(body);

    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "Coupon code has been deactivated" }, { status: 400 });
    }

    if (coupon.expiry < new Date()) {
      return NextResponse.json({ error: "Coupon code has expired" }, { status: 400 });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon code usage limit reached" }, { status: 400 });
    }

    if (orderAmount < coupon.minOrder) {
      return NextResponse.json(
        { error: `Minimum order amount of ₹${coupon.minOrder} is required for this coupon` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.discountType === "PERCENT") {
      discount = (orderAmount * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    // Cap discount at order amount
    discount = Math.round(Math.min(discount, orderAmount) * 100) / 100;

    return NextResponse.json({
      success: true,
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      discountAmount: discount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Coupon validation error:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}
