import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mockDbStore } from "@/lib/mockDbStore";

// GET: Fetch all orders (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await db.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
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
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.warn("Admin fetch orders database error, returning mock orders:", error);
    const mockOrders = mockDbStore.getOrders();
    return NextResponse.json(mockOrders);
  }
}
