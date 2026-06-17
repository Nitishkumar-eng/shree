import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";

const wishlistSchema = z.object({
  productId: z.string(),
});

// GET: Fetch wishlist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const wishlist = await db.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(wishlist);
  } catch (error) {
    console.error("Fetch wishlist error:", error);
    return NextResponse.json({ error: "Failed to load wishlist" }, { status: 500 });
  }
}

// POST: Add to wishlist
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { productId } = wishlistSchema.parse(body);

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Product already in wishlist" });
    }

    const item = await db.wishlistItem.create({
      data: {
        userId,
        productId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Add to wishlist error:", error);
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 });
  }
}

// DELETE: Remove from wishlist
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await db.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return NextResponse.json({ message: "Removed from wishlist" });
  } catch (error) {
    console.error("Delete wishlist error:", error);
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 });
  }
}
