# 🛍️ Shree — Indian E-Commerce Platform

A production-ready full-stack e-commerce platform built for India.
Supports UPI, Card, Cash on Delivery via Razorpay, GST-compliant invoices, admin panel, Google OAuth, and real-time order tracking.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Nitishkumar-eng/shree)

---

## ✨ Features

- 🛒 **Full Shopping Flow** — Browse, cart, checkout, orders, wishlist
- 💳 **Multiple Payment Methods** — UPI, Card (3D flip UI), Cash on Delivery
- 🔐 **Auth** — Google OAuth + Email/Password via NextAuth
- 📦 **Admin Panel** — Add products, manage orders, coupons, analytics
- 🧾 **GST Invoices** — Auto-generated PDF invoices (CGST/SGST/IGST)
- 📍 **Pincode Serviceability** — Delivery check with shipping fee calculation
- 🎫 **Coupon Codes** — Percent & flat discount coupons
- 📱 **Razorpay** — Real UPI QR, card payments, COD
- ☁️ **Neon PostgreSQL** — Serverless cloud database
- 🖼️ **Cloudinary** — Product image uploads
- 📧 **Resend** — Order confirmation emails

---

## 🚀 Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Neon |
| ORM | Prisma v7 + pg adapter |
| Auth | NextAuth v4 |
| Payments | Razorpay |
| Styling | Tailwind CSS |
| Email | Resend |
| Images | Cloudinary |
| Deploy | Vercel |

---

## 🛠️ Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/Nitishkumar-eng/shree.git
cd shree
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in all values in `.env` (see `.env.example` for what's needed).

### 3. Set up database
```bash
npx prisma db push
npx ts-node --project tsconfig.seed.json prisma/seed.ts
```

### 4. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default credentials:**
- Admin: `admin@shree.com` / `admin123`
- Customer: `rahul@example.com` / `customer123`

---

## ☁️ Deploy to Vercel

### Step 1 — Import project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Nitishkumar-eng/shree` from GitHub
3. Framework: **Next.js** (auto-detected)

### Step 2 — Add environment variables
In the Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `NEXTAUTH_SECRET` | Random 32-char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your Vercel URL e.g. `https://shree.vercel.app` |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` |
| `SELLER_GSTIN` | Your GSTIN number |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `RESEND_API_KEY` | From Resend dashboard |

### Step 3 — Deploy
Click **Deploy**. Vercel runs `prisma generate && next build` automatically.

### Step 4 — Update Razorpay & Google OAuth callback URLs
After deploy, update:
- **Razorpay** dashboard → Webhook URL: `https://your-domain.vercel.app/api/webhook/razorpay`
- **Google Cloud Console** → Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`
- **`NEXTAUTH_URL`** env var in Vercel → set to your production URL

---

## 🧪 Test Payments (Razorpay Test Mode)

| Method | Test Credentials |
|---|---|
| Card | `4111 1111 1111 1111` · Exp: any future · CVV: any |
| UPI | `success@razorpay` |
| UPI Fail | `failure@razorpay` |

---

## 📁 Project Structure

```
shree/
├── app/
│   ├── (admin)/          # Admin panel pages
│   ├── (store)/          # Customer-facing pages
│   └── api/              # API routes
├── components/           # Reusable UI components
├── lib/                  # Utilities (db, auth, gst, razorpay...)
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
├── .env.example          # Environment variable template
└── vercel.json           # Vercel deployment config
```

---

## 🔒 Security

- `.env` is gitignored — secrets never committed
- HMAC signature verification on all Razorpay webhooks
- Admin routes protected by role-based middleware
- Security headers on all responses (XSS, clickjacking protection)

---

## 📄 License

MIT — free to use for personal and commercial projects.
