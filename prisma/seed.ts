import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌸 Seeding Dewkit skincare database...");

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

  // ── Users ────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: { id: "mock-admin-id", name: "Dewkit Admin", email: "admin@dewkit.in", phone: "9876543210", passwordHash: adminHash, role: "ADMIN" },
  });

  const shipperHash = await bcrypt.hash("shipper123", 10);
  const shipper = await prisma.user.create({
    data: { id: "mock-shipper-id", name: "Delivery Partner", email: "shipper@dewkit.in", phone: "9876543212", passwordHash: shipperHash, role: "SHIPPER" },
  });

  const custHash = await bcrypt.hash("customer123", 10);
  const customer = await prisma.user.create({
    data: { id: "mock-priya-id", name: "Priya Sharma", email: "priya@example.com", phone: "9876543211", passwordHash: custHash, role: "CUSTOMER" },
  });
  await prisma.address.create({
    data: { userId: customer.id, name: "Priya Sharma", street: "42, Linking Road, Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050", phone: "9876543211", isDefault: true },
  });

  const customer2 = await prisma.user.create({
    data: { id: "mock-customer-id", name: "Rahul Sharma", email: "rahul@example.com", phone: "9876543219", passwordHash: custHash, role: "CUSTOMER" },
  });
  await prisma.address.create({
    data: { userId: customer2.id, name: "Rahul Sharma", street: "12, MG Road, Camp", city: "Pune", state: "Maharashtra", pincode: "411001", phone: "9876543219", isDefault: true },
  });

  console.log("✅ Users created:", admin.email, shipper.email, customer.email, customer2.email);

  // ── Categories ───────────────────────────────────────────────
  const skincare    = await prisma.category.create({ data: { name: "Skincare", slug: "skincare" } });
  const serums      = await prisma.category.create({ data: { name: "Serums & Treatments", slug: "serums", parentId: skincare.id } });
  const moisturize  = await prisma.category.create({ data: { name: "Moisturizers", slug: "moisturizers", parentId: skincare.id } });
  const cleansers   = await prisma.category.create({ data: { name: "Cleansers", slug: "cleansers", parentId: skincare.id } });
  const sunscreen   = await prisma.category.create({ data: { name: "Sun Protection", slug: "sunprotection", parentId: skincare.id } });
  const masks       = await prisma.category.create({ data: { name: "Masks & Exfoliants", slug: "masks", parentId: skincare.id } });
  const eyecare     = await prisma.category.create({ data: { name: "Eye Care", slug: "eyecare", parentId: skincare.id } });
  const toners      = await prisma.category.create({ data: { name: "Toners", slug: "toners", parentId: skincare.id } });
  console.log("✅ Categories created");

  // ── Product 1: Vitamin C Glow Serum ─────────────────────────
  const serum = await prisma.product.create({
    data: { name: "Dewkit Glow Serum", slug: "dewkit-glow-serum", description: "Brightening Vitamin C serum with 15% ascorbic acid, hyaluronic acid, and niacinamide. Targets dark spots, uneven tone, and dullness. Dermatologist-tested, suitable for all Indian skin tones.", brand: "Dewkit", categoryId: serums.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: serum.id, size: "30ml", color: "Vitamin C Gold", sku: "DK-GLOW-30", price: 899, mrp: 1499, stockQuantity: 50, images: ["https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=800&auto=format&fit=crop&q=60"] },
    { productId: serum.id, size: "50ml", color: "Vitamin C Gold", sku: "DK-GLOW-50", price: 1299, mrp: 2099, stockQuantity: 35, images: ["https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 2: Hydra Boost Moisturizer ───────────────────────
  const moisturizer = await prisma.product.create({
    data: { name: "Dewkit Hydra Boost Moisturizer", slug: "dewkit-hydra-boost-moisturizer", description: "Lightweight, non-comedogenic daily moisturizer with ceramides, peptides, and 5-HA complex. Delivers 72-hour deep hydration without greasiness. Perfect for Mumbai humidity.", brand: "Dewkit", categoryId: moisturize.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: moisturizer.id, size: "50ml", color: "Pearl White", sku: "DK-HYDRA-50", price: 699, mrp: 1199, stockQuantity: 60, images: ["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&auto=format&fit=crop&q=60"] },
    { productId: moisturizer.id, size: "100ml", color: "Pearl White", sku: "DK-HYDRA-100", price: 1099, mrp: 1899, stockQuantity: 40, images: ["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 3: Rose Petal Cleanser ───────────────────────────
  const cleanser = await prisma.product.create({
    data: { name: "Dewkit Petal Cleanser", slug: "dewkit-petal-cleanser", description: "Gentle pH-balanced rose water face wash with oat extract and glycerin. Removes makeup, SPF, and pollution without stripping the skin barrier. Lather-free, fragrance-light formula.", brand: "Dewkit", categoryId: cleansers.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: cleanser.id, size: "100ml", color: "Rose Pink", sku: "DK-CLEAN-100", price: 399, mrp: 699, stockQuantity: 80, images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&auto=format&fit=crop&q=60"] },
    { productId: cleanser.id, size: "200ml (Refill)", color: "Rose Pink", sku: "DK-CLEAN-200", price: 649, mrp: 999, stockQuantity: 55, images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 4: Dew Toner (Niacinamide) ──────────────────────
  const toner = await prisma.product.create({
    data: { name: "Dewkit Dew Toner", slug: "dewkit-dew-toner", description: "10% Niacinamide + 1% Zinc toner that minimizes pores, controls sebum, and fades pigmentation. Alcohol-free, safe for daily use morning and night.", brand: "Dewkit", categoryId: toners.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: toner.id, size: "150ml", color: "Clear Dew", sku: "DK-TONE-150", price: 499, mrp: 849, stockQuantity: 70, images: ["https://images.unsplash.com/photo-1601049541271-f6b2c7e8e17c?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 5: SPF 50 Sunscreen ──────────────────────────────
  const spf = await prisma.product.create({
    data: { name: "Dewkit Sun Shield SPF 50 PA++++", slug: "dewkit-sun-shield-spf50", description: "Lightweight mineral + chemical hybrid broad-spectrum SPF 50 PA++++ sunscreen. No white cast, water-resistant up to 80 minutes. India's best-rated daily SPF for Indian skin.", brand: "Dewkit", categoryId: sunscreen.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: spf.id, size: "50g", color: "Invisible Finish", sku: "DK-SPF-50G", price: 649, mrp: 1099, stockQuantity: 90, images: ["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=60"] },
    { productId: spf.id, size: "100g (Value Pack)", color: "Invisible Finish", sku: "DK-SPF-100G", price: 999, mrp: 1799, stockQuantity: 45, images: ["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 6: Rose Clay Face Mask ───────────────────────────
  const mask = await prisma.product.create({
    data: { name: "Dewkit Radiance Face Mask", slug: "dewkit-radiance-face-mask", description: "French rose clay + kaolin mask that deeply cleanses pores, draws out impurities, and leaves skin visibly brighter. Rose hip oil complex restores moisture post-masking. Use 2-3x per week.", brand: "Dewkit", categoryId: masks.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: mask.id, size: "75ml", color: "Rose Clay", sku: "DK-MASK-75", price: 549, mrp: 899, stockQuantity: 40, images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── Product 7: Eye Dew Cream ─────────────────────────────────
  const eyecream = await prisma.product.create({
    data: { name: "Dewkit Eye Dew Cream", slug: "dewkit-eye-dew-cream", description: "Under-eye brightening cream with caffeine, retinol 0.1%, and vitamin K. Reduces dark circles, puffiness, and fine lines. Gentle enough for the delicate eye area.", brand: "Dewkit", categoryId: eyecare.id, hsnCode: "33049900", gstRate: 18 },
  });
  await prisma.productVariant.createMany({ data: [
    { productId: eyecream.id, size: "15ml", color: "Pearlescent", sku: "DK-EYE-15", price: 799, mrp: 1299, stockQuantity: 35, images: ["https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60"] },
  ]});

  // ── ₹5 Razorpay Test ─────────────────────────────────────────
  const testProd = await prisma.product.create({
    data: { name: "Dewkit Test (₹5)", slug: "dewkit-razorpay-test", description: "₹5 test product to verify Razorpay payment integration. Use test card 4111 1111 1111 1111 or UPI success@razorpay.", brand: "Dewkit", categoryId: skincare.id, hsnCode: "99831300", gstRate: 18 },
  });
  await prisma.productVariant.create({ data: { productId: testProd.id, size: "Trial", color: "Rose Gold", sku: "DK-TEST-01", price: 5, mrp: 10, stockQuantity: 9999, images: ["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60"] } });

  console.log("✅ 8 products seeded (7 skincare + 1 test)");

  // ── Coupons ─────────────────────────────────────────────────
  await prisma.coupon.createMany({ data: [
    { code: "DEWGLOW10",  discountType: "PERCENT", value: 10, minOrder: 699,  expiry: new Date("2028-12-31") },
    { code: "DEWFLAT150", discountType: "FLAT",    value: 150, minOrder: 999, expiry: new Date("2028-12-31") },
    { code: "DEWFLAT300", discountType: "FLAT",    value: 300, minOrder: 1999,expiry: new Date("2028-12-31") },
    { code: "WELCOME10",  discountType: "PERCENT", value: 10, minOrder: 699,  expiry: new Date("2028-12-31") },
  ]});
  console.log("✅ Coupons: DEWGLOW10, DEWFLAT150, DEWFLAT300, WELCOME10");

  console.log("\n🌸 Dewkit database seeded!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin:   admin@dewkit.in     / admin123");
  console.log("  Shipper: shipper@dewkit.in   / shipper123");
  console.log("  Customer:priya@example.com   / customer123");
  console.log("  Coupons: DEWGLOW10 | DEWFLAT150 | DEWFLAT300");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch(e => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
