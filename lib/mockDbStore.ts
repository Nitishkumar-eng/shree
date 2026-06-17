export interface MockVariant {
  id: string;
  productId: string;
  size: string | null;
  color: string | null;
  sku: string;
  price: number;
  mrp: number;
  stockQuantity: number;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  categoryId: string;
  category?: MockCategory;
  isActive: boolean;
  hsnCode: string | null;
  gstRate: number;
  variants: MockVariant[];
  reviews: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderPayment {
  id: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  status: string; // PENDING, COMPLETED, FAILED, REFUNDED
  method: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  priceAtPurchase: number;
  gstRate: number;
  hsnCode: string | null;
  createdAt: Date;
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    sku: string;
    price: number;
    mrp: number;
    images: string[];
    product: {
      id: string;
      name: string;
      brand: string;
    };
  };
}

export interface MockOrder {
  id: string;
  userId: string;
  addressId: string;
  status: string; // PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, REFUNDED
  subtotal: number;
  gstAmount: number;
  discount: number;
  delivery: number;
  total: number;
  couponCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  address: {
    id: string;
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: MockOrderItem[];
  payments: MockOrderPayment[];
}

interface MockDbState {
  categories: MockCategory[];
  products: MockProduct[];
  orders: MockOrder[];
}

const initialCategories: MockCategory[] = [
  { id: "audio", name: "Audio", slug: "audio", parentId: null },
  { id: "shoes", name: "Shoes", slug: "shoes", parentId: null },
  { id: "apparel", name: "Apparel", slug: "apparel", parentId: null },
];

const initialProducts: MockProduct[] = [
  {
    id: "razorpay-test-product",
    name: "Shree Razorpay Test Token",
    slug: "shree-razorpay-test-token",
    brand: "Shree",
    description: "Use this ₹5 test token to verify that the Razorpay checkout and signature verification flow works end-to-end on your local system.",
    categoryId: "audio",
    isActive: true,
    hsnCode: "99831300",
    gstRate: 18.0,
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [
      {
        id: "mock-v-test",
        productId: "razorpay-test-product",
        size: "Standard",
        color: "Gold",
        sku: "SH-TEST-TOKEN",
        price: 5.00,
        mrp: 10.00,
        stockQuantity: 999,
        images: ["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },
  {
    id: "mock-headphones",
    name: "Shree Wave ANC Headphones",
    slug: "shree-wave-anc-headphones",
    brand: "Shree",
    description: "Experience premium active noise-cancelling sound with the Shree Wave headphones. Features up to 40 hours of battery life and ergonomic memory foam earcups.",
    categoryId: "audio",
    isActive: true,
    hsnCode: "85183000",
    gstRate: 18.0,
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [
      {
        id: "mock-v-blk",
        productId: "mock-headphones",
        size: "One Size",
        color: "Carbon Black",
        sku: "SH-WAVE-BLK",
        price: 4999.00,
        mrp: 7999.00,
        stockQuantity: 25,
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "mock-v-slv",
        productId: "mock-headphones",
        size: "One Size",
        color: "Platinum Silver",
        sku: "SH-WAVE-SLV",
        price: 4999.00,
        mrp: 7999.00,
        stockQuantity: 15,
        images: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },
  {
    id: "mock-shoes",
    name: "Shree Strider Running Shoes",
    slug: "shree-strider-running-shoes",
    brand: "Shree",
    description: "Engineered for comfort and durability. The Shree Strider features breathable mesh, responsive cushioning, and high-traction rubber outsole.",
    categoryId: "shoes",
    isActive: true,
    hsnCode: "64041190",
    gstRate: 12.0,
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [
      {
        id: "mock-v-red",
        productId: "mock-shoes",
        size: "UK 8",
        color: "Crimson Red",
        sku: "SH-STRD-RED-8",
        price: 2499.00,
        mrp: 3999.00,
        stockQuantity: 10,
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "mock-v-blu",
        productId: "mock-shoes",
        size: "UK 8",
        color: "Ocean Blue",
        sku: "SH-STRD-BLU-8",
        price: 2399.00,
        mrp: 3999.00,
        stockQuantity: 12,
        images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
];

const initialOrders: MockOrder[] = [
  {
    id: "mock-order-xqvwv4s",
    userId: "mock-user-id",
    addressId: "mock-address-id",
    status: "CONFIRMED",
    subtotal: 4.24,
    gstAmount: 0.76,
    delivery: 49.00,
    discount: 0,
    total: 54.00,
    couponCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "mock-user-id",
      name: "Admin User",
      email: "admin@shree.com",
      phone: "9876543210"
    },
    address: {
      id: "mock-address-id",
      name: "Admin User",
      street: "123, MG Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      phone: "9876543210"
    },
    items: [
      {
        id: "mock-item-id-1",
        orderId: "mock-order-xqvwv4s",
        productVariantId: "mock-v-test",
        quantity: 1,
        priceAtPurchase: 5.00,
        gstRate: 18.0,
        hsnCode: "99831300",
        createdAt: new Date(),
        variant: {
          id: "mock-v-test",
          size: "Standard",
          color: "Gold",
          sku: "SH-TEST-TOKEN",
          price: 5.00,
          mrp: 10.00,
          images: ["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60"],
          product: {
            id: "razorpay-test-product",
            name: "Shree Razorpay Test Token",
            brand: "Shree"
          }
        }
      }
    ],
    payments: [
      {
        id: "mock-pmt-1",
        orderId: "mock-order-xqvwv4s",
        razorpayOrderId: "order_mock_initial",
        razorpayPaymentId: "pay_mock_payment_id",
        razorpaySignature: "mock_sig",
        status: "COMPLETED",
        method: "ONLINE",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
];

// Helper to keep state persistent across Next.js dev server hot-reloads
const globalForMockDb = globalThis as unknown as {
  mockDbState: MockDbState | undefined;
};

if (!globalForMockDb.mockDbState) {
  globalForMockDb.mockDbState = {
    categories: initialCategories,
    products: initialProducts,
    orders: initialOrders,
  };
} else {
  if (!globalForMockDb.mockDbState.orders) {
    globalForMockDb.mockDbState.orders = initialOrders;
  }
}

const state = globalForMockDb.mockDbState;

export const mockDbStore = {
  // Categories API
  getCategories(): MockCategory[] {
    return state.categories;
  },

  getCategoryById(id: string): MockCategory | undefined {
    return state.categories.find(c => c.id === id);
  },

  addCategory(categoryData: Omit<MockCategory, "id">): MockCategory {
    const newCategory: MockCategory = {
      id: `mock-cat-${Math.random().toString(36).substring(2, 11)}`,
      name: categoryData.name,
      slug: categoryData.slug,
      parentId: categoryData.parentId || null,
    };
    state.categories.push(newCategory);
    return newCategory;
  },

  // Products API
  getProducts(): MockProduct[] {
    return state.products.map(p => ({
      ...p,
      category: this.getCategoryById(p.categoryId) || { id: p.categoryId, name: "Uncategorized", slug: p.categoryId, parentId: null }
    }));
  },

  getProductBySlug(slug: string): MockProduct | undefined {
    const product = state.products.find(p => p.slug === slug);
    if (!product) return undefined;
    return {
      ...product,
      category: this.getCategoryById(product.categoryId) || { id: product.categoryId, name: "Uncategorized", slug: product.categoryId, parentId: null }
    };
  },

  getProductById(id: string): MockProduct | undefined {
    const product = state.products.find(p => p.id === id);
    if (!product) return undefined;
    return {
      ...product,
      category: this.getCategoryById(product.categoryId) || { id: product.categoryId, name: "Uncategorized", slug: product.categoryId, parentId: null }
    };
  },

  addProduct(productData: Omit<MockProduct, "id" | "createdAt" | "updatedAt" | "variants" | "reviews">, variantsData: Omit<MockVariant, "id" | "productId" | "createdAt" | "updatedAt">[]): MockProduct {
    const productId = `mock-prod-${Math.random().toString(36).substring(2, 11)}`;
    const variants: MockVariant[] = variantsData.map(v => ({
      ...v,
      id: `mock-var-${Math.random().toString(36).substring(2, 11)}`,
      productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const newProduct: MockProduct = {
      ...productData,
      id: productId,
      variants,
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    state.products.push(newProduct);
    return {
      ...newProduct,
      category: this.getCategoryById(newProduct.categoryId)
    };
  },

  updateProduct(id: string, productUpdate: Partial<Omit<MockProduct, "id" | "variants" | "reviews" | "createdAt" | "updatedAt">> & { variants?: Omit<MockVariant, "productId" | "createdAt" | "updatedAt">[] }): MockProduct | undefined {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return undefined;

    const existingProduct = state.products[idx];
    const { variants, ...baseUpdates } = productUpdate;

    const updatedProduct: MockProduct = {
      ...existingProduct,
      ...baseUpdates,
      updatedAt: new Date(),
    };

    if (variants) {
      updatedProduct.variants = variants.map(v => {
        return {
          ...v,
          id: v.id || `mock-var-${Math.random().toString(36).substring(2, 11)}`,
          productId: id,
          createdAt: (v as any).createdAt || new Date(),
          updatedAt: new Date(),
        } as MockVariant;
      });
    }

    state.products[idx] = updatedProduct;
    return {
      ...updatedProduct,
      category: this.getCategoryById(updatedProduct.categoryId)
    };
  },

  deleteProduct(id: string): boolean {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    state.products.splice(idx, 1);
    return true;
  },

  // Orders API
  getOrders(userId?: string): MockOrder[] {
    if (userId) {
      return state.orders.filter(o => o.userId === userId);
    }
    return state.orders;
  },

  getOrderById(id: string): MockOrder | undefined {
    return state.orders.find(o => o.id === id);
  },

  addOrder(order: MockOrder): MockOrder {
    state.orders.push(order);
    return order;
  },

  updateOrderStatus(id: string, status: string): MockOrder | undefined {
    const order = state.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
    }
    return order;
  },

  addPaymentToOrder(orderId: string, paymentData: Omit<MockOrderPayment, "id" | "orderId" | "createdAt" | "updatedAt">): void {
    const order = state.orders.find(o => o.id === orderId);
    if (order) {
      const payment: MockOrderPayment = {
        ...paymentData,
        id: `mock-pmt-${Math.random().toString(36).substring(2, 11)}`,
        orderId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Clear duplicate payment attempts
      order.payments = order.payments.filter(p => p.razorpayOrderId !== paymentData.razorpayOrderId);
      order.payments.push(payment);
      order.updatedAt = new Date();
    }
  }
};
