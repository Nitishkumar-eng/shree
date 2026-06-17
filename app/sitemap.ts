import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const staticRoutes = ["", "/products", "/cart", "/wishlist", "/orders"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    // Fetch dynamic active product details slugs for mapping
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const productRoutes = products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("Sitemap generation error, falling back to static routes:", error);
    return staticRoutes;
  }
}
