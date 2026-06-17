import React from "react";
import Navbar from "@/components/store/Navbar";
import Footer from "@/components/store/Footer";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-grow flex flex-col pt-4 pb-20 md:pb-8 container mx-auto px-4 md:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
