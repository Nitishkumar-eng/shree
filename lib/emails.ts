import { resend } from "./resend";
import { db } from "./db";
import { calculateGst, GST_STATE_CODES } from "./gst";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/components/InvoicePDF";
import { mockDbStore } from "./mockDbStore";

const FROM_EMAIL = "Dewkit <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shree.com";
const SHIPPER_EMAIL = process.env.SHIPPER_EMAIL || "shipper@dewkit.in";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const ROSE = "#e11d48";
const LIGHT_ROSE = "#fdf2f8";
const PINK = "#fce7f3";

const emailWrap = (content: string) => `
<div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff0f6;border-radius:16px;overflow:hidden;border:1px solid #fbcfe8;">
  <div style="background:linear-gradient(135deg,#e11d48,#be185d);padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:28px;font-family:Georgia,serif;letter-spacing:-0.5px;">🌸 Dewkit</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Skincare That Glows</p>
  </div>
  <div style="padding:32px;">
    ${content}
  </div>
  <div style="background:#fce7f3;padding:20px 32px;text-align:center;border-top:1px solid #fbcfe8;">
    <p style="margin:0;color:#be185d;font-size:12px;">© 2025 Dewkit Skincare · <a href="${BASE_URL}" style="color:#e11d48;text-decoration:none;">dewkit.in</a></p>
    <p style="margin:4px 0 0;color:#9c4060;font-size:11px;">This email was sent from Dewkit. Please do not reply directly.</p>
  </div>
</div>`;

// Helper: safe sandbox email resolver
function getRecipientEmail(intendedEmail: string): string {
  const isDev = process.env.NODE_ENV !== "production" || process.env.NEXTAUTH_URL?.includes("localhost");
  const testEmail = process.env.RESEND_TEST_EMAIL || process.env.SHIPROCKET_EMAIL || "nikumar3140506@gmail.com";
  
  if (isDev) {
    if (intendedEmail.toLowerCase() === testEmail.toLowerCase()) {
      return intendedEmail;
    }
    console.log(`[Resend Sandbox] Redirecting email from ${intendedEmail} to verified sandbox email ${testEmail}`);
    return testEmail;
  }
  return intendedEmail;
}

// Helper: dev subject tagger
function getSubjectWithDevPrefix(subject: string, intendedEmail: string): string {
  const isDev = process.env.NODE_ENV !== "production" || process.env.NEXTAUTH_URL?.includes("localhost");
  if (isDev) {
    return `[DEV for: ${intendedEmail}] ${subject}`;
  }
  return subject;
}

// Helper: terminal console logger for emails
function logEmailToConsole(to: string, subject: string, html: string, attachments?: any[]) {
  console.log("\n=================== 🌸 EMAIL NOTIFICATION (FALLBACK) 🌸 ===================");
  console.log(`FROM:        Dewkit <onboarding@resend.dev>`);
  console.log(`TO:          ${to}`);
  console.log(`SUBJECT:     ${subject}`);
  console.log(`ATTACHMENTS: ${attachments?.map((a: any) => a.filename).join(", ") || "None"}`);
  console.log("-----------------------------------------------------------------");
  const textSnippet = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
  console.log(`${textSnippet}...`);
  console.log("=================================================================\n");
}

// Helper: database-to-mock store safe order details resolver
async function getOrderForEmail(orderId: string): Promise<any> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        address: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });
    if (order) return order;
  } catch (error) {
    console.warn(`Database query failed for order ${orderId}, falling back to mockDbStore:`, error);
  }

  // Fallback to mockDbStore
  try {
    const mockOrder = mockDbStore.getOrderById(orderId);
    if (mockOrder) {
      console.log(`Retrieved mock order ${orderId} successfully for email generation`);
      return mockOrder;
    }
  } catch (error) {
    console.error(`Mock database store failed to get order ${orderId}:`, error);
  }

  return null;
}

