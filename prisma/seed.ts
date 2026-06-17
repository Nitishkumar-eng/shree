import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Neon database...");

  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleared old data");

  // Admin
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@shree.com", phone: "9876543210", passwordHash: adminHash, role: "ADMIN" },
  });
  console.log("✅ Admin:", admin.email);

  // Customer
  const custHash = await bcrypt.hash("customer123", 10);
  const customer = await prisma.user.create({
    data: { name: "Rahul Sharma", email: "rahul@example.com", phone: "9876543211", passwordHash: custHash, role: "CUSTOMER" },
  });
  await prisma.address.create({
    data: { userId: customer.id, name: "Rahul Sharma", street: "123, MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038", phone: "9876543211", isDefault: true },
  });
  console.log("✅ Customer + address:", customer.email);

  // Categories
  const electronics = await prisma.category.create({ data: { name: "Electronics", slug: "electronics" } });
  const audio       = await prisma.category.create({ data: { name: "Audio",        slug: "audio",       parentId: electronics.id } });
  const fashion     = await prisma.category.create({ data: { name: "Fashion",      slug: "fashion" } });
  const shoes       = await prisma.category.create({ data: { name: "Shoes",        slug: "shoes",       parentId: fashion.id } });
  const home        = await prisma.category.create({ data: { name: "Home & Living",slug: "home-living" } });
  const sports      = await prisma.category.create({ data: { name: "Sports",       slug: "sports" } });
  console.log("✅ Categories created");

  // ── Product 1: ₹5 Razorpay Test Token ──
  const testProd = await prisma.product.create({
    data: { name: "Shree Razorpay Test Token", slug: "shree-razorpay-test-token", description: "₹5 test item to verify Razorpay integration. Use test card 4111 1111 1111 1111 or UPI success@razorpay.", brand: "Shree", categoryId: electronics.id, hsnCode: "99831300", gstRate: 18 },
  });
  await prisma.productVariant.create({
    data: { productId: testProd.id, size: "Standard", color: "Gold", sku: "SH-TEST-TOKEN", price: 5.00, mrp: 10.00, stockQuantity: 9999, images: ["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60"] },
  });

  // ── Product 2: ANC Headphones ──
  const headphones = await prisma.product.create({
    data: { name: "Shree Wave ANC Headphones", slug: "shree-wave-anc-headphones", description: "Premium active noise-cancelling headphones. 40 hours battery. Memory foam earcups.", brand: "Shree", categoryId: audio.id, hsnCode: "85183000", gstRate: 18 },
  });
  await prisma.productVariant.createMany({
    data: [
      { productId: headphones.id, size: "One Size", color: "Carbon Black",    sku: "SH-WAVE-BLK", price: 4999, mrp: 7999, stockQuantity: 25, images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60"] },
      { productId: headphones.id, size: "One Size", color: "Platinum Silver",  sku: "SH-WAVE-SLV", price: 4999, mrp: 7999, stockQuantity: 15, images: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60"] },
    ],
  });

  // ── Product 3: TWS Earbuds ──
  const earbuds = await prisma.product.create({
    data: { name: "Shree Buds Pro TWS", slug: "shree-buds-pro-tws", description: "True wireless earbuds. 30h total playtime, IPX5 water resistant, customizable EQ.", brand: "Shree", categoryId: audio.id, hsnCode: "85183000", gstRate: 18 },
  });
  await prisma.productVariant.createMany({
    data: [
      { productId: earbuds.id, size: "One Size", color: "Pearl White",     sku: "SH-BUDS-WHT", price: 1999, mrp: 3499, stockQuantity: 30, images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=60"] },
      { productId: earbuds.id, size: "One Size", color: "Midnight Black",  sku: "SH-BUDS-BLK", price: 1999, mrp: 3499, stockQuantity: 20, images: ["https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=60"] },
    ],
  });

  // ── Product 4: Running Shoes ──
  const runShoes = await prisma.product.create({
    data: { name: "Shree Strider Running Shoes", slug: "shree-strider-running-shoes", description: "Breathable mesh, responsive cushioning, high-traction rubber outsole. Built for speed.", brand: "Shree", categoryId: shoes.id, hsnCode: "64041190", gstRate: 12 },
  });
  await prisma.productVariant.createMany({
    data: [
      { productId: runShoes.id, size: "UK 8", color: "Crimson Red", sku: "SH-STRD-RED-8", price: 2499, mrp: 3999, stockQuantity: 10, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"] },
      { productId: runShoes.id, size: "UK 9", color: "Crimson Red", sku: "SH-STRD-RED-9", price: 2499, mrp: 3999, stockQuantity: 8,  images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"] },
      { productId: runShoes.id, size: "UK 8", color: "Ocean Blue",  sku: "SH-STRD-BLU-8", price: 2399, mrp: 3999, stockQuantity: 12, images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=60"] },
    ],
  });

  // ── Product 5: Yoga Mat ──
  const yogaMat = await prisma.product.create({
    data: { name: "Shree Zen Pro Yoga Mat", slug: "shree-zen-pro-yoga-mat", description: "6mm anti-slip TPE yoga mat with alignment lines. Includes carrying strap.", brand: "Shree", categoryId: sports.id, hsnCode: "95069190", gstRate: 12 },
  });
  await prisma.productVariant.createMany({
    data: [
      { productId: yogaMat.id, size: "183cm x 61cm", color: "Sage Green", sku: "SH-YOGA-GRN", price: 1299, mrp: 2499, stockQuantity: 40, images: ["https://images.unsplash.com/photo-1601925228503-cae48de9e7be?w=800&auto=format&fit=crop&q=60"] },
      { productId: yogaMat.id, size: "183cm x 61cm", color: "Lavender",   sku: "SH-YOGA-LAV", price: 1299, mrp: 2499, stockQuantity: 35, images: ["https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=60"] },
    ],
  });

  // ── Product 6: Water Bottle ──
  const bottle = await prisma.product.create({
    data: { name: "Shree AquaSteel 1L Bottle", slug: "shree-aquasteel-1l-bottle", description: "Double-wall vacuum insulated stainless steel bottle. Cold 24h, hot 12h. Leak-proof lid.", brand: "Shree", categoryId: home.id, hsnCode: "73239300", gstRate: 12 },
  });
  await prisma.productVariant.createMany({
    data: [
      { productId: bottle.id, size: "1 Litre", color: "Matte Black",  sku: "SH-BTL-BLK", price: 799, mrp: 1499, stockQuantity: 50, images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60"] },
      { productId: bottle.id, size: "1 Litre", color: "Copper Rose",  sku: "SH-BTL-RSE", price: 849, mrp: 1499, stockQuantity: 45, images: ["https://images.unsplash.com/photo-1617208698096-6f3e2e5e9c04?w=800&auto=format&fit=crop&q=60"] },
    ],
  });
  console.log("✅ 6 products seeded");

  // Coupons
  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10",    discountType: "PERCENT", value: 10,  minOrder: 999,  expiry: new Date("2028-12-31") },
      { code: "SHREEFLAT200", discountType: "FLAT",    value: 200, minOrder: 1999, expiry: new Date("2028-12-31") },
      { code: "SHREEFLAT500", discountType: "FLAT",    value: 500, minOrder: 4999, expiry: new Date("2028-12-31") },
    ],
  });
  console.log("✅ Coupons seeded");

  console.log("\n🎉 Database seeded!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin:    admin@shree.com  /  admin123");
  console.log("  Customer: rahul@example.com  /  customer123");
  console.log("  Coupons:  WELCOME10 | SHREEFLAT200 | SHREEFLAT500");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
