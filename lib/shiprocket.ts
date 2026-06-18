import { db } from "./db";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

function formatAddressLine(street: string): string {
  const clean = street.trim();
  const hasNumberPrefix = /^[0-9#]/i.test(clean) || 
                          /^(flat|plot|house|shop|room|no|road|building|block|street)/i.test(clean);
  if (hasNumberPrefix) {
    return clean;
  }
  return `Flat/Plot, ${clean}`;
}

// Helper to authenticate and get token
async function getAuthToken(): Promise<string | null> {
  // Check cache (tokens are usually valid for 10 days, we'll cache for 1 day)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn("Shiprocket credentials missing from environment. Operating in MOCK mode.");
    return null;
  }

  try {
    const res = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        cachedToken = data.token;
        // Token expires in 10 days, cache for 9 days to be safe
        tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
        return cachedToken;
      }
    } else {
      console.warn("Shiprocket auth login failed. Server responded with status:", res.status);
    }
  } catch (err) {
    console.error("Shiprocket authentication error:", err);
  }

  return null;
}

export interface ShiprocketCourier {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;
}

export const shiprocketClient = {
  // 1. Create Ad-hoc Order
  createOrder: async (orderId: string) => {
    const token = await getAuthToken();
    
    // Fetch full order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        address: true,
        payments: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
              }
            }
          }
        }
      }
    });

    if (!order) throw new Error("Order not found");

    const isCod = order.payments && order.payments[0]?.method === "COD";

    // Split name
    const nameParts = order.address.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const orderItems = order.items.map(item => ({
      name: item.variant.product.name,
      sku: item.variant.sku,
      units: item.quantity,
      selling_price: item.priceAtPurchase,
      discount: 0
    }));

    if (!token) {
      // Return mock order IDs
      console.log("Shiprocket: Simulating Order Creation (MOCK MODE)");
      return {
        shiprocketOrderId: "SR-MOCK-ORD-" + Math.floor(Math.random() * 900000 + 100000),
        shiprocketShipmentId: "SR-MOCK-SHIP-" + Math.floor(Math.random() * 900000 + 100000)
      };
    }

    try {
      const orderDateString = new Date(order.createdAt).toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .substring(0, 16); // format: YYYY-MM-DD HH:MM

      const formattedAddress = formatAddressLine(order.address.street);

      const payload = {
        order_id: order.id,
        order_date: orderDateString,
        pickup_location: "Primary", // Requires pre-configured location name in Shiprocket dashboard
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: formattedAddress,
        billing_address_2: "",
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: "India",
        billing_email: order.user.email,
        billing_phone: order.address.phone,
        shipping_is_billing: true,
        shipping_customer_name: firstName,
        shipping_last_name: lastName,
        shipping_address: formattedAddress,
        shipping_address_2: "",
        shipping_city: order.address.city,
        shipping_pincode: order.address.pincode,
        shipping_state: order.address.state,
        shipping_country: "India",
        shipping_email: order.user.email,
        shipping_phone: order.address.phone,
        order_items: orderItems,
        payment_method: isCod ? "COD" : "Prepaid",
        sub_total: order.subtotal,
        length: 12, // default skincare package size
        breadth: 12,
        height: 8,
        weight: 0.45 // average skincare weight
      };

      const res = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create order on Shiprocket");
      }

      const data = await res.json();
      return {
        shiprocketOrderId: String(data.order_id),
        shiprocketShipmentId: String(data.shipment_id)
      };
    } catch (err: any) {
      console.error("Shiprocket createOrder error:", err);
      throw new Error(err.message || "Shiprocket connection error");
    }
  },

  // 2. Fetch Servicable Couriers & Rates
  getCourierRates: async (shipmentId: string, deliveryPincode: string, finalTotal: number, isCod: boolean): Promise<ShiprocketCourier[]> => {
    const token = await getAuthToken();

    if (!token) {
      // Return mock courier partners
      console.log("Shiprocket: Fetching Courier Rates (MOCK MODE)");
      return [
        { courier_company_id: 10001, courier_name: "Delhivery Surface", rate: 58.00, etd: "3-4 days" },
        { courier_company_id: 10002, courier_name: "Blue Dart Air Express", rate: 125.00, etd: "1-2 days" },
        { courier_company_id: 10003, courier_name: "DTDC Courier", rate: 65.00, etd: "2-3 days" },
        { courier_company_id: 10004, courier_name: "Xpressbees", rate: 49.00, etd: "4-5 days" }
      ];
    }

    try {
      const queryParams = new URLSearchParams({
        pickup_postcode: "560038", // Origin Pincode (Dewkit Warehouse, Bengaluru)
        delivery_postcode: deliveryPincode,
        weight: "0.45",
        cod: isCod ? "1" : "0",
        declared_value: String(finalTotal)
      });

      const res = await fetch(`${SHIPROCKET_BASE_URL}/courier/serviceability?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to get courier rates from Shiprocket");
      }

      const data = await res.json();
      const couriers = data.data?.available_courier_companies || [];
      
      return couriers.map((c: any) => ({
        courier_company_id: c.courier_company_id,
        courier_name: c.courier_name,
        rate: Number(c.rate),
        etd: c.etd || "3-5 days"
      })).sort((a: any, b: any) => a.rate - b.rate); // Sort by cheapest rate
    } catch (err) {
      console.error("Shiprocket getCourierRates error:", err);
      // Fallback on error to ensure dashboard doesn't break
      return [
        { courier_company_id: 10001, courier_name: "Delhivery Surface (Fallback)", rate: 59.00, etd: "3-4 days" },
        { courier_company_id: 10003, courier_name: "DTDC Courier (Fallback)", rate: 69.00, etd: "2-3 days" }
      ];
    }
  },

  // 3. Assign Courier and Generate AWB
  assignAwb: async (shipmentId: string, courierCompanyId: number) => {
    const token = await getAuthToken();

    if (!token) {
      console.log("Shiprocket: Generating AWB number (MOCK MODE)");
      return {
        awbNumber: "SR" + Math.floor(Math.random() * 900000000 + 100000000) + "IN"
      };
    }

    try {
      const res = await fetch(`${SHIPROCKET_BASE_URL}/courier/assign/awb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          shipment_id: shipmentId,
          courier_id: courierCompanyId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to assign AWB / courier");
      }

      const data = await res.json();
      const awb = data.response?.data?.awb_code;

      if (!awb) throw new Error("Shiprocket did not return an AWB code");
      return { awbNumber: String(awb) };
    } catch (err: any) {
      console.error("Shiprocket assignAwb error:", err);
      throw new Error(err.message || "Failed to generate AWB code");
    }
  },

  // 4. Generate Shipping Label Link
  generateLabel: async (shipmentId: string): Promise<string> => {
    const token = await getAuthToken();

    if (!token) {
      console.log("Shiprocket: Generating Shipping Label URL (MOCK MODE)");
      return "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"; // dummy mock PDF
    }

    try {
      const res = await fetch(`${SHIPROCKET_BASE_URL}/coupon/label`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          shipment_id: [shipmentId]
        })
      });

      if (!res.ok) {
        throw new Error("Failed to generate label from Shiprocket");
      }

      const data = await res.json();
      const labelUrl = data.label_url;

      if (!labelUrl) throw new Error("No label URL returned by Shiprocket");
      return labelUrl;
    } catch (err) {
      console.error("Shiprocket generateLabel error:", err);
      return "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"; // return fallback dummy
    }
  }
};
