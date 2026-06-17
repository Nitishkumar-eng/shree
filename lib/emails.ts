import { resend } from "./resend";
import { db } from "./db";
import { calculateGst, GST_STATE_CODES } from "./gst";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/components/InvoicePDF";

const FROM_EMAIL = "Shree E-Commerce <onboarding@resend.dev>"; // Fallback sandbox domain for Resend

/**
 * Sends a welcome email to newly registered customers.
 */
export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #eff6ff; padding-bottom: 10px;">Namaste ${name}!</h2>
        <p>Welcome to <strong>Shree E-Commerce</strong>. We are thrilled to have you join our community.</p>
        <p>Explore our latest Indian-engineered lifestyle catalogs, footwear, active ANC headsets, and enjoy swift deliveries with full GST transparency.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Shopping</a>
        </div>
        <p style="color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; paddingTop: 15px;">If you have any questions, feel free to reply to this email.</p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to Shree - Start Shopping Today!",
      html: htmlContent,
    });
  } catch (error) {
    console.error("Resend welcome email failed:", error);
  }
}

/**
 * Sends order confirmation email with detailed item summary and PDF invoice attached.
 */
export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
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
      },
    });

    if (!order || !order.user.email) return;

    // Check GST type
    const sellerGstin = process.env.SELLER_GSTIN || "29AAAAA0000A1Z1";
    const sellerStateCode = sellerGstin.substring(0, 2);
    const sellerStateName = GST_STATE_CODES[sellerStateCode]?.toLowerCase() || "karnataka";

    const cleanedShippingState = order.address.state.trim().toLowerCase();
    const isIntraState =
      cleanedShippingState === sellerStateName ||
      cleanedShippingState === sellerStateCode ||
      (cleanedShippingState.includes(sellerStateName) || sellerStateName.includes(cleanedShippingState));

    // Generate PDF invoice buffer
    const pdfBuffer = (await pdf(
      React.createElement(InvoicePDF, { order, isIntraState }) as any
    ).toBuffer()) as any;

    const itemsSummaryHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">
          ${item.variant.product.name} (${item.variant.size || "One Size"} / ${item.variant.color || "Standard"})
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">₹${item.priceAtPurchase.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px;">Order Confirmed!</h2>
        <p>Hello ${order.user.name},</p>
        <p>Thank you for shopping with Shree. Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been successfully placed. We have attached your official GST Tax Invoice as a PDF to this email.</p>
        
        <h4 style="margin-top: 20px; color: #1e3a8a;">Order Summary</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 8px; text-align: left; font-size: 12px; color: #4b5563;">Item</th>
              <th style="padding: 8px; text-align: center; font-size: 12px; color: #4b5563;">Qty</th>
              <th style="padding: 8px; text-align: right; font-size: 12px; color: #4b5563;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsSummaryHtml}
          </tbody>
        </table>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
            <span>Subtotal (Before Tax):</span> <strong>₹${order.subtotal.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
            <span>GST Tax:</span> <strong>₹${order.gstAmount.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
            <span>Shipping:</span> <strong>₹${order.delivery.toFixed(2)}</strong>
          </div>
          ${
            order.discount > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; color: #ef4444;">
                  <span>Discount:</span> <strong>-₹${order.discount.toFixed(2)}</strong>
                 </div>`
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #bfdbfe; padding-top: 8px; margin-top: 8px; color: #1e3a8a;">
            <span>Grand Total:</span> <span>₹${order.total.toFixed(2)}</span>
          </div>
        </div>

        <p><strong>Shipping Address:</strong><br/>
        ${order.address.name}<br/>
        ${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.user.email,
      subject: `Order Confirmed: #${order.id.slice(0, 8).toUpperCase()}`,
      html: htmlContent,
      attachments: [
        {
          filename: `invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (error) {
    console.error("Resend order confirmation email failed:", error);
  }
}

/**
 * Sends shipping status updates with tracking links.
 */
export async function sendShippingUpdateEmail(
  email: string,
  name: string,
  orderNumber: string,
  trackingLink: string
) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #eff6ff; padding-bottom: 10px;">Your Order has Shipped!</h2>
        <p>Hello ${name},</p>
        <p>Good news! Your order <strong>#${orderNumber.toUpperCase()}</strong> has been shipped and is on its way to you.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${trackingLink}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Shipment</a>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Shree order has shipped: #${orderNumber.toUpperCase()}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Resend shipping update email failed:", error);
  }
}

/**
 * Sends delivery confirmation emails.
 */
export async function sendDeliveryConfirmationEmail(email: string, name: string, orderNumber: string) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px;">Delivered successfully!</h2>
        <p>Hello ${name},</p>
        <p>Your order <strong>#${orderNumber.toUpperCase()}</strong> has been marked as successfully delivered.</p>
        <p>We hope you love your products! We would love to hear your feedback—please consider visiting the store page to post a review.</p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Delivered: Order #${orderNumber.toUpperCase()}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Resend delivery confirmation email failed:", error);
  }
}

/**
 * Sends password reset request link.
 */
export async function sendPasswordResetEmail(email: string, name: string, resetLink: string) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #fef2f2; padding-bottom: 10px;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your account password. If you didn't make this request, you can safely ignore this email.</p>
        <p>To set a new password, click the button below within the next 1 hour:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your password - Shree",
      html: htmlContent,
    });
  } catch (error) {
    console.error("Resend password reset email failed:", error);
  }
}
