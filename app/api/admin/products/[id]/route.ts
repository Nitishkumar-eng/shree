import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mockDbStore } from "@/lib/mockDbStore";
import * as z from "zod";

const productUpdateSchema = z.object({
  name: z.string().min(2, "Product name is required").optional(),
  slug: z.string().min(2, "Slug is required").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  brand: z.string().min(2, "Brand is required").optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  isActive: z.boolean().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.number().optional(),
});

// PUT: Update product details
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = productUpdateSchema.parse(body);

    try {
      // If slug is being updated, verify uniqueness
      if (validatedData.slug) {
        const existing = await db.product.findFirst({
          where: {
            slug: validatedData.slug,
            NOT: { id: params.id },
          },
        });

        if (existing) {
          return NextResponse.json(
            { error: "A product with this slug already exists" },
            { status: 400 }
          );
        }
      }

      const updatedProduct = await db.product.update({
        where: { id: params.id },
        data: validatedData,
        include: {
          variants: true,
        },
      });

      return NextResponse.json(updatedProduct);
    } catch (dbError) {
      console.warn("Database connection failed, updating product in mock store:", dbError);
      
      if (validatedData.slug) {
        const existing = mockDbStore.getProducts().find(
          p => p.slug === validatedData.slug && p.id !== params.id
        );
        if (existing) {
          return NextResponse.json(
            { error: "A product with this slug already exists" },
            { status: 400 }
          );
        }
      }

      const updated = mockDbStore.updateProduct(params.id, validatedData);
      if (!updated) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json(updated);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Admin update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE: Delete product
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Perform cascade delete (variants, reviews are cascading, orders/order items are not cascade delete due to foreign key, so we check if there are orders)
      const orderItemsCount = await db.orderItem.count({
        where: { variant: { productId: params.id } },
      });

      if (orderItemsCount > 0) {
        // If product has been ordered, we soft delete it (set isActive: false) to keep transactional history
        await db.product.update({
          where: { id: params.id },
          data: { isActive: false },
        });
        return NextResponse.json({
          message: "Product has previous orders. It has been deactivated to preserve transaction history.",
        });
      }

      // Hard delete since there are no purchases
      await db.product.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ message: "Product deleted successfully" });
    } catch (dbError) {
      console.warn("Database connection failed, deleting product from mock store:", dbError);
      const deleted = mockDbStore.deleteProduct(params.id);
      if (!deleted) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Product deleted successfully from mock store" });
    }
  } catch (error) {
    console.error("Admin delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

