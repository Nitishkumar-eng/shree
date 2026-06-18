import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Dewkit — Skincare That Glows",
  description: "Dewkit premium skincare products — serums, moisturizers, SPF, and more. Crafted for radiant, healthy skin. Free delivery above ₹599.",
  keywords: "skincare, serum, moisturizer, sunscreen, face wash, Dewkit, glow, hydration",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    title: "Dewkit — Skincare That Glows",
    description: "Premium skincare products for radiant skin.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased selection:bg-rose-500 selection:text-white min-h-screen" style={{ background: '#fdf2f8' }}>
        <Providers>
          <div className="flex flex-col min-h-screen justify-between">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
