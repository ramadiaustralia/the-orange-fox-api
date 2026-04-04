import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

const PAGES = ["home", "about", "services", "process", "pricing", "contact", "faq"];

export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  if (badge === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const baseUrl = "https://the-orange-fox-web.vercel.app";
    const entries: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [];

    // Fetch SEO data for all pages to get canonical URLs
    for (const page of PAGES) {
      try {
        // Use internal API route to get SEO data
        const seoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/seo?page=${page}`;
        const res = await fetch(seoUrl, { cache: "no-store" });
        const json = await res.json();

        const slug = page === "home" ? "" : page;
        const canonicalUrl = json.data?.canonical_url || `${baseUrl}/${slug}`;
        const updatedAt = json.data?.updated_at || new Date().toISOString();

        let priority = "0.8";
        let changefreq = "weekly";
        if (page === "home") {
          priority = "1.0";
          changefreq = "daily";
        } else if (page === "contact" || page === "pricing") {
          priority = "0.9";
          changefreq = "weekly";
        } else if (page === "faq") {
          priority = "0.6";
          changefreq = "monthly";
        }

        entries.push({
          loc: canonicalUrl,
          lastmod: updatedAt.split("T")[0],
          priority,
          changefreq,
        });
      } catch {
        // Fallback entry
        const slug = page === "home" ? "" : page;
        entries.push({
          loc: `${baseUrl}/${slug}`,
          lastmod: new Date().toISOString().split("T")[0],
          priority: "0.8",
          changefreq: "weekly",
        });
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate sitemap" }, { status: 500 });
  }
}
