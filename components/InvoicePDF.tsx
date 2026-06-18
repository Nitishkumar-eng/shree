import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    color: "#333333",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 10,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#BE185D", // Dewkit Rose
  },
  gstin: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  invoiceDetails: {
    alignItems: "flex-end",
  },
  invoiceMetaText: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 2,
  },
  addresses: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  addressBox: {
    width: "48%",
  },
  addressTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 4,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 8,
    color: "#4B5563",
    lineHeight: 1.4,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FFF0F6", // Dewkit Pink Soft
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  colDesc: { width: "30%" },
  colHsn: { width: "10%", textAlign: "center" },
  colPrice: { width: "10%", textAlign: "right" },
  colQty: { width: "8%", textAlign: "center" },
  colTaxRate: { width: "12%", textAlign: "center" },
  colTaxAmt: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  totalsBox: {
    width: "40%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  totalsLabel: {
    fontSize: 9,
    color: "#4B5563",
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1F2937",
  },
  netTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#BE185D",
    marginTop: 4,
    backgroundColor: "#FFE4E6", // Rose soft light
    paddingHorizontal: 4,
  },
  netTotalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#BE185D",
  },
  netTotalValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#BE185D",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#9CA3AF",
  },
});

interface InvoicePDFProps {
  order: any;
  isIntraState: boolean;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ order, isIntraState }) => {
  const sellerGstin = process.env.SELLER_GSTIN || "29AAAAA0000A1Z1";
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>DEWKIT SKINCARE</Text>
            <Text style={styles.gstin}>GSTIN: {sellerGstin}</Text>
          </View>
          <View style={styles.invoiceDetails}>
            <Text style={styles.invoiceMetaText}>TAX INVOICE</Text>
            <Text style={styles.invoiceMetaText}>Invoice No: {order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.invoiceMetaText}>Date: {dateStr}</Text>
            <Text style={styles.invoiceMetaText}>Status: {order.status}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addresses}>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Sold By</Text>
            <Text style={styles.addressText}>Dewkit Skincare Private Limited</Text>
            <Text style={styles.addressText}>45, Outer Ring Road, HSR Layout</Text>
            <Text style={styles.addressText}>Bengaluru, Karnataka - 560102</Text>
            <Text style={styles.addressText}>India</Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Billing / Shipping Address</Text>
            <Text style={styles.addressText}>{order.address.name}</Text>
            <Text style={styles.addressText}>{order.address.street}</Text>
            <Text style={styles.addressText}>
              {order.address.city}, {order.address.state} - {order.address.pincode}
            </Text>
            <Text style={styles.addressText}>Phone: {order.address.phone}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, { fontWeight: "bold" }]}>Item Description</Text>
            <Text style={[styles.colHsn, { fontWeight: "bold" }]}>HSN</Text>
            <Text style={[styles.colPrice, { fontWeight: "bold" }]}>Unit Price</Text>
            <Text style={[styles.colQty, { fontWeight: "bold" }]}>Qty</Text>
            <Text style={[styles.colTaxRate, { fontWeight: "bold" }]}>Tax Rate</Text>
            <Text style={[styles.colTaxAmt, { fontWeight: "bold" }]}>Tax Amt</Text>
            <Text style={[styles.colTotal, { fontWeight: "bold" }]}>Total</Text>
          </View>

          {order.items.map((item: any, index: number) => {
            const price = item.priceAtPurchase;
            const rate = item.gstRate;
            const qty = item.quantity;
            const taxable = price / (1 + rate / 100);
            const taxAmount = (price - taxable) * qty;
            const total = price * qty;

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colDesc}>
                  {item.variant.product.name} ({item.variant.size || "One Size"} / {item.variant.color || "Standard"})
                </Text>
                <Text style={styles.colHsn}>{item.hsnCode || "N/A"}</Text>
                <Text style={styles.colPrice}>₹{taxable.toFixed(2)}</Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colTaxRate}>{rate}%</Text>
                <Text style={styles.colTaxAmt}>₹{taxAmount.toFixed(2)}</Text>
                <Text style={styles.colTotal}>₹{total.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals Summary */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Taxable Value</Text>
              <Text style={styles.totalsValue}>₹{order.subtotal.toFixed(2)}</Text>
            </View>

            {isIntraState ? (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>CGST</Text>
                  <Text style={styles.totalsValue}>₹{(order.gstAmount / 2).toFixed(2)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>SGST</Text>
                  <Text style={styles.totalsValue}>₹{(order.gstAmount / 2).toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>IGST</Text>
                <Text style={styles.totalsValue}>₹{order.gstAmount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Shipping Fee</Text>
              <Text style={styles.totalsValue}>₹{order.delivery.toFixed(2)}</Text>
            </View>

            {order.discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount Applied</Text>
                <Text style={styles.totalsValue}>-₹{order.discount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.netTotalRow}>
              <Text style={styles.netTotalLabel}>Grand Total</Text>
              <Text style={styles.netTotalValue}>₹{order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer-generated tax invoice and does not require signature.</Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>Thank you for shopping with Dewkit!</Text>
        </View>
      </Page>
    </Document>
  );
};
