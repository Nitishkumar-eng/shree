import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductDetailClient from "@/components/store/ProductDetailClient";
import { Metadata } from "next";
import { mockDbStore } from "@/lib/mockDbStore";

interface Props {
  params: {
    slug: string;
  };
}

// Dynamic SEO metadata per product page (Requirement)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    let product;
    try {
      product = await db.product.findUnique({
        where: { slug: params.slug },
        include: {
          variants: true,
        },
      });
    } catch {
      product = mockDbStore.getProductBySlug(params.slug);
    }

    if (!product) return {};

    const image = product.variants.length && product.variants[0].images.length
      ? product.variants[0].images[0]
      : "";

    return {
      title: `${product.name} | Shree Premium`,
      description: product.description.slice(0, 155) + "...",
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 155),
        images: image ? [{ url: image }] : [],
      },
    };
  } catch {
    return {
      title: "Premium Product | Shree E-Commerce",
    };
  }
}

async function getProductData(slug: string) {
  try {
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" },
        }
      }
    });

    if (!product) return null;

    // Fetch related products in the same category
    const related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        NOT: { id: product.id },
        isActive: true,
      },
      include: {
        variants: true,
      },
      take: 4,
    });

    return { product, related };
  } catch (error) {
    console.warn(`Product data load failed for slug ${slug}, falling back to mock store:`, error);
    const product = mockDbStore.getProductBySlug(slug);

    if (!product) return null;

    // Fetch related products in the same category
    const allMockProducts = mockDbStore.getProducts();
    const related = allMockProducts
      .filter((p: any) => p.categoryId === product.categoryId && p.id !== product.id && p.isActive)
      .slice(0, 4);

    return { product: product as any, related: related as any };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const data = await getProductData(params.slug);

  if (!data) {
    notFound();
  }

  // Schema markup (JSON-LD) for rich snippet (SEO requirement)
  const lowestPrice = data.product.variants.length
    ? Math.min(...data.product.variants.map((v: any) => v.price))
    : 0;

  const highestPrice = data.product.variants.length
    ? Math.max(...data.product.variants.map((v: any) => v.price))
    : 0;

  const firstImage = data.product.variants.length && data.product.variants[0].images.length
    ? data.product.variants[0].images[0]
    : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.product.name,
    image: firstImage,
    description: data.product.description,
    brand: {
      "@type": "Brand",
      name: data.product.brand,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: data.product.variants.length,
      priceInclusive: true,
    },
  };

  return (
    <>
      {/* Inject JSON-LD Rich Snippet for Google Search index */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <ProductDetailClient product={data.product} related={data.related} />
    </>
  );
}
