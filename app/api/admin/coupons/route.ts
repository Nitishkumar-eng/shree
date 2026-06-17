import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";

const couponSchema = z.object({
  code: z.string().toUpperCase().min(3, "Coupon code must be at least 3 characters"),
  discountType: z.enum(["FLAT", "PERCENT"]),
  value: z.number().positive("Discount value must be positive"),
  minOrder: z.number().nonnegative("Minimum order must be non-negative"),
  maxUses: z.number().int().positive("Maximum uses must be at least 1"),
  expiry: z.string().transform((str) => new Date(str)),
  isActive: z.boolean().optional().default(true),
});

const couponUpdateSchema = z.object({
  id: z.string().min(1),
  code: z.string().toUpperCase().min(3).optional(),
  discountType: z.enum(["FLAT", "PERCENT"]).optional(),
  value: z.number().positive().optional(),
  minOrder: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  expiry: z.string().transform((str) => new Date(str)).optional(),
  isActive: z.boolean().optional(),
});

// GET: List all coupons
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Fetch coupons error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST: Create a coupon
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = couponSchema.parse(body);

    // Check code unique
    const existing = await db.coupon.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.create({
      data: validatedData,
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create coupon error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// PUT: Update coupon details
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = couponUpdateSchema.parse(body);
    const { id, ...data } = validatedData;

    // Check code unique if updating it
    if (data.code) {
      const existing = await db.coupon.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "A coupon with this code already exists" },
          { status: 400 }
        );
      }
    }

    const coupon = await db.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json(coupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update coupon error:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE: Delete coupon
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID required" }, { status: 400 });
    }

    await db.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
