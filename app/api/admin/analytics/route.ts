import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Core Metrics
    // Calculate total revenue from non-pending, non-cancelled orders
    const completedOrders = await db.order.findMany({
      where: {
        status: {
          notIn: ["PENDING", "CANCELLED"],
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const totalRevenue = completedOrders.reduce((acc, order) => acc + order.total, 0);
    const totalOrders = completedOrders.length;

    const totalCustomers = await db.user.count({
      where: { role: "CUSTOMER" },
    });

    // Mock a conversion rate based on order count and customer signups
    const conversionRate = totalCustomers > 0 
      ? Math.min(Math.round((totalOrders / (totalCustomers * 3.5)) * 100 * 10) / 10, 100)
      : 0;

    // Get count of low stock variants (stock < 5)
    const lowStockCount = await db.productVariant.count({
      where: {
        stockQuantity: {
          lt: 5,
        },
      },
    });

    // 2. Revenue Chart Data (Group by last 7 days)
    const last7DaysData: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      last7DaysData[dateString] = 0;
    }

    completedOrders.forEach((order) => {
      const dateString = new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      if (dateString in last7DaysData) {
        last7DaysData[dateString] += order.total;
      }
    });

    const revenueChart = Object.entries(last7DaysData).map(([name, value]) => ({
      name,
      Revenue: Math.round(value),
    }));

    // 3. Top Products (By sales volume)
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          status: {
            notIn: ["PENDING", "CANCELLED"],
          },
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    const productSalesMap: {
      [key: string]: {
        name: string;
        brand: string;
        salesCount: number;
        revenue: number;
      };
    } = {};

    orderItems.forEach((item) => {
      const p = item.variant.product;
      const key = p.id;
      const amount = item.priceAtPurchase * item.quantity;
      if (!productSalesMap[key]) {
        productSalesMap[key] = {
          name: p.name,
          brand: p.brand,
          salesCount: 0,
          revenue: 0,
        };
      }
      productSalesMap[key].salesCount += item.quantity;
      productSalesMap[key].revenue += amount;
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    // 4. Low Stock Alerts Details
    const lowStockAlerts = await db.productVariant.findMany({
      where: {
        stockQuantity: {
          lt: 5,
        },
      },
      include: {
        product: true,
      },
      take: 5,
    });

    return NextResponse.json({
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalCustomers,
        conversionRate,
        lowStockCount,
      },
      revenueChart,
      topProducts,
      lowStockAlerts: lowStockAlerts.map((v) => ({
        id: v.id,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stockQuantity,
      })),
    });
  } catch (error) {
    console.error("Fetch dashboard analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