export async function sendWelcomeEmail(email: string, name: string) {
  const recipient = getRecipientEmail(email);
  const subject = getSubjectWithDevPrefix("Welcome to Dewkit 🌸 Your glow journey starts now!", email);
  const htmlContent = emailWrap(`
    <h2 style="color:${ROSE};margin:0 0 16px;font-size:22px;">Namaste, ${name}! 🌸</h2>
    <p style="color:#5c2033;line-height:1.7;">Welcome to <strong>Dewkit</strong> — your destination for premium skincare that actually works. We're so excited to have you here.</p>
    <p style="color:#5c2033;line-height:1.7;">Explore our carefully curated range of serums, moisturizers, sunscreens, and more — all crafted for Indian skin.</p>
    <div style="margin:28px 0;text-align:center;">
      <a href="${BASE_URL}/products" style="background:linear-gradient(135deg,#e11d48,#be185d);color:#fff;padding:14px 32px;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.3px;">Shop Now 💖</a>
    </div>
    <div style="background:${PINK};border-radius:12px;padding:18px;border-left:4px solid ${ROSE};margin-top:20px;">
      <p style="margin:0;color:#be185d;font-size:13px;font-weight:600;">✨ New member offer</p>
      <p style="margin:4px 0 0;color:#5c2033;font-size:13px;">Use code <strong>WELCOME10</strong> for 10% off your first order above ₹999!</p>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[Resend] Successfully sent welcome email to ${recipient}`);
  } catch (error) {
    console.error("Welcome email Resend failed, logging to console:", error);
    logEmailToConsole(recipient, subject, htmlContent);
  }
}

export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    const order = await getOrderForEmail(orderId);
    if (!order || !order.user.email) {
      console.error(`Order confirmation email failed: Order ${orderId} has no associated user email or wasn't found.`);
      return;
    }

    const sellerGstin = process.env.SELLER_GSTIN || "29AAAAA0000A1Z1";
    const sellerStateCode = sellerGstin.substring(0, 2);
    const sellerStateName = GST_STATE_CODES[sellerStateCode]?.toLowerCase() || "karnataka";
    const cleanedState = order.address.state.trim().toLowerCase();
    const isIntraState = cleanedState === sellerStateName || cleanedState.includes(sellerStateName) || sellerStateName.includes(cleanedState);

    let pdfBuffer: any = null;
    try {
      pdfBuffer = (await pdf(React.createElement(InvoicePDF, { order, isIntraState }) as any).toBuffer()) as any;
    } catch (pdfErr) {
      console.error("PDF Invoice generation failed:", pdfErr);
    }

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #fce7f3;color:#3b1121;font-size:14px;">${item.variant.product.name} <span style="color:#9c4060;font-size:12px;">(${item.variant.color || "Standard"})</span></td>
        <td style="padding:10px 8px;border-bottom:1px solid #fce7f3;text-align:center;color:#5c2033;font-weight:600;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #fce7f3;text-align:right;color:#e11d48;font-weight:700;">₹${item.priceAtPurchase.toFixed(2)}</td>
      </tr>`).join("");

    const recipient = getRecipientEmail(order.user.email);
    const subject = getSubjectWithDevPrefix(`Order Confirmed 🌸 #${order.id.slice(0, 8).toUpperCase()} — Dewkit`, order.user.email);
    const htmlContent = emailWrap(`
      <h2 style="color:#166534;margin:0 0 8px;font-size:22px;">✅ Order Confirmed!</h2>
      <p style="color:#5c2033;margin:0 0 20px;">Hi ${order.user.name}, your order <strong style="color:${ROSE};">#${order.id.slice(0, 8).toUpperCase()}</strong> is confirmed. Your GST invoice is attached.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:${PINK};">
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#be185d;font-weight:700;text-transform:uppercase;">Product</th>
          <th style="padding:10px 8px;text-align:center;font-size:12px;color:#be185d;font-weight:700;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;color:#be185d;font-weight:700;text-transform:uppercase;">Price</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background:${PINK};border-radius:12px;padding:18px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#5c2033;"><span>Subtotal:</span><strong>₹${order.subtotal.toFixed(2)}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#5c2033;"><span>GST:</span><strong>₹${order.gstAmount.toFixed(2)}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#5c2033;"><span>Delivery:</span><strong>₹${order.delivery.toFixed(2)}</strong></div>
        ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#16a34a;"><span>Discount:</span><strong>-₹${order.discount.toFixed(2)}</strong></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #fbcfe8;padding-top:10px;margin-top:8px;color:${ROSE};"><span>Grand Total</span><span>₹${order.total.toFixed(2)}</span></div>
      </div>
      <p style="color:#5c2033;font-size:14px;"><strong>Shipping to:</strong><br/>${order.address.name}, ${order.address.street}, ${order.address.city}, ${order.address.state} — ${order.address.pincode}</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${BASE_URL}/orders/${order.id}" style="background:linear-gradient(135deg,#e11d48,#be185d);color:#fff;padding:12px 28px;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">Track Order 📦</a>
      </div>
    `);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: subject,
        html: htmlContent,
        ...(pdfBuffer ? { attachments: [{ filename: `dewkit-invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`, content: pdfBuffer }] } : {}),
      });
      console.log(`[Resend] Successfully sent order confirmation email to ${recipient}`);
    } catch (resendErr) {
      console.error("Resend API failed to send order confirmation email, logging to console:", resendErr);
      logEmailToConsole(recipient, subject, htmlContent, pdfBuffer ? [{ filename: `dewkit-invoice-${order.id.slice(0, 8).toUpperCase()}.pdf` }] : []);
    }
  } catch (error) {
    console.error("Order confirmation email failed completely:", error);
  }
}

