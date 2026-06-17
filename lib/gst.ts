export const GST_STATE_CODES: { [key: string]: string } = {
  "01": "jammu & kashmir",
  "02": "himachal pradesh",
  "03": "punjab",
  "04": "chandigarh",
  "05": "uttarakhand",
  "06": "haryana",
  "07": "delhi",
  "08": "rajasthan",
  "09": "uttar pradesh",
  "10": "bihar",
  "11": "sikkim",
  "12": "arunachal pradesh",
  "13": "nagaland",
  "14": "manipur",
  "15": "mizoram",
  "16": "tripura",
  "17": "meghalaya",
  "18": "assam",
  "19": "west bengal",
  "20": "jharkhand",
  "21": "odisha",
  "22": "chhattisgarh",
  "23": "madhya pradesh",
  "24": "gujarat",
  "26": "dadra & nagar haveli and daman & diu",
  "27": "maharashtra",
  "29": "karnataka",
  "30": "goa",
  "31": "lakshadweep",
  "32": "kerala",
  "33": "tamil nadu",
  "34": "puducherry",
  "35": "andaman & nicobar islands",
  "36": "telangana",
  "37": "andhra pradesh",
  "38": "ladakh"
};

export interface GSTBreakdown {
  isIntraState: boolean;
  taxableValue: number;
  totalGst: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/**
 * Calculates GST breakdown for a given selling price (inclusive of GST).
 * @param priceInclusive - Total selling price (inclusive of GST)
 * @param gstRatePercent - GST rate percentage (e.g. 18 for 18%)
 * @param shippingState - Name or code of the destination state
 */
export function calculateGst(
  priceInclusive: number,
  gstRatePercent: number,
  shippingState: string
): GSTBreakdown {
  const sellerGstin = process.env.SELLER_GSTIN || "29AAAAA0000A1Z1"; // Default to Karnataka (29)
  const sellerStateCode = sellerGstin.substring(0, 2);
  const sellerStateName = GST_STATE_CODES[sellerStateCode]?.toLowerCase() || "karnataka";

  const cleanedShippingState = shippingState.trim().toLowerCase();
  
  // Determine if intra-state (shipping state matches seller state)
  // Check either name match or code prefix match (e.g., if user inputs "29" or "Karnataka")
  const isIntraState = 
    cleanedShippingState === sellerStateName ||
    cleanedShippingState === sellerStateCode ||
    (cleanedShippingState.includes(sellerStateName) || sellerStateName.includes(cleanedShippingState));

  // Extract Taxable Value and GST from the inclusive price
  // Formula: Taxable Value = Price / (1 + Rate/100)
  const taxableValue = priceInclusive / (1 + gstRatePercent / 100);
  const totalGst = priceInclusive - taxableValue;

  if (isIntraState) {
    const halfGst = totalGst / 2;
    return {
      isIntraState,
      taxableValue: Math.round(taxableValue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      cgst: Math.round(halfGst * 100) / 100,
      sgst: Math.round(halfGst * 100) / 100,
      igst: 0,
    };
  } else {
    return {
      isIntraState,
      taxableValue: Math.round(taxableValue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      cgst: 0,
      sgst: 0,
      igst: Math.round(totalGst * 100) / 100,
    };
  }
}

/**
 * Formats a number to Indian Rupee (INR) currency format.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
