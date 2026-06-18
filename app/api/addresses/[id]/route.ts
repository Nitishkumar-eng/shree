import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE: Delete an address by ID
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const addressId = params.id;

    // Check if the address exists and belongs to the user
    const address = await db.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (address.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if there are any orders referencing this address
    const linkedOrders = await db.order.findFirst({
      where: { addressId: addressId }
    });

    if (linkedOrders) {
      return NextResponse.json({ 
        error: "Cannot delete this address because it is associated with existing orders. You can add a new address instead." 
      }, { status: 400 });
    }

    await db.address.delete({
      where: { id: addressId },
    });

    return NextResponse.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}

// PATCH: Set address as default or update default status
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
    const addressId = params.id;
    
    const body = await req.json();
    const { isDefault } = body;

    // Check if the address exists and belongs to the user
    const address = await db.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (address.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If setting to default, unset all other default addresses for this user
    if (isDefault) {
      await db.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await db.address.update({
      where: { id: addressId },
      data: { isDefault: !!isDefault },
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error("Update address status error:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}