export async function sendAdminOrderNotification(orderId: string) {
  try {
    const order = await getOrderForEmail(orderId);
    if (!order) {
      console.error(`Admin notification failed: Order ${orderId} not found.`);
      return;
    }

    const paymentMethod = order.payments && order.payments[0] ? order.payments[0].method : "COD";
    const locationStr = order.locationCity
      ? `${order.locationCity}, ${order.locationState}`
      : "Location not shared";
    const mapsUrl = order.latitude && order.longitude
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : null;

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;font-size:13px;color:#3b1121;">${item.variant.product.name}</td>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;text-align:center;font-size:13px;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;text-align:right;font-size:13px;color:${ROSE};font-weight:700;">₹${item.priceAtPurchase.toFixed(2)}</td>
      </tr>`).join("");

    const recipient = getRecipientEmail(ADMIN_EMAIL);
    const subject = getSubjectWithDevPrefix(`🛍️ New Order #${order.id.slice(0, 8).toUpperCase()} — ₹${order.total.toFixed(2)} | Dewkit`, ADMIN_EMAIL);
    const htmlContent = emailWrap(`
      <div style="background:#dcfce7;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:4px solid #16a34a;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#166534;">💰 New Order Received!</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:#15803d;">₹${order.total.toFixed(2)}</p>
      </div>

      <table style="width:100%;margin-bottom:20px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;width:140px;">Order ID</td><td style="color:#1f0a10;font-weight:700;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Customer</td><td style="color:#1f0a10;">${order.user.name} &lt;${order.user.email}&gt;</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Phone</td><td style="color:#1f0a10;">${order.address.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Payment</td><td style="color:#1f0a10;">${paymentMethod}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Location</td><td style="color:#1f0a10;">${locationStr}${mapsUrl ? ` — <a href="${mapsUrl}" style="color:${ROSE};">View on Maps 📍</a>` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Ship To</td><td style="color:#1f0a10;">${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.pincode}</td></tr>
      </table>

      <h4 style="color:${ROSE};margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</h4>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:${PINK};">
          <th style="padding:8px;text-align:left;font-size:12px;color:#be185d;">Product</th>
          <th style="padding:8px;text-align:center;font-size:12px;color:#be185d;">Qty</th>
          <th style="padding:8px;text-align:right;font-size:12px;color:#be185d;">Price</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:center;margin-top:24px;">
        <a href="${BASE_URL}/admin/orders" style="background:linear-gradient(135deg,#e11d48,#be185d);color:#fff;padding:12px 28px;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">View in Admin Panel 👀</a>
      </div>
    `);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: subject,
        html: htmlContent,
      });
      console.log(`[Resend] Successfully sent admin order notification to ${recipient}`);
    } catch (resendErr) {
      console.error("Resend API failed to send admin notification email, logging to console:", resendErr);
      logEmailToConsole(recipient, subject, htmlContent);
    }
  } catch (error) {
    console.error("Admin order notification email failed completely:", error);
  }
}

