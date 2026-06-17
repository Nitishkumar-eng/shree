import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mockDbStore } from "@/lib/mockDbStore";
import * as z from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  parentId: z.string().optional().nullable(),
});

// GET: Fetch all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        parent: true,
        subCategories: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.warn("Fetch categories error, falling back to mock store:", error);
    return NextResponse.json(mockDbStore.getCategories());
  }
}

// POST: Add new category
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = categorySchema.parse(body);

    try {
      const slugExists = await db.category.findUnique({
        where: { slug: validatedData.slug },
      });

      if (slugExists) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
      }

      const category = await db.category.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          parentId: validatedData.parentId || null,
        },
      });

      return NextResponse.json(category, { status: 201 });
    } catch (dbError) {
      console.warn("Database connection failed, creating category in mock store:", dbError);
      
      const existing = mockDbStore.getCategories().find(c => c.slug === validatedData.slug);
      if (existing) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
      }

      const category = mockDbStore.addCategory({
        name: validatedData.name,
        slug: validatedData.slug,
        parentId: validatedData.parentId || null,
      });

      return NextResponse.json(category, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

