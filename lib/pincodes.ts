export interface PincodeInfo {
  serviceable: boolean;
  city: string;
  state: string;
  deliveryDays: number;
  shippingFee: number;
}

/**
 * Validates and checks the serviceability of a pincode in India.
 * @param pincode - 6 digit pincode string
 */
export function checkPincode(pincode: string): PincodeInfo {
  const cleanPin = pincode.replace(/\s+/g, "");
  
  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      serviceable: false,
      city: "",
      state: "",
      deliveryDays: 0,
      shippingFee: 0,
    };
  }

  const prefix = cleanPin.substring(0, 2);
  let city = "Major City";
  let state = "India";
  let deliveryDays = 4;
  let shippingFee = 80;

  switch (prefix) {
    case "56":
    case "57":
    case "58":
    case "59":
      city = prefix === "56" ? "Bengaluru" : "Hubli/Mysore";
      state = "Karnataka";
      deliveryDays = 2;
      shippingFee = 49;
      break;
    case "11":
      city = "New Delhi";
      state = "Delhi";
      deliveryDays = 3;
      shippingFee = 59;
      break;
    case "40":
    case "41":
    case "42":
    case "43":
    case "44":
      city = prefix === "40" ? "Mumbai" : "Pune";
      state = "Maharashtra";
      deliveryDays = 3;
      shippingFee = 59;
      break;
    case "60":
    case "61":
    case "62":
    case "63":
    case "64":
      city = "Chennai";
      state = "Tamil Nadu";
      deliveryDays = 3;
      shippingFee = 59;
      break;
    case "70":
    case "71":
    case "72":
    case "73":
      city = "Kolkata";
      state = "West Bengal";
      deliveryDays = 4;
      shippingFee = 69;
      break;
    case "50":
      city = "Hyderabad";
      state = "Telangana";
      deliveryDays = 3;
      shippingFee = 59;
      break;
    case "38":
      city = "Ahmedabad";
      state = "Gujarat";
      deliveryDays = 3;
      shippingFee = 59;
      break;
    default:
      // General fallbacks based on regions
      if (parseInt(prefix) >= 11 && parseInt(prefix) <= 34) {
        state = "North/West India";
      } else if (parseInt(prefix) >= 36 && parseInt(prefix) <= 69) {
        state = "South/Central India";
      } else if (parseInt(prefix) >= 70 && parseInt(prefix) <= 85) {
        state = "East/North-East India";
      }
      city = "Regional Area";
      deliveryDays = 5;
      shippingFee = 99;
  }

  return {
    serviceable: true,
    city,
    state,
    deliveryDays,
    shippingFee,
  };
}
