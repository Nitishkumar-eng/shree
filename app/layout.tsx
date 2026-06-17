import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Shree E-Commerce | Premium Indian Store",
  description: "Experience premium Indian e-commerce with swift deliveries and transparent GST calculations.",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased selection:bg-blue-600 selection:text-white bg-gradient-premium min-h-screen text-slate-100">
        <Providers>
          <div className="flex flex-col min-h-screen justify-between">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
