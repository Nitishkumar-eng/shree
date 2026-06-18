import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { shiprocketClient } from "@/lib/shiprocket";

// POST: Register order in Shiprocket and fetch courier rates
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "SHIPPER" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch order details from database
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { address: true, payments: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let shiprocketOrderId = order.shiprocketOrderId;
    let shiprocketShipmentId = order.shiprocketShipmentId;

    // 2. Push to Shiprocket if not already pushed
    if (!shiprocketOrderId || !shiprocketShipmentId) {
      const result = await shiprocketClient.createOrder(orderId);
      shiprocketOrderId = result.shiprocketOrderId;
      shiprocketShipmentId = result.shiprocketShipmentId;

      // Update order in database with Shiprocket credentials
      await db.order.update({
        where: { id: orderId },
        data: {
          shiprocketOrderId,
          shiprocketShipmentId,
          status: "PROCESSING" // Set to processing when pushed
        }
      });
    }

    const isCod = order.payments && order.payments[0]?.method === "COD";

    // 3. Fetch courier rates
    const courierRates = await shiprocketClient.getCourierRates(
      shiprocketShipmentId!,
      order.address.pincode,
      order.total,
      isCod
    );

    return NextResponse.json({
      success: true,
      shiprocketOrderId,
      shiprocketShipmentId,
      courierRates
    });
  } catch (error: any) {
    console.error("Shiprocket API create/rate error:", error);
    return NextResponse.json({ error: error.message || "Failed to link with Shiprocket" }, { status: 500 });
  }
}

// PATCH: Select Courier, Assign AWB, and Generate Shipping Label PDF
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "SHIPPER" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, courierCompanyId, courierName } = body;

    if (!orderId || !courierCompanyId || !courierName) {
      return NextResponse.json({ error: "Missing parameters: orderId, courierCompanyId, courierName are required" }, { status: 400 });
    }

    // Fetch order
    const order = await db.order.findUnique({
      where: { id: orderId }
    });

    if (!order || !order.shiprocketShipmentId) {
      return NextResponse.json({ error: "Order not registered with Shiprocket yet" }, { status: 400 });
    }

    // 1. Assign AWB and Courier
    const { awbNumber } = await shiprocketClient.assignAwb(order.shiprocketShipmentId, Number(courierCompanyId));

    // 2. Generate Label URL PDF
    const labelUrl = await shiprocketClient.generateLabel(order.shiprocketShipmentId);

    // 3. Update order in database (Status to SHIPPED, set AWB/tracking, assign courier)
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        awbNumber,
        trackingNumber: awbNumber, // Keep in sync with existing tracking logic
        courierName,
        shippingLabelUrl: labelUrl,
        status: "SHIPPED",
        shippedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error: any) {
    console.error("Shiprocket API assign/label error:", error);
    return NextResponse.json({ error: error.message || "Failed to finalize shipment" }, { status: 500 });
  }
}
