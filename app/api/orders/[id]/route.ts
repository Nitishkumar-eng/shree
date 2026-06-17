import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";
import { mockDbStore } from "@/lib/mockDbStore";

const updateOrderSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "REFUNDED",
  ]),
});

// GET: Fetch order details
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (params.id.startsWith("mock-order-")) {
      const mockOrder = mockDbStore.getOrderById(params.id);
      if (mockOrder) {
        if (mockOrder.userId !== userId && userRole !== "ADMIN") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        return NextResponse.json(mockOrder);
      }
    }

    const order = await db.order.findUnique({
      where: { id: params.id },
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
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Protect checking other users' orders
    if (order.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.warn("Fetch order detail database error, returning mock order:", error);
    
    // Fallback to mockDbStore
    const mockOrder = mockDbStore.getOrderById(params.id);
    if (mockOrder) {
      return NextResponse.json(mockOrder);
    }
    
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

// PATCH: Cancel / Request return for customer OR full updates for Admin
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (params.id.startsWith("mock-order-")) {
      const body = await req.json();
      const { status } = updateOrderSchema.parse(body);
      const mockOrder = mockDbStore.getOrderById(params.id);
      if (!mockOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (mockOrder.userId !== userId && userRole !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const updated = mockDbStore.updateOrderStatus(params.id, status);
      return NextResponse.json(updated);
    }

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Non-admins can only cancel/request return for their own orders
    if (order.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = updateOrderSchema.parse(body);

    // If customer is updating
    if (userRole !== "ADMIN") {
      if (status === "CANCELLED") {
        // Can only cancel if PENDING or CONFIRMED
        if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
          return NextResponse.json(
            { error: "Cannot cancel order. It is already being processed or shipped" },
            { status: 400 }
          );
        }

        // Restock inventory on cancellation
        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });

          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        });

        return NextResponse.json({ message: "Order cancelled successfully" });
      }

      if (status === "RETURN_REQUESTED") {
        // Can only request return if DELIVERED
        if (order.status !== "DELIVERED") {
          return NextResponse.json(
            { error: "You can only request return after the order is delivered" },
            { status: 400 }
          );
        }

        const updated = await db.order.update({
          where: { id: order.id },
          data: { status: "RETURN_REQUESTED" },
        });

        return NextResponse.json(updated);
      }

      return NextResponse.json({ error: "Operation not permitted" }, { status: 400 });
    }

    // If Admin is updating status
    if (status === "CANCELLED") {
      // If admin cancels, we also restock
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      });
      return NextResponse.json({ message: "Order cancelled by Admin" });
    }

    const updated = await db.order.update({
      where: { id: order.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update order error, falling back to mockDbStore:", error);
    try {
      const body = await req.json().catch(() => ({}));
      const { status } = updateOrderSchema.parse(body);
      const updated = mockDbStore.updateOrderStatus(params.id, status);
      if (updated) {
        return NextResponse.json(updated);
      }
    } catch (fallbackErr) {
      console.error("Fallback mock update error:", fallbackErr);
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