export async function sendShipperOrderNotification(orderId: string) {
  try {
    const order = await getOrderForEmail(orderId);
    if (!order) {
      console.error(`Shipper notification failed: Order ${orderId} not found.`);
      return;
    }

    const paymentMethod = order.payments && order.payments[0] ? order.payments[0].method : "COD";
    const locationStr = order.locationCity
      ? `${order.locationCity}, ${order.locationState}`
      : "Location not shared";
    const mapsUrl = order.latitude && order.longitude
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : null;

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;font-size:13px;color:#3b1121;">${item.variant.product.name}</td>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;text-align:center;font-size:13px;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #fce7f3;text-align:right;font-size:13px;color:${ROSE};font-weight:700;">₹${item.priceAtPurchase.toFixed(2)}</td>
      </tr>`).join("");

    const recipient = getRecipientEmail(SHIPPER_EMAIL);
    const subject = getSubjectWithDevPrefix(`📦 New Shipment Request #${order.id.slice(0, 8).toUpperCase()} | Dewkit`, SHIPPER_EMAIL);
    const htmlContent = emailWrap(`
      <div style="background:#e0f2fe;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:4px solid #0284c7;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#0369a1;">📦 New Shipment Required!</p>
        <p style="margin:4px 0 0;font-size:14px;color:#0284c7;">Please prepare order #${order.id.slice(0, 8).toUpperCase()} for delivery.</p>
      </div>

      <table style="width:100%;margin-bottom:20px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;width:140px;">Order ID</td><td style="color:#1f0a10;font-weight:700;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Customer</td><td style="color:#1f0a10;">${order.user.name} &lt;${order.user.email}&gt;</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Phone</td><td style="color:#1f0a10;">${order.address.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Payment Method</td><td style="color:#1f0a10;">${paymentMethod}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Location</td><td style="color:#1f0a10;">${locationStr}${mapsUrl ? ` — <a href="${mapsUrl}" style="color:${ROSE};">View on Maps 📍</a>` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#7c3048;font-weight:600;">Ship To</td><td style="color:#1f0a10;">${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.pincode}</td></tr>
      </table>

      <h4 style="color:${ROSE};margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">Items to Pack</h4>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:${PINK};">
          <th style="padding:8px;text-align:left;font-size:12px;color:#be185d;">Product</th>
          <th style="padding:8px;text-align:center;font-size:12px;color:#be185d;">Qty</th>
          <th style="padding:8px;text-align:right;font-size:12px;color:#be185d;">Price</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:center;margin-top:24px;">
        <a href="${BASE_URL}/shipper" style="background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;padding:12px 28px;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">Open Fulfillment Hub 🚚</a>
      </div>
    `);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: subject,
        html: htmlContent,
      });
      console.log(`[Resend] Successfully sent shipper notification for order ${order.id}`);
    } catch (resendErr) {
      console.error("Resend API failed to send shipper notification email, logging to console:", resendErr);
      logEmailToConsole(recipient, subject, htmlContent);
    }
  } catch (error) {
    console.error("Shipper notification email failed completely:", error);
  }
}

