import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";

const variantSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  size: z.string().optional(),
  color: z.string().optional(),
  sku: z.string().min(2, "SKU is required"),
  price: z.number().positive("Price must be positive"),
  mrp: z.number().positive("MRP must be positive"),
  stockQuantity: z.number().int().nonnegative("Stock quantity must be non-negative"),
  images: z.array(z.string()),
});

const variantUpdateSchema = z.object({
  id: z.string().min(1, "Variant ID is required"),
  size: z.string().optional(),
  color: z.string().optional(),
  sku: z.string().min(2, "SKU is required").optional(),
  price: z.number().positive("Price must be positive").optional(),
  mrp: z.number().positive("MRP must be positive").optional(),
  stockQuantity: z.number().int().nonnegative("Stock quantity must be non-negative").optional(),
  images: z.array(z.string()).optional(),
});

// POST: Add new variant to product
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = variantSchema.parse(body);

    // SKU check
    const skuExists = await db.productVariant.findUnique({
      where: { sku: validatedData.sku },
    });

    if (skuExists) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }

    const variant = await db.productVariant.create({
      data: validatedData,
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create variant error:", error);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}

// PUT: Update a variant
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = variantUpdateSchema.parse(body);
    const { id, ...data } = validatedData;

    // Check SKU duplicate
    if (data.sku) {
      const skuExists = await db.productVariant.findFirst({
        where: {
          sku: data.sku,
          NOT: { id },
        },
      });

      if (skuExists) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
      }
    }

    const variant = await db.productVariant.update({
      where: { id },
      data,
    });

    return NextResponse.json(variant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update variant error:", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

// DELETE: Delete a variant
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Variant ID required" }, { status: 400 });
    }

    // Check if variant has purchases
    const ordersCount = await db.orderItem.count({
      where: { productVariantId: id },
    });

    if (ordersCount > 0) {
      // Set stock to 0 to prevent further selling rather than hard deleting
      await db.productVariant.update({
        where: { id },
        data: { stockQuantity: 0 },
      });
      return NextResponse.json({
        message: "Variant cannot be deleted as it has purchase history. Stock has been set to 0 instead.",
      });
    }

    await db.productVariant.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Variant deleted successfully" });
  } catch (error) {
    console.error("Delete variant error:", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
