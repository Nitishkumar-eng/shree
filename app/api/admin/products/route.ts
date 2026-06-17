import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mockDbStore } from "@/lib/mockDbStore";
import * as z from "zod";

const productCreateSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brand: z.string().min(2, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean().optional().default(true),
  hsnCode: z.string().optional(),
  gstRate: z.number().default(18.0),
  variants: z.array(
    z.object({
      size: z.string().optional(),
      color: z.string().optional(),
      sku: z.string().min(2, "SKU is required"),
      price: z.number().positive("Price must be positive"),
      mrp: z.number().positive("MRP must be positive"),
      stockQuantity: z.number().int().nonnegative("Stock quantity must be non-negative"),
      images: z.array(z.string()),
    })
  ).optional(),
});

// GET: Fetch all products for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const products = await db.product.findMany({
        include: {
          category: true,
          variants: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(products);
    } catch (dbError) {
      console.warn("Admin fetch products database error, falling back to mock store:", dbError);
      return NextResponse.json(mockDbStore.getProducts());
    }
  } catch (error) {
    console.error("Admin fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST: Create product with optional variants
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = productCreateSchema.parse(body);

    const { name, slug, description, brand, categoryId, isActive, hsnCode, gstRate, variants } =
      validatedData;

    try {
      // Check slug duplicate in DB
      const slugExists = await db.product.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 }
        );
      }

      // Create product in DB
      const product = await db.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: {
            name,
            slug,
            description,
            brand,
            categoryId,
            isActive,
            hsnCode,
            gstRate,
          },
        });

        if (variants && variants.length > 0) {
          // Create variants linked to this product
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: newProduct.id,
              size: v.size || null,
              color: v.color || null,
              sku: v.sku,
              price: v.price,
              mrp: v.mrp,
              stockQuantity: v.stockQuantity,
              images: v.images,
            })),
          });
        }

        return tx.product.findUnique({
          where: { id: newProduct.id },
          include: { variants: true },
        });
      });

      return NextResponse.json(product, { status: 201 });
    } catch (dbError) {
      console.warn("Database connection failed, creating product in mock store:", dbError);
      
      const existing = mockDbStore.getProductBySlug(slug);
      if (existing) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 }
        );
      }

      const product = mockDbStore.addProduct(
        {
          name,
          slug,
          description,
          brand,
          categoryId,
          isActive: isActive ?? true,
          hsnCode: hsnCode || null,
          gstRate,
        },
        (variants || []).map(v => ({
          size: v.size || null,
          color: v.color || null,
          sku: v.sku,
          price: v.price,
          mrp: v.mrp,
          stockQuantity: v.stockQuantity,
          images: v.images,
        }))
      );

      return NextResponse.json(product, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Admin create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

