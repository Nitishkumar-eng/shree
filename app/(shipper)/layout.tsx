import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ShipperLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SHIPPER" && userRole !== "ADMIN")) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen" style={{ background: "#fdf2f8" }}>
      {/* Shipper Header */}
      <header style={{ background: "linear-gradient(135deg,#e11d48,#be185d)", color: "#fff", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🚚</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, fontFamily: "Georgia,serif" }}>Dewkit Shipping</h1>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.85 }}>Delivery Management Portal</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", opacity: 0.9 }}>Logged in as: {session.user?.name}</span>
          <a href="/api/auth/signout" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "8px 18px", borderRadius: "999px", textDecoration: "none", fontSize: "13px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>Sign Out</a>
        </div>
      </header>
      <main style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
