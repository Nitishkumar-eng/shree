import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { mockDbStore } from "@/lib/mockDbStore";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const minPrice = parseFloat(searchParams.get("min") || "0");
    const maxPrice = parseFloat(searchParams.get("max") || "999999");
    const brand = searchParams.get("brand") || "";
    const rating = parseFloat(searchParams.get("rating") || "0");
    const inStock = searchParams.get("inStock") === "true";
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build Prisma query filter
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Category Filter (supports children categories as well)
    if (category) {
      where.category = {
        OR: [
          { slug: category },
          { parent: { slug: category } }
        ]
      };
    }

    // Brand Filter
    if (brand) {
      where.brand = { equals: brand, mode: "insensitive" };
    }

    // Search Filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } }
      ];
    }

    // Variants Filter (Price range and Stock status)
    where.variants = {
      some: {
        price: { gte: minPrice, lte: maxPrice },
        ...(inStock ? { stockQuantity: { gt: 0 } } : {})
      }
    };

    // Rating Filter
    if (rating > 0) {
      where.reviews = {
        some: {},
      };
      // Note: In a real database, we'd store avgRating, or filter after query. 
      // For Prisma, we'll fetch products and can filter if needed, or query using average.
      // Let's implement average rating filtering post-query or as a nested select if possible.
      // We will perform a group check or keep the where criteria simple, and filter by reviews' average rating.
    }


    // Fetch products
    let products = await db.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
        reviews: {
          select: {
            rating: true,
          }
        }
      },
      orderBy: sortBy === "newest" ? { createdAt: "desc" } : undefined,
      // For price-asc/desc or rating, we'll handle sorting in memory if database sorting on nested models is complex
    });

    // Post-query processing (average rating calculation and rating filter, sorting)
    let processedProducts = products.map((product) => {
      const avgRating = product.reviews.length
        ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
        : 0;

      const lowestPrice = product.variants.length
        ? Math.min(...product.variants.map((v) => v.price))
        : 0;

      const highestPrice = product.variants.length
        ? Math.max(...product.variants.map((v) => v.price))
        : 0;

      const inStockQty = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

      return {
        ...product,
        avgRating,
        lowestPrice,
        highestPrice,
        inStock: inStockQty > 0,
      };
    });

    // Apply rating filter
    if (rating > 0) {
      processedProducts = processedProducts.filter(p => p.avgRating >= rating);
    }

    // Apply sorting in memory for accuracy (since prices are nested in variants)
    if (sortBy === "price-asc") {
      processedProducts.sort((a, b) => a.lowestPrice - b.lowestPrice);
    } else if (sortBy === "price-desc") {
      processedProducts.sort((a, b) => b.lowestPrice - a.lowestPrice);
    } else if (sortBy === "rating") {
      processedProducts.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sortBy === "popularity") {
      // Sort by reviews count as proxy
      processedProducts.sort((a, b) => b.reviews.length - a.reviews.length);
    }

    // Pagination in memory after filters
    const total = processedProducts.length;
    const paginatedProducts = processedProducts.slice(skip, skip + limit);

    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.warn("Fetch products database error, falling back to mock store:", error);
    
    const allMockProducts = mockDbStore.getProducts();

    const urlParams = new URL(req.url).searchParams;
    const search = urlParams.get("search") || "";
    const category = urlParams.get("category") || "";
    const minPrice = parseFloat(urlParams.get("min") || "0");
    const maxPrice = parseFloat(urlParams.get("max") || "999999");
    const brand = urlParams.get("brand") || "";
    const rating = parseFloat(urlParams.get("rating") || "0");
    const inStock = urlParams.get("inStock") === "true";
    const sortBy = urlParams.get("sortBy") || "newest";
    const page = parseInt(urlParams.get("page") || "1");
    const limit = parseInt(urlParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Filter in memory
    let filtered = allMockProducts.filter((p: any) => {
      if (!p.isActive) return false;

      // Category filter (supports matching category slug or categoryId)
      if (category) {
        const catMatch = p.category?.slug === category || p.category?.parentId === category;
        if (!catMatch && p.categoryId !== category) return false;
      }

      // Brand filter
      if (brand && p.brand.toLowerCase() !== brand.toLowerCase()) return false;

      // Search filter
      if (search) {
        const query = search.toLowerCase();
        const matches = p.name.toLowerCase().includes(query) || 
                        p.description.toLowerCase().includes(query) ||
                        p.brand.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Price and stock checks on variants
      const validVariants = p.variants.filter((v: any) => {
        const priceOk = v.price >= minPrice && v.price <= maxPrice;
        const stockOk = !inStock || v.stockQuantity > 0;
        return priceOk && stockOk;
      });
      if (validVariants.length === 0) return false;

      return true;
    });

    // Map necessary props
    let processed = filtered.map((p: any) => {
      const avgRating = p.reviews.length
        ? p.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / p.reviews.length
        : 4.5; // default high rating

      const lowestPrice = p.variants.length
        ? Math.min(...p.variants.map((v: any) => v.price))
        : 0;

      const highestPrice = p.variants.length
        ? Math.max(...p.variants.map((v: any) => v.price))
        : 0;

      const inStockQty = p.variants.reduce((acc: number, v: any) => acc + v.stockQuantity, 0);

      return {
        ...p,
        avgRating,
        lowestPrice,
        highestPrice,
        inStock: inStockQty > 0,
      };
    });

    // Apply rating filter
    if (rating > 0) {
      processed = processed.filter((p: any) => p.avgRating >= rating);
    }

    // Apply sorting
    if (sortBy === "price-asc") {
      processed.sort((a: any, b: any) => a.lowestPrice - b.lowestPrice);
    } else if (sortBy === "price-desc") {
      processed.sort((a: any, b: any) => b.lowestPrice - a.lowestPrice);
    } else if (sortBy === "rating") {
      processed.sort((a: any, b: any) => b.avgRating - a.avgRating);
    } else {
      // newest: sort by Date
      processed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = processed.length;
    const paginated = processed.slice(skip, skip + limit);

    return NextResponse.json({
      products: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }
}