export async function sendShippingUpdateEmail(email: string, name: string, orderNumber: string, trackingNumber: string, trackingLink?: string) {
  const recipient = getRecipientEmail(email);
  const subject = getSubjectWithDevPrefix(`Your Dewkit order is on its way! 🚚 #${orderNumber.toUpperCase()}`, email);
  const htmlContent = emailWrap(`
    <h2 style="color:#1e40af;margin:0 0 16px;font-size:22px;">🚚 Your Order Has Shipped!</h2>
    <p style="color:#5c2033;">Hi ${name}, your order <strong style="color:${ROSE};">#${orderNumber.toUpperCase()}</strong> is on its way to you!</p>
    ${trackingNumber ? `<div style="background:#dbeafe;border-radius:12px;padding:16px;margin:20px 0;text-align:center;"><p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;">Tracking Number</p><p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:1px;">${trackingNumber}</p></div>` : ""}
    ${trackingLink ? `<div style="text-align:center;margin-top:20px;"><a href="${trackingLink}" style="background:linear-gradient(135deg,#1e40af,#1d4ed8);color:#fff;padding:12px 28px;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">Track Shipment 📦</a></div>` : ""}
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[Resend] Successfully sent shipping update email to ${recipient}`);
  } catch (error) {
    console.error("Shipping update email Resend failed, logging to console:", error);
    logEmailToConsole(recipient, subject, htmlContent);
  }
}

export async function sendDeliveryConfirmationEmail(email: string, name: string, orderNumber: string) {
  const recipient = getRecipientEmail(email);
  const subject = getSubjectWithDevPrefix(`Delivered! Your Dewkit order #${orderNumber.toUpperCase()} arrived 🌸`, email);
  const htmlContent = emailWrap(`
    <h2 style="color:#166534;margin:0 0 16px;font-size:22px;">🎉 Order Delivered!</h2>
    <p style="color:#5c2033;">Hi ${name}! Your order <strong style="color:${ROSE};">#${orderNumber.toUpperCase()}</strong> has been delivered successfully.</p>
    <p style="color:#5c2033;">We hope you love your Dewkit products! Share your glow journey with us. 💖</p>
    <div style="background:${PINK};border-radius:12px;padding:16px;margin-top:20px;text-align:center;">
      <p style="margin:0;color:#be185d;font-weight:600;">Enjoyed your products?</p>
      <p style="margin:6px 0 0;font-size:13px;color:#5c2033;">Leave a review and help others find their perfect skincare routine.</p>
      <a href="${BASE_URL}/orders" style="display:inline-block;margin-top:12px;background:${ROSE};color:#fff;padding:10px 24px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;">Write a Review ⭐</a>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[Resend] Successfully sent delivery confirmation email to ${recipient}`);
  } catch (error) {
    console.error("Delivery email Resend failed, logging to console:", error);
    logEmailToConsole(recipient, subject, htmlContent);
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string) {
  const recipient = getRecipientEmail(email);
  const subject = getSubjectWithDevPrefix("Reset your Dewkit password 🔐", email);
  const htmlContent = emailWrap(`
    <h2 style="color:#dc2626;margin:0 0 16px;font-size:22px;">🔐 Password Reset</h2>
    <p style="color:#5c2033;">Hi ${name}, we received a request to reset your Dewkit account password.</p>
    <p style="color:#7c3048;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:14px 32px;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;display:inline-block;">Reset Password</a>
    </div>
    <p style="color:#9c4060;font-size:12px;text-align:center;">This link expires in 1 hour.</p>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[Resend] Successfully sent password reset email to ${recipient}`);
  } catch (error) {
    console.error("Password reset email Resend failed, logging to console:", error);
    logEmailToConsole(recipient, subject, htmlContent);
  }
}
